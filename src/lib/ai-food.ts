import { generateJson, Schema } from "./ai";
import { photoData } from "./products";

export type EstimatedFood = { name: string; grams: number; kcal: number; p: number; c: number; f: number; fiber: number };

const SYSTEM = `Você é um nutricionista brasileiro. Estime as porções e os macronutrientes dos alimentos descritos.
Use a tabela TACO (Unicamp) como referência e valores de alimentos já preparados (cozido, grelhado, assado) quando for o caso.
Medidas caseiras típicas: concha de feijão ≈ 80 g, colher de servir de arroz ≈ 45 g, filé de frango ≈ 120 g, pão francês = 50 g, ovo = 50 g.
Se a quantidade não for dita, assuma uma porção típica de um adulto.
Retorne um item por alimento, com o nome em português, gramas e os valores TOTAIS do item (não por 100 g), arredondados a 1 casa.
fiber é a fibra alimentar do item em gramas (0 para carnes, ovos, laticínios e óleos).`;

const SCHEMA = Schema.object({
  properties: {
    items: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string(),
          grams: Schema.number(),
          kcal: Schema.number(),
          p: Schema.number(),
          c: Schema.number(),
          f: Schema.number(),
          fiber: Schema.number(),
        },
      }),
    }),
  },
});

const PHOTO_SYSTEM = `${SYSTEM}
Você recebe a FOTO de um prato ou refeição. Identifique cada alimento visível e estime a porção em gramas pelo tamanho
no prato (um prato raso tem ~25 cm; use talheres e copos como escala). Prefira preparos brasileiros comuns.
Se a foto não mostrar comida, devolva a lista vazia.`;

/** Estimates portions and macros of a free-text meal description. */
export async function estimateFood(text: string): Promise<EstimatedFood[]> {
  return parse(await generateJson(SYSTEM, SCHEMA, text));
}

/** Estimates the foods in a photo of a plate; `hint` is optional text ("arroz integral, frango sem pele"). */
export async function estimatePlate(file: File, hint: string): Promise<EstimatedFood[]> {
  const data = await photoData(file);
  return parse(await generateJson(PHOTO_SYSTEM, SCHEMA, [
    { inlineData: { mimeType: "image/jpeg", data } },
    { text: hint.trim() ? `Estime os alimentos da foto. Observação de quem comeu: ${hint.trim()}` : "Estime os alimentos da foto." },
  ], { timeoutMs: 45_000 }));
}

function parse(result: unknown): EstimatedFood[] {
  const items = (result as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
  return items.map((i: Record<string, unknown>) => ({
    name: String(i["name"] ?? "Alimento"),
    grams: Math.round(num(i["grams"])),
    kcal: Math.round(num(i["kcal"])),
    p: Math.round(num(i["p"]) * 10) / 10,
    c: Math.round(num(i["c"]) * 10) / 10,
    f: Math.round(num(i["f"]) * 10) / 10,
    fiber: Math.round(num(i["fiber"]) * 10) / 10,
  }));
}
