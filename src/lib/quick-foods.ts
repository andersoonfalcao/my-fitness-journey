import { FOODS, type Food } from "./foods";
import type { FoodEntry, MealType } from "./store";

/** A meal saved to log again with one tap ("Almoço padrão"); items keep their own grams and macros. */
export type FavMeal = { id: string; name: string; meal: MealType; items: FavItem[] };
export type FavItem = Pick<FoodEntry, "name" | "grams" | "kcal" | "p" | "c" | "f">;
export const FAV_MEALS_KEY = "forma.favmeals";

export const asItem = (f: FoodEntry): FavItem => ({ name: f.name, grams: f.grams, kcal: f.kcal, p: f.p, c: f.c, f: f.f });
export const itemsKcal = (items: FavItem[]) => Math.round(items.reduce((s, i) => s + i.kcal, 0));

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Foods the person logs most (supplements apart), each with the grams used last time. A food of the library comes
 * back as itself; one from the AI or a product label becomes a "per 100 g" food from its last entry.
 */
export function frequentFoods(entries: FoodEntry[], limit = 8): { food: Food; grams: number; count: number }[] {
  const byName = new Map<string, { count: number; last: FoodEntry }>();
  for (const e of entries) {
    if (e.meal === "suplementos" || !(e.grams > 0)) continue;
    const seen = byName.get(e.name);
    if (!seen) byName.set(e.name, { count: 1, last: e });
    else {
      seen.count++;
      if (e.date >= seen.last.date) seen.last = e;
    }
  }
  return [...byName.values()]
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.last.date.localeCompare(a.last.date))
    .slice(0, limit)
    .map(({ count, last }) => {
      const known = FOODS.find((f) => f.name === last.name);
      const k = 100 / last.grams;
      const food: Food = known ?? { id: `registro-${last.name}`, name: last.name, kcal: Math.round(last.kcal * k), p: r1(last.p * k), c: r1(last.c * k), f: r1(last.f * k), source: "Registro" };
      return { food, grams: last.grams, count };
    });
}
