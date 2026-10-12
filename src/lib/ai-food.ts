import { generateJson, Schema } from "./ai";

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

/** Estimates portions and macros of a free-text meal description. */
export async function estimateFood(text: string): Promise<EstimatedFood[]> {
  const items = ((await generateJson(SYSTEM, SCHEMA, text)) as { items?: unknown }).items;
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
