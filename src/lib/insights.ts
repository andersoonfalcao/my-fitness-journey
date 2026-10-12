import type { FoodEntry, MealType, WeightEntry, WorkoutRecord } from "./store";
import type { HealthDay, HealthMonth } from "./health";

// Readings of the person's own logs (weight trend, eating patterns, sleep regularity, training consistency).
// Pure functions: every screen and the AI prompts get the same numbers. Rules of thumb, not a diagnosis.

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const dayIndex = (date: string) => Math.round(new Date(`${date}T12:00:00`).getTime() / 86_400_000);
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

// ---------- Weight

export type WeightPoint = WeightEntry & { trend: number };

/** Each weigh-in with the average of the weigh-ins of its last 7 days, so one heavy morning doesn't read as a setback. */
export function weightTrend(weights: WeightEntry[]): WeightPoint[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((w) => {
    const from = addDays(w.date, -6);
    const window = sorted.filter((x) => x.date >= from && x.date <= w.date);
    return { ...w, trend: Math.round(mean(window.map((x) => x.kg)) * 100) / 100 };
  });
}

/** kg per week by least squares over the weigh-ins of the last `days` days; null without 3 weigh-ins at least `minSpan` days apart. */
export function weeklyRate(weights: WeightEntry[], end: string, days: number, minSpan: number): number | null {
  const from = addDays(end, -(days - 1));
  const w = weights.filter((x) => x.date >= from && x.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  if (w.length < 3 || dayIndex(w.at(-1)!.date) - dayIndex(w[0]!.date) < minSpan) return null;
  const xs = w.map((x) => dayIndex(x.date));
  const mx = mean(xs);
  const my = mean(w.map((x) => x.kg));
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (w[i]!.kg - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return Math.round(slope * 7 * 100) / 100;
}

/** Losing faster than this share of body weight per week, over two weeks, risks muscle (Helms et al. 2014: 0.5–1%). */
export const FAST_LOSS = 0.01;
/** Weight that moved less than this in two weeks counts as stalled. */
export const PLATEAU_KG = 0.5;

export type WeightReading = {
  current: number | null;
  /** kg per week over the last three weeks (the pace shown on the screen). */
  rate: number | null;
  /** Losing more than 1% of body weight per week over the last two weeks; `raiseKcal` brings it back to ~0.75%. */
  fast: { rate: number; raiseKcal: number } | null;
  /** Aiming to lose, not there yet, and the last two weeks moved less than 0.5 kg. `avgKcal` is the logged intake of those weeks. */
  plateau: { avgKcal: number | null; completeDays: number } | null;
  /** Date the goal is reached at the current pace (only while moving toward it, within two years). */
  eta: string | null;
  /** The last weigh-in reached a goal that was below the starting weight. */
  goalReached: boolean;
};

export function readWeight(weights: WeightEntry[], foods: FoodEntry[], goalWeight: number, inDeficit: boolean, end: string): WeightReading {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted.at(-1)?.kg ?? null;
  const rate = weeklyRate(sorted, end, 21, 7);
  // Fifteen days, so someone who weighs in weekly has three weigh-ins in the window.
  const rate14 = weeklyRate(sorted, end, 15, 10);
  const goalReached = current !== null && sorted.length > 1 && sorted[0]!.kg > goalWeight && current <= goalWeight;

  const fast = current !== null && rate14 !== null && -rate14 > current * FAST_LOSS
    ? { rate: rate14, raiseKcal: Math.max(50, Math.round(((-rate14 - current * 0.0075) * 1100) / 50) * 50) }
    : null;

  let plateau: WeightReading["plateau"] = null;
  if (inDeficit && !goalReached && current !== null && current > goalWeight + PLATEAU_KG && rate14 !== null && Math.abs(rate14 * 2) < PLATEAU_KG) {
    const complete = completeDays(foods, addDays(end, -14), addDays(end, -1));
    plateau = { avgKcal: complete.length >= 7 ? Math.round(mean(complete.map((d) => d.kcal))) : null, completeDays: complete.length };
  }

  let eta: string | null = null;
  if (current !== null && rate !== null && !goalReached) {
    const left = goalWeight - current;
    const weeks = Math.abs(rate) >= 0.05 && Math.sign(left) === Math.sign(rate) ? left / rate : null;
    if (weeks !== null && weeks <= 104) eta = addDays(end, Math.round(weeks * 7));
  }
  return { current, rate, fast, plateau, eta, goalReached };
}

// ---------- Food

const MEALS: MealType[] = ["cafe", "almoco", "lanche", "jantar"];

/** Days in [from, to] with at least three of the four meals logged (supplements aren't a meal), oldest first. */
export function completeDays(foods: FoodEntry[], from: string, to: string) {
  const days = new Map<string, { date: string; kcal: number; meals: Set<string> }>();
  for (const f of foods) {
    if (f.date < from || f.date > to) continue;
    const d = days.get(f.date) ?? { date: f.date, kcal: 0, meals: new Set<string>() };
    d.kcal += f.kcal;
    if (f.meal !== "suplementos") d.meals.add(f.meal);
    days.set(f.date, d);
  }
  return [...days.values()].filter((d) => d.meals.size >= 3).sort((a, b) => a.date.localeCompare(b.date));
}

/** Protein per meal worth aiming for: ~0.3 g per kg of body weight (ISSN: 0.25–0.40 g/kg, spread over the day). */
export const proteinPerMeal = (weightKg: number) => Math.round(weightKg * 0.3);

/** Protein of each meal of one day's entries. */
export function proteinByMeal(day: FoodEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of MEALS) out[m] = Math.round(day.filter((f) => f.meal === m).reduce((s, f) => s + f.p, 0));
  return out;
}

/** Fibre worth reaching in a day (25 g is the usual adult reference; 30 g is better). */
export const FIBER_REFERENCE = 25;

/** Fibre of one day's entries. Entries logged before fibre was kept (or from a source without it) are counted apart. */
export function fiberOf(day: FoodEntry[]) {
  const meals = day.filter((f) => f.meal !== "suplementos");
  const known = meals.filter((f) => f.fiber !== undefined);
  return { grams: Math.round(known.reduce((s, f) => s + (f.fiber ?? 0), 0) * 10) / 10, known: known.length, unknown: meals.length - known.length };
}

/** Average calories of the logged days in [from, to], Monday–Friday against Saturday–Sunday. */
export function weekdayWeekend(foods: FoodEntry[], from: string, to: string) {
  const days = new Map<string, number>();
  for (const f of foods) if (f.date >= from && f.date <= to && f.meal !== "suplementos") days.set(f.date, (days.get(f.date) ?? 0) + f.kcal);
  const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
  const pick = (weekend: boolean) => [...days].filter(([d]) => isWeekend(d) === weekend).map(([, kcal]) => kcal);
  const avg = (xs: number[]) => (xs.length ? Math.round(mean(xs)) : null);
  return { weekdays: avg(pick(false)), weekend: avg(pick(true)) };
}

/** The last three complete days before `today` (within a week) all below the floor: their average, else null. */
export function lowIntake(foods: FoodEntry[], floorKcal: number, today: string): number | null {
  const last = completeDays(foods, addDays(today, -7), addDays(today, -1)).slice(-3);
  return last.length === 3 && last.every((d) => d.kcal < floorKcal) ? Math.round(mean(last.map((d) => d.kcal))) : null;
}

// ---------- Sleep

/** Nights shorter than this are counted as short (7 h is the lower end of the adult recommendation). */
export const SHORT_NIGHT_MIN = 420;

export type SleepReading = {
  nights: number;
  /** Nights under 7 h among those. */
  short: number;
  /** Average bedtime and wake-up time ("23:40"), and how much each varies, in minutes (standard deviation). */
  bedtime: string; wake: string; bedtimeSd: number; wakeSd: number;
  level: "regular" | "variando" | "irregular";
};

const hhmm = (min: number) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

/** Regularity of the last 14 nights that carry both ends of the sleep; null with fewer than five. */
export function readSleep(health: HealthMonth, end: string): SleepReading | null {
  const from = addDays(end, -13);
  const nights = Object.entries(health).filter(([d, v]) => d >= from && d <= end && v.sleepMin !== undefined && v.sleepStart && v.sleepEnd).map(([, v]) => v);
  if (nights.length < 5) return null;
  const minutesOfDay = (isoTime: string) => { const d = new Date(isoTime); return d.getHours() * 60 + d.getMinutes(); };
  // Bedtimes sit around midnight: measured from noon, 23:30 and 00:30 are an hour apart instead of 23 hours.
  const beds = nights.map((n) => (minutesOfDay(n.sleepStart!) + 720) % 1440);
  const wakes = nights.map((n) => minutesOfDay(n.sleepEnd!));
  const bedtimeSd = Math.round(sd(beds));
  const wakeSd = Math.round(sd(wakes));
  const spread = (bedtimeSd + wakeSd) / 2;
  return {
    nights: nights.length,
    short: nights.filter((n) => n.sleepMin! < SHORT_NIGHT_MIN).length,
    bedtime: hhmm(mean(beds) - 720), wake: hhmm(mean(wakes)), bedtimeSd, wakeSd,
    level: spread <= 30 ? "regular" : spread <= 60 ? "variando" : "irregular",
  };
}

/** Workouts needed (each with last night's sleep and an earlier session of the same workout) before comparing. */
export const SLEEP_TRAINING_MIN = 20;
const POOR_NIGHT_MIN = 390;

export type SleepTraining =
  | { ready: false; have: number }
  | { ready: true; workouts: number; poorNights: number; afterPoor: number; afterGood: number };

/**
 * Change of the workout's total load against the previous session of the same workout, after nights under 6h30
 * and after the others (percent, average). Few sessions make this noise, so it waits for 20 (and 4 of each kind).
 */
export function sleepVsTraining(history: WorkoutRecord[], health: HealthMonth, total: (r: WorkoutRecord) => number): SleepTraining {
  const last = new Map<string, number>();
  const poor: number[] = [];
  const good: number[] = [];
  for (const r of [...history].sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt)) {
    const volume = total(r);
    const before = last.get(r.dayName);
    if (volume > 0) last.set(r.dayName, volume);
    const sleep = health[r.date]?.sleepMin;
    if (!before || volume <= 0 || sleep === undefined) continue;
    (sleep < POOR_NIGHT_MIN ? poor : good).push((volume / before - 1) * 100);
  }
  const have = poor.length + good.length;
  if (have < SLEEP_TRAINING_MIN || poor.length < 4 || good.length < 4) return { ready: false, have };
  const pct = (xs: number[]) => Math.round(mean(xs) * 10) / 10;
  return { ready: true, workouts: have, poorNights: poor.length, afterPoor: pct(poor), afterGood: pct(good) };
}

// ---------- Training

/** WHO: at least 150 minutes of moderate aerobic activity a week. */
export const CARDIO_REFERENCE_MIN = 150;

/** Monday of the week of a date. */
const weekStart = (date: string) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };

/**
 * Weeks in a row with at least `planned` training days, ending at last week (this week joins once it gets there).
 * `trained` = every date with a gym workout or cardio.
 */
export function weekStreak(trained: Iterable<string>, planned: number, today: string): number {
  if (planned <= 0) return 0;
  const perWeek = new Map<string, Set<string>>();
  for (const d of trained) { const w = weekStart(d); perWeek.set(w, (perWeek.get(w) ?? new Set()).add(d)); }
  const met = (week: string) => (perWeek.get(week)?.size ?? 0) >= planned;
  const thisWeek = weekStart(today);
  let streak = met(thisWeek) ? 1 : 0;
  for (let w = addDays(thisWeek, -7); met(w); w = addDays(w, -7)) streak++;
  return streak;
}

export type Overreach = { kind: "batimento"; above: number } | { kind: "sem-descanso"; days: number };

/**
 * Signs of several days of accumulated fatigue: resting heart rate 5+ above the person's normal on each of the last
 * three days with a reading (normal = the 14 days before them), or seven days in a row with training.
 */
export function overreach(health: HealthMonth, trained: Iterable<string>, today: string): Overreach | null {
  const hr = (d: HealthDay | undefined) => d?.restingHr;
  const recent = [0, 1, 2].map((i) => hr(health[addDays(today, -i)]));
  const base = Array.from({ length: 14 }, (_, i) => hr(health[addDays(today, -(i + 3))])).filter((n): n is number => n !== undefined);
  if (recent.every((n): n is number => n !== undefined) && base.length >= 5) {
    const normal = mean(base);
    const above = Math.min(...(recent as number[]).map((n) => n - normal));
    if (above >= 5) return { kind: "batimento", above: Math.round(above) };
  }
  const days = new Set(trained);
  // Today may still be ahead: the run can end yesterday.
  const start = days.has(today) ? today : addDays(today, -1);
  let run = 0;
  while (days.has(addDays(start, -run))) run++;
  return run >= 7 ? { kind: "sem-descanso", days: run } : null;
}
