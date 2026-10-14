import { generateJson, Schema } from "./ai";

/**
 * Packaged products: nutrition per 100 g (or ml) and the label's serving. They come from the person's own saved
 * products (`forma.products`, by barcode), from Open Food Facts (open database, many Brazilian products), or
 * from a photo of the nutrition table read by the AI.
 */
export type Product = {
  /** EAN/UPC; missing when the product was read from a photo without scanning. */
  barcode?: string | undefined;
  name: string;
  brand?: string | undefined;
  /** Per 100 g (or 100 ml). */
  kcal: number;
  p: number;
  c: number;
  f: number;
  fiber?: number | undefined;
  sugar?: number | undefined;
  /** mg per 100 g. */
  sodium?: number | undefined;
  /** Label serving in grams (or ml) and its description, e.g. "1 unidade (30 g)". */
  servingGrams?: number | undefined;
  servingLabel?: string | undefined;
  source: "Open Food Facts" | "Foto do rótulo" | "Meus produtos";
  savedAt?: number | undefined;
};

export const PRODUCTS_KEY = "forma.products";

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN);
const round1 = (n: number) => Math.round(n * 10) / 10;
const opt = (v: unknown, k = 1) => (Number.isFinite(num(v)) ? round1(num(v) * k) : undefined);

/** Looks the barcode up in Open Food Facts; null when unknown there or without usable nutrition data. */
export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const fields = "product_name,product_name_pt,brands,nutriments,serving_size,serving_quantity";
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Não foi possível consultar o código agora. Tente de novo ou fotografe a tabela.");
  const data = (await res.json()) as { status?: number; product?: Record<string, unknown> };
  const p = data.product;
  if (data.status !== 1 || !p) return null;
  const n = (p["nutriments"] ?? {}) as Record<string, unknown>;
  const kcal = num(n["energy-kcal_100g"]) || num(n["energy_100g"]) / 4.184;
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);
  if (![kcal, protein, carbs, fat].every(Number.isFinite)) return null;
  const serving = num(p["serving_quantity"]);
  return {
    barcode,
    name: String(p["product_name_pt"] || p["product_name"] || "Produto sem nome"),
    brand: typeof p["brands"] === "string" ? p["brands"].split(",")[0]!.trim() : undefined,
    kcal: Math.round(kcal),
    p: round1(protein),
    c: round1(carbs),
    f: round1(fat),
    fiber: opt(n["fiber_100g"]),
    sugar: opt(n["sugars_100g"]),
    // Open Food Facts stores sodium in grams.
    sodium: opt(n["sodium_100g"], 1000),
    servingGrams: Number.isFinite(serving) && serving > 0 ? Math.round(serving) : undefined,
    servingLabel: typeof p["serving_size"] === "string" ? p["serving_size"] : undefined,
    source: "Open Food Facts",
  };
}

const LABEL_SYSTEM = `Você lê tabelas nutricionais de rótulos brasileiros (RDC 429/2020 e o modelo antigo).
Extraia os valores exatamente como impressos. Se a tabela tiver coluna "100 g" (ou 100 ml), use-a.
Se só tiver a porção, converta para 100 g dividindo pela porção em gramas e multiplicando por 100.
Retorne: nome do produto se aparecer na foto (senão vazio), porção em gramas e o texto da porção (ex.: "1 unidade (30 g)"),
e por 100 g: kcal, proteínas, carboidratos, gorduras totais, fibras, açúcares totais (g) e sódio (mg).
Use 0 quando o valor aparecer como zero e -1 quando não aparecer. Se a imagem não for uma tabela nutricional, devolva ok = false.`;

const LABEL_SCHEMA = Schema.object({
  properties: {
    ok: Schema.boolean(),
    name: Schema.string(),
    servingGrams: Schema.number(),
    servingLabel: Schema.string(),
    kcal: Schema.number(),
    p: Schema.number(),
    c: Schema.number(),
    f: Schema.number(),
    fiber: Schema.number(),
    sugar: Schema.number(),
    sodium: Schema.number(),
  },
});

/** Shrinks the photo (labels stay readable at ~1600 px) so the request is small and fast. */
/** A photo shrunk to 1600 px and encoded as base64 JPEG, ready to send to the AI. */
export async function photoData(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1]!;
}

/** Reads a photo of a nutrition table with the AI. */
export async function readLabel(file: File, barcode?: string): Promise<Product> {
  const data = await photoData(file);
  const r = (await generateJson(LABEL_SYSTEM, LABEL_SCHEMA, [
    { inlineData: { mimeType: "image/jpeg", data } },
    { text: "Leia esta tabela nutricional." },
  ], { timeoutMs: 45_000 })) as Record<string, unknown>;
  const v = (k: string) => (Number.isFinite(num(r[k])) && num(r[k]) >= 0 ? round1(num(r[k])) : undefined);
  if (r["ok"] === false || v("kcal") === undefined) throw new Error("Não consegui ler a tabela. Tire a foto de frente, com boa luz e a tabela inteira.");
  return {
    barcode,
    name: String(r["name"] || "").trim() || "Produto do rótulo",
    kcal: Math.round(v("kcal")!),
    p: v("p") ?? 0,
    c: v("c") ?? 0,
    f: v("f") ?? 0,
    fiber: v("fiber"),
    sugar: v("sugar"),
    sodium: v("sodium"),
    servingGrams: v("servingGrams") ? Math.round(v("servingGrams")!) : undefined,
    servingLabel: String(r["servingLabel"] || "").trim() || undefined,
    source: "Foto do rótulo",
  };
}
