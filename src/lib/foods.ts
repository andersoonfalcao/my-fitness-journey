import { TACO } from "./taco-data";

// Values per 100 g.
export type Food = {
  id: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fiber?: number;
  unit?: { label: string; g: number };
  source: "TACO" | "USDA" | "Rótulo";
  /** TACO category index; prepared foods rank above raw ones when the category is cooked before eating. */
  category?: number;
};

const fromTaco: Food[] = TACO.map(([id, name, category, kcal, p, c, f, fiber, label, g]) => ({
  id: `taco-${id}`,
  name,
  kcal,
  p,
  c,
  f,
  fiber,
  category,
  source: "TACO",
  ...(label && g ? { unit: { label, g } } : {}),
}));

// Common foods TACO lacks (or lists without values). USDA FoodData Central where available, otherwise an average label.
const SUPPLEMENTS: Food[] = [
  { id: "usda-leite-integral", name: "Leite, de vaca, integral", kcal: 61, p: 3.2, c: 4.8, f: 3.3, source: "USDA", unit: { label: "copo 200 ml", g: 200 } },
  { id: "usda-leite-desnatado", name: "Leite, de vaca, desnatado", kcal: 34, p: 3.4, c: 5, f: 0.1, source: "USDA", unit: { label: "copo 200 ml", g: 200 } },
  { id: "usda-macarrao-cozido", name: "Macarrão, trigo, cozido", kcal: 158, p: 5.8, c: 30.9, f: 0.9, source: "USDA", unit: { label: "pegador", g: 110 } },
  { id: "usda-tilapia", name: "Tilápia, filé, grelhado", kcal: 128, p: 26.2, c: 0, f: 2.7, source: "USDA", unit: { label: "filé", g: 120 } },
  { id: "usda-atum-agua", name: "Atum, conserva em água, drenado", kcal: 116, p: 25.5, c: 0, f: 0.8, source: "USDA", unit: { label: "lata drenada", g: 120 } },
  { id: "usda-pasta-amendoim", name: "Pasta de amendoim, integral", kcal: 588, p: 25.1, c: 19.6, f: 50.4, source: "USDA", unit: { label: "colher de sopa", g: 15 } },
  { id: "usda-pizza-mucarela", name: "Pizza, muçarela", kcal: 266, p: 11.4, c: 33.3, f: 9.7, source: "USDA", unit: { label: "fatia", g: 110 } },
  { id: "rotulo-whey", name: "Whey protein, concentrado", kcal: 400, p: 78, c: 8, f: 6, source: "Rótulo", unit: { label: "scoop", g: 30 } },
  { id: "rotulo-iogurte-grego-zero", name: "Iogurte, grego, natural, zero", kcal: 55, p: 9, c: 4, f: 0.2, source: "Rótulo", unit: { label: "pote", g: 100 } },
  { id: "rotulo-granola", name: "Granola", kcal: 420, p: 10, c: 64, f: 14, source: "Rótulo", unit: { label: "colher de sopa", g: 12 } },
  { id: "rotulo-goma-tapioca", name: "Tapioca, goma hidratada", kcal: 240, p: 0, c: 60, f: 0, source: "Rótulo", unit: { label: "tapioca média", g: 60 } },
];

export const FOODS: Food[] = [...fromTaco, ...SUPPLEMENTS];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const SEARCH = FOODS.map((food) => ({ food, text: norm(food.name) }));

// Categories usually eaten cooked (cereals, fish, meat, eggs, legumes): raw entries go to the end unless asked for.
const COOKED_CATEGORIES = new Set([0, 4, 5, 8, 13]);
const isRaw = (text: string) => /\b(cru|crua|crus|cruas)\b/.test(text);
const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "com", "e", "em", "no", "na"]);

/** Everyday foods shown before typing. */
const SUGGESTED = ["taco-3", "taco-561", "taco-410", "taco-488", "taco-53", "taco-182", "taco-7", "usda-leite-integral"];

export function searchFoods(q: string) {
  // Dropping the last letter of longer words lets "moida" find "moído" and "ovos" find "ovo".
  const words = norm(q)
    .split(/[\s,]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => (w.length >= 4 ? w.slice(0, -1) : w));
  if (words.length === 0) return SUGGESTED.map((id) => FOODS.find((f) => f.id === id)!).filter(Boolean);
  const wantsRaw = words.some((w) => w.startsWith("cru"));
  return SEARCH.filter(({ text }) => words.every((w) => text.includes(w)))
    .map(({ food, text }) => ({
      food,
      rank:
        (text.startsWith(words[0]!) ? 0 : 2) +
        (!wantsRaw && food.category !== undefined && COOKED_CATEGORIES.has(food.category) && isRaw(text) ? 1.5 : 0) +
        (food.unit ? 0 : 0.5),
      length: text.length,
    }))
    .sort((a, b) => a.rank - b.rank || a.length - b.length)
    .slice(0, 20)
    .map(({ food }) => food);
}
