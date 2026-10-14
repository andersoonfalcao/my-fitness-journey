import type { FavItem } from "./quick-foods";

/**
 * A home recipe: its ingredients (raw, as weighed) and what the pot weighs once cooked. A portion is logged by
 * cooked weight, so 300 g of a 1.2 kg lasagna takes a quarter of every ingredient.
 */
export type Recipe = { id: string; name: string; items: FavItem[]; cookedGrams: number; portions: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function recipeTotals(items: FavItem[]) {
  const sum = items.reduce((a, i) => ({ grams: a.grams + i.grams, kcal: a.kcal + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, fiber: a.fiber + (i.fiber ?? 0) }), { grams: 0, kcal: 0, p: 0, c: 0, f: 0, fiber: 0 });
  return { ...sum, hasFiber: items.some((i) => i.fiber !== undefined) };
}

/** The entry for `grams` of the cooked recipe. */
export function recipePortion(recipe: Recipe, grams: number): FavItem {
  const total = recipeTotals(recipe.items);
  const k = recipe.cookedGrams > 0 ? grams / recipe.cookedGrams : 0;
  return {
    name: recipe.name, grams: Math.round(grams), kcal: Math.round(total.kcal * k), p: r1(total.p * k), c: r1(total.c * k), f: r1(total.f * k),
    ...(total.hasFiber ? { fiber: r1(total.fiber * k) } : {}),
  };
}

/** Grams of one portion (cooked weight split by the portions it yields). */
export const portionGrams = (recipe: Recipe) => Math.round(recipe.cookedGrams / Math.max(1, recipe.portions));
