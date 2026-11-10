import { BEST_MODELS, generateJson, Schema } from "./ai";
import type { Food } from "./foods";
import type { FavItem, FavMeal } from "./quick-foods";
import type { MealType } from "./store";

/** The four meals a planned day is built from (supplements stay apart). */
export const MENU_MEALS = ["cafe", "almoco", "lanche", "jantar"] as const satisfies readonly MealType[];
export type MenuMeal = (typeof MENU_MEALS)[number];

/** Targets of the meals asked for that day (not the whole day when some meals are left out or already planned). */
export type MenuDayTarget = { date: string; meals: readonly MenuMeal[]; kcal: number; protein: number; carbs: number; fat: number };

/** Usual share of the day's calories in each meal, used to split a day's target among the meals asked for. */
export const MEAL_SHARE: Record<MenuMeal, number> = { cafe: 0.25, almoco: 0.35, lanche: 0.15, jantar: 0.25 };
export type MenuDay = { date: string; meals: { meal: MenuMeal; items: FavItem[] }[] };

const SYSTEM = `Você é um nutricionista brasileiro montando o cardápio dos próximos dias de um aluno num app de dieta.
Para cada dia recebido em "dias", monte SOMENTE as refeições listadas em "refeicoes" (cafe = café da manhã, almoco, lanche, jantar); não devolva as outras.
As metas do dia (kcal, protein, carbs, fat) já são só dessas refeições. A soma das calorias delas deve ficar a no máximo 5% de kcal. A proteína precisa chegar a pelo menos 90% de protein, distribuída nas refeições (não concentre numa só): se os habituais não bastarem, aumente as fontes de proteína ou acrescente frango, carne magra, peixe, ovos, iogurte natural ou queijo branco.
Use de preferência os alimentos de "habituais", que são os que o aluno mais registra, com a porção de costume como referência; para eles, calcule os valores pelas colunas por 100 g recebidas. Pode completar com alimentos comuns no Brasil (tabela TACO), em preparos simples (cozido, grelhado, assado).
"favoritas" são refeições que o aluno já salvou: pode repetir algumas como estão.
Os dias precisam ser diferentes entre si: repetir o café da manhã e o lanche é normal, mas o almoço e o jantar não podem ser iguais em dias seguidos; troque a proteína, o acompanhamento ou o preparo. Prefira itens separados (arroz, feijão, frango) a pratos inteiros, para o aluno poder ajustar cada um. Não inclua suplementos.
Cada item: nome em português, gramas e os valores TOTAIS do item (não por 100 g), arredondados a 1 casa. fiber = fibra em g (0 para carnes, ovos, laticínios e óleos).
Devolva um elemento em "days" para cada dia recebido, com a mesma data (date).`;

const ITEM = Schema.object({
  properties: { name: Schema.string(), grams: Schema.number(), kcal: Schema.number(), p: Schema.number(), c: Schema.number(), f: Schema.number(), fiber: Schema.number() },
});
const SCHEMA = Schema.object({
  properties: {
    days: Schema.array({
      items: Schema.object({
        properties: {
          date: Schema.string(),
          meals: Schema.array({ items: Schema.object({ properties: { meal: Schema.enumString({ enum: [...MENU_MEALS] }), items: Schema.array({ items: ITEM }) } }) }),
        },
      }),
    }),
  },
});

const r1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

/**
 * Asks the AI (the better models first: a week is planned once and is worth the wait) for the meals of each day, from that day's targets and the foods the person logs most.
 * A food from the usual list keeps its own per-100 g values (the AI only picks the grams), so it matches the log.
 */
export async function buildWeekMenu(days: MenuDayTarget[], usual: { food: Food; grams: number }[], favorites: FavMeal[]): Promise<MenuDay[]> {
  const prompt = JSON.stringify({
    dias: days.map((d) => ({ date: d.date, diaDaSemana: new Date(`${d.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" }), refeicoes: d.meals, kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat })),
    habituais: usual.map(({ food, grams }) => ({ nome: food.name, porcaoDeCostumeG: grams, kcalPor100g: food.kcal, proteinaPor100g: food.p, carboPor100g: food.c, gorduraPor100g: food.f })),
    favoritas: favorites.slice(0, 10).map((f) => ({ nome: f.name, refeicao: f.meal, itens: f.items.map((i) => `${i.name} ${i.grams} g`) })),
  });
  const result = (await generateJson(SYSTEM, SCHEMA, prompt, { models: BEST_MODELS, timeoutMs: 90_000 })) as { days?: unknown };
  const byName = new Map(usual.map(({ food }) => [food.name.toLowerCase(), food]));
  const answer = Array.isArray(result.days) ? (result.days as Record<string, unknown>[]) : [];
  return days.map((target, index) => {
    // The date the AI sent back decides the day; a list that came in order without dates still lines up.
    const raw = answer.find((d) => d["date"] === target.date) ?? answer[index];
    const meals = Array.isArray(raw?.["meals"]) ? (raw["meals"] as Record<string, unknown>[]) : [];
    return {
      date: target.date,
      meals: MENU_MEALS.filter((meal) => target.meals.includes(meal)).map((meal) => ({
        meal,
        items: (meals.find((m) => m["meal"] === meal)?.["items"] as Record<string, unknown>[] | undefined ?? []).flatMap((i): FavItem[] => {
          const name = String(i["name"] ?? "").trim();
          const grams = Math.round(num(i["grams"]));
          if (!name || !grams) return [];
          const known = byName.get(name.toLowerCase());
          if (known) {
            const k = grams / 100;
            return [{ name: known.name, grams, kcal: Math.round(known.kcal * k), p: r1(known.p * k), c: r1(known.c * k), f: r1(known.f * k), ...(known.fiber !== undefined ? { fiber: r1(known.fiber * k) } : {}) }];
          }
          return [{ name, grams, kcal: Math.round(num(i["kcal"])), p: r1(num(i["p"])), c: r1(num(i["c"])), f: r1(num(i["f"])), fiber: r1(num(i["fiber"])) }];
        }),
      })),
    };
  });
}

export function dayTotals(day: MenuDay) {
  const items = day.meals.flatMap((m) => m.items);
  return { kcal: Math.round(items.reduce((s, i) => s + i.kcal, 0)), p: Math.round(items.reduce((s, i) => s + i.p, 0)) };
}
