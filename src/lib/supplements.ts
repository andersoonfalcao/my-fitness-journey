/**
 * Supplements: a dose (amount + unit) and the macros of that dose. The ones taken every day form the routine
 * (`forma.supplements`); taking one writes a food entry in the "suplementos" meal, so whey or a mass gainer
 * count in the day's calories and protein, and the entry's `suppId` tells which routine item was taken.
 */
export type Supplement = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
};

export const SUPPLEMENTS_KEY = "forma.supplements";

export const UNITS = ["g", "ml", "dose(s)", "cápsula(s)", "comprimido(s)", "gota(s)", "scoop(s)"];

export const doseLabel = (s: Pick<Supplement, "amount" | "unit">) => `${s.amount.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${s.unit}`;

/** Typical label values per dose; the person can adjust any of them before saving. */
export const PRESETS: Omit<Supplement, "id">[] = [
  { name: "Whey protein concentrado", amount: 30, unit: "g", kcal: 120, p: 24, c: 3, f: 1.5 },
  { name: "Whey protein isolado", amount: 30, unit: "g", kcal: 110, p: 27, c: 1, f: 0.5 },
  { name: "Creatina", amount: 5, unit: "g", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Albumina", amount: 30, unit: "g", kcal: 108, p: 24, c: 2, f: 0 },
  { name: "Caseína", amount: 30, unit: "g", kcal: 110, p: 24, c: 3, f: 1 },
  { name: "Colágeno hidrolisado", amount: 10, unit: "g", kcal: 36, p: 9, c: 0, f: 0 },
  { name: "Hipercalórico", amount: 100, unit: "g", kcal: 380, p: 20, c: 70, f: 3 },
  { name: "Maltodextrina", amount: 30, unit: "g", kcal: 114, p: 0, c: 28.5, f: 0 },
  { name: "Dextrose", amount: 30, unit: "g", kcal: 114, p: 0, c: 28.5, f: 0 },
  { name: "Pré-treino", amount: 1, unit: "dose(s)", kcal: 10, p: 0, c: 2, f: 0 },
  { name: "BCAA", amount: 5, unit: "g", kcal: 20, p: 5, c: 0, f: 0 },
  { name: "Glutamina", amount: 5, unit: "g", kcal: 20, p: 5, c: 0, f: 0 },
  { name: "Beta-alanina", amount: 3, unit: "g", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Cafeína", amount: 1, unit: "cápsula(s)", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Multivitamínico", amount: 1, unit: "cápsula(s)", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Ômega 3", amount: 1, unit: "cápsula(s)", kcal: 9, p: 0, c: 0, f: 1 },
  { name: "Vitamina D", amount: 1, unit: "cápsula(s)", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Vitamina C", amount: 1, unit: "comprimido(s)", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Magnésio", amount: 1, unit: "cápsula(s)", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Zinco", amount: 1, unit: "cápsula(s)", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Ferro", amount: 1, unit: "comprimido(s)", kcal: 0, p: 0, c: 0, f: 0 },
  { name: "Melatonina", amount: 1, unit: "comprimido(s)", kcal: 0, p: 0, c: 0, f: 0 },
];
