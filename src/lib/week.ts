import { mealSlot, type FoodEntry, type WaterLog, type WeightEntry, type WorkoutRecord } from "./store";
import { isGymCopy, type StravaActivity } from "./strava";
import type { HealthMonth } from "./health";
import { recordTotal } from "./workout-stats";
import { fiberOf, weekdayWeekend } from "./insights";

/** Weekly summary (Monday to Sunday): the numbers of one week, compared with the week before on the screen /semana. */
export type WeekStats = {
  start: string; end: string; days: number;
  weightAvg: number | null;
  kcalAvg: number | null; proteinAvg: number | null; loggedDays: number; fullDays: number; kcalOnTarget: number;
  /** Average calories of the logged days, Monday–Friday and Saturday–Sunday. */
  kcalWeekdays: number | null; kcalWeekend: number | null;
  /** Average fibre of the days whose entries carry it (entries from before 2026-10-12 don't). */
  fiberAvg: number | null;
  waterDays: number;
  workouts: number; volumeKg: number; workoutMinutes: number;
  /** Average of how the workouts felt (1 to 5) and how many were rated; null = none rated. */
  feelAvg: number | null; feelCount: number;
  /** Days trained with cardio only (no gym workout), already inside `workouts`. */
  cardioOnlyDays: number;
  stravaCount: number; stravaKm: number;
  /** Activities other than weight training (cardio from Strava or started in the app) and their moving time. */
  cardioCount: number; cardioMinutes: number;
  /** Strava weight training that is one of `workouts` as the band recorded it (already inside stravaCount). */
  stravaSameAsWorkouts: number;
  sleepAvg: number | null; stepsAvg: number | null; restingAvg: number | null;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
/** Monday of the week of a date. */
export const weekStart = (date: string) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : null);

export type WeekInputs = {
  foods: FoodEntry[]; water: WaterLog; weights: WeightEntry[]; history: WorkoutRecord[]; strava: StravaActivity[]; health: HealthMonth;
  targets: { kcal: number; waterMl: number };
};

/**
 * Numbers of the week starting `start`, up to `last` (today for the week in progress). `span` days other than 7
 * give the same numbers for a month (the monthly review).
 */
export function weekStats(start: string, last: string, x: WeekInputs, span = 7): WeekStats {
  const end = addDays(start, span - 1) < last ? addDays(start, span - 1) : last;
  const inWeek = (d: string) => d >= start && d <= end;
  const days = new Map<string, { kcal: number; p: number; meals: Set<string> }>();
  for (const f of x.foods) {
    if (!inWeek(f.date)) continue;
    const d = days.get(f.date) ?? { kcal: 0, p: 0, meals: new Set<string>() };
    d.kcal += f.kcal; d.p += f.p;
    { const slot = mealSlot(f); if (slot) d.meals.add(slot); }
    days.set(f.date, d);
  }
  const logged = [...days.values()].filter((d) => d.meals.size > 0);
  const workouts = x.history.filter((r) => inWeek(r.date));
  const strava = x.strava.filter((a) => inWeek(a.date));
  const lifted = new Set(workouts.map((r) => r.date));
  const cardioOnlyDays = new Set(strava.filter((a) => a.sport !== "WeightTraining" && !lifted.has(a.date)).map((a) => a.date)).size;
  const health = Object.entries(x.health).filter(([d]) => inWeek(d)).map(([, v]) => v);
  const kcalAvg = avg(logged.map((d) => d.kcal));
  const proteinAvg = avg(logged.map((d) => d.p));
  const sleepAvg = avg(health.flatMap((h) => (h.sleepMin !== undefined ? [h.sleepMin] : [])));
  const stepsAvg = avg(health.flatMap((h) => (h.steps !== undefined ? [h.steps] : [])));
  const restingAvg = avg(health.flatMap((h) => (h.restingHr !== undefined ? [h.restingHr] : [])));
  const weightAvg = avg(x.weights.filter((w) => inWeek(w.date)).map((w) => w.kg));
  const split = weekdayWeekend(x.foods, start, end);
  const fibers = [...days.keys()].map((d) => fiberOf(x.foods.filter((f) => f.date === d))).filter((f) => f.known > 0 && f.known >= f.unknown).map((f) => f.grams);
  const fiberAvg = avg(fibers);
  const cardio = strava.filter((a) => a.sport !== "WeightTraining");
  const feels = workouts.flatMap((r) => (r.feel ? [r.feel] : []));
  const feelAvg = avg(feels);
  return {
    start, end, days: Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000) + 1,
    weightAvg: weightAvg === null ? null : Math.round(weightAvg * 100) / 100,
    kcalAvg: kcalAvg === null ? null : Math.round(kcalAvg),
    proteinAvg: proteinAvg === null ? null : Math.round(proteinAvg),
    loggedDays: logged.length,
    fullDays: logged.filter((d) => d.meals.size >= 4).length,
    kcalOnTarget: logged.filter((d) => Math.abs(d.kcal - x.targets.kcal) <= x.targets.kcal * 0.1).length,
    kcalWeekdays: split.weekdays, kcalWeekend: split.weekend,
    fiberAvg: fiberAvg === null ? null : Math.round(fiberAvg),
    waterDays: Object.entries(x.water).filter(([d, ml]) => inWeek(d) && ml >= x.targets.waterMl).length,
    workouts: workouts.length + cardioOnlyDays,
    cardioOnlyDays,
    volumeKg: Math.round(workouts.reduce((s, r) => s + recordTotal(r), 0)),
    workoutMinutes: Math.round(workouts.reduce((s, r) => s + (r.durationMs ?? 0), 0) / 60000),
    feelAvg: feelAvg === null ? null : Math.round(feelAvg * 10) / 10,
    feelCount: feels.length,
    stravaCount: strava.length,
    cardioCount: cardio.length,
    cardioMinutes: Math.round(cardio.reduce((s, a) => s + a.movingS, 0) / 60),
    stravaSameAsWorkouts: strava.filter((a) => isGymCopy(a, workouts)).length,
    stravaKm: Math.round(strava.reduce((s, a) => s + a.distanceM, 0) / 100) / 10,
    sleepAvg: sleepAvg === null ? null : Math.round(sleepAvg),
    stepsAvg: stepsAvg === null ? null : Math.round(stepsAvg),
    restingAvg: restingAvg === null ? null : Math.round(restingAvg),
  };
}

/** AI comment saved per week: { "YYYY-MM-DD" (Monday): { at, ai } }. */
export const WEEKS_KEY = "forma.weeks";
export type WeekReview = { at: number; ai: { resumo: string; destaques: string[]; foco: string } };
