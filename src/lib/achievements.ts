import type { FoodEntry, WorkoutRecord } from "./store";
import type { HealthMonth } from "./health";
import type { FastRecord } from "./fasting";
import { personalRecords, recordTotal } from "./workout-stats";
import { addDays, weekStreak } from "./insights";

export type AchievementInput = {
  history: WorkoutRecord[];
  /** Dates with gym or cardio. */
  trained: string[];
  plannedDays: number;
  fasts: FastRecord[];
  weighIns: number;
  measures: number;
  recipes: number;
  /** Food of this month and the one before (enough for a 7-day run). */
  foods: FoodEntry[];
  /** Mi Band days of this month and the one before. */
  health: HealthMonth;
  stepsGoal: number;
  goalReached: boolean;
  today: string;
};

export type Achievement = { id: string; group: string; title: string; how: string; have: number; need: number };

/** Longest run of consecutive days (ending anywhere) among the given dates. */
function longestRun(dates: Iterable<string>) {
  const set = new Set(dates);
  let best = 0;
  for (const d of set) {
    if (set.has(addDays(d, -1))) continue;
    let n = 1;
    while (set.has(addDays(d, n))) n++;
    best = Math.max(best, n);
  }
  return best;
}

/**
 * Every medal with how far along it is. All of them come from what the app already keeps; a medal is won when
 * `have >= need`. Records are counted the same way the history marks them.
 */
export function achievements(x: AchievementInput): Achievement[] {
  const workouts = x.history.length;
  const prs = x.history.reduce((n, r, i) => n + personalRecords(x.history.slice(0, i), r).length, 0);
  const heaviest = Math.max(0, ...x.history.map(recordTotal));
  // Weeks on plan: the longest streak is not kept, so the current one is what counts (it stays won once reached).
  const streak = weekStreak(x.trained, x.plannedDays, x.today);
  const fullFasts = x.fasts.filter((f) => f.endedAt - f.startedAt >= f.goalH * 3_600_000).length;
  const mealsByDay = new Map<string, Set<string>>();
  for (const f of x.foods) if (f.meal !== "suplementos") mealsByDay.set(f.date, (mealsByDay.get(f.date) ?? new Set()).add(f.meal));
  const foodRun = longestRun([...mealsByDay].filter(([, m]) => m.size >= 3).map(([d]) => d));
  const stepsRun = longestRun(Object.entries(x.health).filter(([, d]) => (d.steps ?? 0) >= x.stepsGoal).map(([d]) => d));
  const cardioDays = x.trained.filter((d) => !x.history.some((r) => r.date === d)).length;

  const ladder = (group: string, have: number, steps: [number, string][], how: (n: number) => string) =>
    steps.map(([need, title]) => ({ id: `${group}-${need}`, group, title, how: how(need), have, need }));
  return [
    ...ladder("treinos", workouts, [[1, "Primeiro treino"], [10, "10 treinos"], [25, "25 treinos"], [50, "50 treinos"], [100, "100 treinos"]], (n) => (n === 1 ? "Concluir o primeiro treino" : `Concluir ${n} treinos de musculação`)),
    ...ladder("semanas", streak, [[4, "Um mês no plano"], [12, "Três meses no plano"]], (n) => `${n} semanas seguidas cumprindo os dias do plano`),
    ...ladder("recordes", prs, [[1, "Primeiro recorde"], [10, "10 recordes"]], (n) => (n === 1 ? "Bater um recorde pessoal" : `Bater ${n} recordes pessoais`)),
    ...ladder("tonelada", heaviest, [[10000, "Dez toneladas"]], () => "Somar 10.000 kg de peso total num treino"),
    ...ladder("cardio", cardioDays, [[10, "10 dias de cardio"]], () => "10 dias com cardio além da musculação"),
    ...ladder("jejum", fullFasts, [[1, "Primeiro jejum"], [10, "10 jejuns"]], (n) => (n === 1 ? "Completar a meta de um jejum" : `Completar ${n} jejuns`)),
    ...ladder("alimentacao", foodRun, [[7, "Semana registrada"], [30, "Mês registrado"]], (n) => `${n} dias seguidos com 3 refeições ou mais registradas`),
    ...ladder("passos", stepsRun, [[7, "Semana de passos"]], () => "7 dias seguidos batendo a meta de passos"),
    ...ladder("pesagens", x.weighIns, [[10, "10 pesagens"]], () => "Registrar o peso 10 vezes"),
    ...ladder("medidas", x.measures, [[1, "Fita métrica"]], () => "Registrar as medidas do corpo"),
    ...ladder("receitas", x.recipes, [[1, "Na cozinha"]], () => "Montar a primeira receita"),
    ...ladder("meta", x.goalReached ? 1 : 0, [[1, "Meta de peso"]], () => "Chegar ao peso da meta"),
  ];
}

export const ACHIEVEMENTS_KEY = "forma.achievements";
