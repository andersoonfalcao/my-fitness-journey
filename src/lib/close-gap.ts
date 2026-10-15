import { frequentFoods, type FavItem, type FavMeal } from "./quick-foods";
import { portionGrams, recipePortion, type Recipe } from "./recipes";
import type { FoodEntry, MealType } from "./store";

/**
 * "Para fechar o dia" (Alimentação): what is left of the day's protein and calories, and up to three things the person
 * already eats that get close to it. Candidates are the favorite meals, one portion of each recipe and the most logged
 * foods at their usual grams; nothing goes past the calories left (10% of slack), and protein weighs more than
 * calories because it is the goal that is usually short. Plain arithmetic, no AI.
 */
export type GapOption = { id: string; name: string; detail: string; items: FavItem[]; meal: MealType; p: number; kcal: number };
export type Gap = { protein: number; kcal: number; options: GapOption[]; pair: { p: number; kcal: number } | null };

/** Below this, the day counts as closed and the card stays hidden. */
const MIN_KCAL = 150;
const MIN_PROTEIN = 10;
const SLACK = 1.1;

/** The meal a suggestion goes to by the hour (a favorite keeps its own). */
export function mealByHour(hour: number): MealType {
  return hour < 10 ? "cafe" : hour < 15 ? "almoco" : hour < 18 ? "lanche" : "jantar";
}

const sum = (items: FavItem[]) => items.reduce((a, i) => ({ p: a.p + i.p, kcal: a.kcal + i.kcal }), { p: 0, kcal: 0 });
const r = Math.round;

export function closeGap({ left, favs, recipes, history, hour }: {
  /** Target minus what was eaten and what is planned for the day. */
  left: { protein: number; kcal: number };
  favs: FavMeal[]; recipes: Recipe[]; history: FoodEntry[]; hour: number;
}): Gap | null {
  const protein = r(left.protein);
  const kcal = r(left.kcal);
  if (kcal < MIN_KCAL && protein < MIN_PROTEIN) return null;
  if (kcal < MIN_KCAL) return null;
  const meal = mealByHour(hour);
  const candidates: GapOption[] = [
    ...favs.filter((f) => f.meal !== "suplementos" && f.items.length).map((f) => ({ id: `fav-${f.id}`, name: f.name, detail: f.items.map((i) => i.name).slice(0, 3).join(", "), items: f.items, meal: f.meal, ...sum(f.items) })),
    ...recipes.filter((rc) => rc.cookedGrams > 0).map((rc) => {
      const item = recipePortion(rc, portionGrams(rc));
      return { id: `rec-${rc.id}`, name: rc.name, detail: `1 porção, ${item.grams} g`, items: [item], meal, p: item.p, kcal: item.kcal };
    }),
    ...frequentFoods(history, 12).map(({ food, grams }) => {
      const k = grams / 100;
      const item: FavItem = { name: food.name, grams, kcal: r(food.kcal * k), p: r(food.p * k * 10) / 10, c: r(food.c * k * 10) / 10, f: r(food.f * k * 10) / 10, ...(food.fiber !== undefined ? { fiber: r(food.fiber * k * 10) / 10 } : {}) };
      return { id: `food-${food.id}`, name: food.name, detail: `${grams} g, como da última vez`, items: [item], meal, p: item.p, kcal: item.kcal };
    }),
  ].filter((o) => o.kcal > 0 && o.kcal <= kcal * SLACK);

  const needProtein = protein >= MIN_PROTEIN;
  const score = (o: GapOption) => {
    const fill = Math.min(o.kcal, kcal) / kcal;
    if (!needProtein) return fill;
    const proteinFill = Math.min(o.p, protein) / protein;
    // Protein per 100 kcal breaks ties toward the leaner choice.
    return proteinFill * 0.6 + fill * 0.25 + Math.min(1, o.p / Math.max(1, o.kcal) / 0.1) * 0.15;
  };
  const seen = new Set<string>();
  const options = candidates
    .sort((a, b) => score(b) - score(a))
    .filter((o) => (seen.has(o.name) ? false : (seen.add(o.name), true)))
    .slice(0, 3);
  if (!options.length) return null;
  const [a, b] = options;
  const pair = a && b && a.kcal + b.kcal <= kcal * SLACK ? { p: r(a.p + b.p), kcal: r(a.kcal + b.kcal) } : null;
  return { protein, kcal, options, pair };
}
