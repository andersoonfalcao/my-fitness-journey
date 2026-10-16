import { FAST_MODELS, BEST_MODELS, generateJson, Schema } from "./ai";
import { frequentFoods, type FavItem, type FavMeal } from "./quick-foods";
import type { FoodEntry, MealType } from "./store";

/**
 * "Finalizar o dia com IA" (Calendário): what is missing on a day (meals not logged, calories and macros under the
 * target) and what to log to complete it. The AI picks from the foods the person already logs and only says the
 * grams; macros are worked out here from those foods' values per 100 g, so the numbers never come from the AI.
 * A food outside that list may come with the AI's own values and is shown as "estimado".
 */
export const MAIN_MEALS: { meal: Exclude<MealType, "suplementos">; label: string }[] = [
  { meal: "cafe", label: "Café da manhã" },
  { meal: "almoco", label: "Almoço" },
  { meal: "lanche", label: "Lanche" },
  { meal: "jantar", label: "Jantar" },
];

export type FinishItem = FavItem & { key: string; meal: MealType; estimated: boolean };
export type FinishPlan = { items: FinishItem[]; note: string; missingMeals: MealType[]; left: { kcal: number; protein: number; carbs: number; fat: number } };

type Goal = { kcal: number; protein: number; carbs: number; fat: number };

const SYSTEM = `Você é um nutricionista brasileiro ajudando um aluno a completar o registro de um dia num app de alimentação.
Você recebe o que já foi registrado no dia, as refeições que faltam, quanto falta para as metas e a lista de alimentos que o aluno costuma comer (com o id, a porção de costume e em quais refeições ele costuma comer cada um).
Sugira o que registrar para completar o dia:
- Para cada refeição que falta, monte uma refeição parecida com o que ele costuma comer nela, escolhendo alimentos da lista (use o campo id). Só use id = -1 (alimento fora da lista) quando a lista não tiver nada que sirva, e então informe os valores por 100 g pela tabela TACO.
- Some, com o que já foi comido, perto da meta de calorias (até 10% acima ou abaixo) e priorize alcançar a proteína.
- Se não faltar nenhuma refeição mas as calorias ou a proteína estiverem abaixo da meta, sugira 1 a 3 itens para completar, na refeição que fizer mais sentido.
- Se não faltar nada, devolva a lista vazia.
- grams = porção em gramas (número inteiro, use a porção de costume quando fizer sentido).
- note: 1 ou 2 frases em português do Brasil explicando a sugestão, sem inventar números.`;

const SCHEMA = Schema.object({
  properties: {
    items: Schema.array({
      items: Schema.object({
        properties: {
          meal: Schema.enumString({ enum: ["cafe", "almoco", "lanche", "jantar"] }),
          id: Schema.integer(),
          name: Schema.string(),
          grams: Schema.number(),
          kcal100: Schema.number(),
          p100: Schema.number(),
          c100: Schema.number(),
          f100: Schema.number(),
        },
      }),
    }),
    note: Schema.string(),
  },
});

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Meals the day still lacks (supplements don't count as a meal). */
export const missingMealsOf = (eaten: FoodEntry[]) => MAIN_MEALS.filter(({ meal }) => !eaten.some((f) => f.meal === meal)).map((m) => m.meal);

/** What is left to the day's targets (never negative). */
export function leftOf(eaten: FoodEntry[], goal: Goal) {
  const sum = eaten.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  return {
    kcal: Math.max(0, Math.round(goal.kcal - sum.kcal)),
    protein: Math.max(0, Math.round(goal.protein - sum.p)),
    carbs: Math.max(0, Math.round(goal.carbs - sum.c)),
    fat: Math.max(0, Math.round(goal.fat - sum.f)),
  };
}

/** Nothing to suggest: every meal logged and calories and protein within reach of the target. */
export const dayComplete = (eaten: FoodEntry[], goal: Goal) => {
  const left = leftOf(eaten, goal);
  return missingMealsOf(eaten).length === 0 && left.kcal <= goal.kcal * 0.1 && left.protein <= Math.max(10, goal.protein * 0.1);
};

/** Recomputes an item for new grams from its own values per gram. */
export function regram(item: FinishItem, grams: number): FinishItem {
  const k = item.grams > 0 ? grams / item.grams : 0;
  return { ...item, grams, kcal: Math.round(item.kcal * k), p: r1(item.p * k), c: r1(item.c * k), f: r1(item.f * k), ...(item.fiber !== undefined ? { fiber: r1(item.fiber * k) } : {}) };
}

export async function planDayFinish({ date, eaten, goal, recent, favs }: {
  date: string;
  /** Everything logged on the day. */
  eaten: FoodEntry[];
  goal: Goal;
  /** Food log of the last weeks, for the foods the person usually eats. */
  recent: FoodEntry[];
  favs: FavMeal[];
}): Promise<FinishPlan> {
  const missingMeals = missingMealsOf(eaten);
  const left = leftOf(eaten, goal);
  if (dayComplete(eaten, goal)) return { items: [], note: "", missingMeals, left };

  const usual = frequentFoods(recent.filter((f) => f.date !== date), 40);
  const mealsOf = (name: string) => [...new Set(recent.filter((f) => f.name === name && f.meal !== "suplementos").map((f) => f.meal))];
  const candidates = usual.map(({ food, grams }, id) => ({
    id, nome: food.name, porcaoG: grams, refeicoes: mealsOf(food.name),
    por100g: { kcal: food.kcal, proteina: food.p, carbo: food.c, gordura: food.f },
  }));
  const label = (m: MealType) => MAIN_MEALS.find((x) => x.meal === m)?.label ?? m;
  const prompt = JSON.stringify({
    dia: new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
    metas: { kcal: goal.kcal, proteinaG: goal.protein, carboG: goal.carbs, gorduraG: goal.fat },
    jaRegistrado: MAIN_MEALS.map(({ meal }) => ({
      refeicao: label(meal),
      itens: eaten.filter((f) => f.meal === meal).map((f) => `${f.name} (${f.grams} g, ${Math.round(f.kcal)} kcal)`),
    })),
    refeicoesQueFaltam: missingMeals.map((m) => ({ codigo: m, nome: label(m) })),
    faltaParaAMeta: { kcal: left.kcal, proteinaG: left.protein, carboG: left.carbs, gorduraG: left.fat },
    alimentosDeCostume: candidates,
    refeicoesFavoritas: favs.filter((f) => f.meal !== "suplementos").map((f) => ({ refeicao: label(f.meal), nome: f.name, itens: f.items.map((i) => `${i.name} ${i.grams} g`) })),
  });

  const raw = (await generateJson(SYSTEM, SCHEMA, prompt, { models: [...new Set([...FAST_MODELS, ...BEST_MODELS])], timeoutMs: 30_000 })) as {
    items?: { meal?: string; id?: number; name?: string; grams?: number; kcal100?: number; p100?: number; c100?: number; f100?: number }[];
    note?: string;
  };
  const items: FinishItem[] = [];
  for (const [n, it] of (raw.items ?? []).entries()) {
    const meal = MAIN_MEALS.find((m) => m.meal === it.meal)?.meal;
    const grams = Math.round(Number(it.grams));
    if (!meal || !Number.isFinite(grams) || grams < 1 || grams > 1500) continue;
    const known = typeof it.id === "number" && it.id >= 0 ? usual[it.id]?.food : undefined;
    const per100 = known
      ? { name: known.name, kcal: known.kcal, p: known.p, c: known.c, f: known.f, fiber: known.fiber }
      : { name: String(it.name ?? "").trim(), kcal: Number(it.kcal100), p: Number(it.p100), c: Number(it.c100), f: Number(it.f100), fiber: undefined };
    if (!per100.name || ![per100.kcal, per100.p, per100.c, per100.f].every((v) => Number.isFinite(v) && v >= 0) || per100.kcal > 900) continue;
    const k = grams / 100;
    items.push({
      key: `${n}-${per100.name}`, meal, estimated: !known, name: per100.name, grams,
      kcal: Math.round(per100.kcal * k), p: r1(per100.p * k), c: r1(per100.c * k), f: r1(per100.f * k),
      ...(per100.fiber !== undefined ? { fiber: r1(per100.fiber * k) } : {}),
    });
  }
  return { items, note: String(raw.note ?? "").trim(), missingMeals, left };
}
