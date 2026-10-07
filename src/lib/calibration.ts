import { foodsKey, today, useLocal, KEYS, targets, type FoodEntry, type Profile, type WeightEntry } from "./store";

/**
 * Energy spent per day measured from the person's own logs ("adaptive TDEE"): over the last four weeks, what was
 * eaten on fully logged days minus the energy the weight change accounts for (~7700 kcal per kg). Needs enough
 * complete days and weigh-ins far enough apart; until then it reports what is missing.
 */
export const WINDOW_DAYS = 28;
export const MIN_COMPLETE_DAYS = 10;
export const MIN_WEIGH_INS = 3;
export const MIN_WEIGHT_SPAN = 14;
/** A new measurement is offered when it differs this much from the energy in use. */
export const SUGGEST_DIFF = 0.05;

export type Calibration =
  | { ready: true; tdee: number; from: string; to: string; completeDays: number; avgKcal: number; kgPerWeek: number }
  | { ready: false; completeDays: number; weighIns: number; weightSpan: number };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const dayIndex = (date: string) => Math.round(new Date(`${date}T12:00:00`).getTime() / 86_400_000);

export function calibrate(foods: FoodEntry[], weights: WeightEntry[], end = addDays(today(), -1)): Calibration {
  const from = addDays(end, -(WINDOW_DAYS - 1));
  // Complete day = at least three of the four meals logged (supplements don't count as a meal).
  const days = new Map<string, { kcal: number; meals: Set<string> }>();
  for (const f of foods) {
    if (f.date < from || f.date > end) continue;
    const d = days.get(f.date) ?? { kcal: 0, meals: new Set<string>() };
    d.kcal += f.kcal;
    if (f.meal !== "suplementos") d.meals.add(f.meal);
    days.set(f.date, d);
  }
  const complete = [...days.values()].filter((d) => d.meals.size >= 3);
  const w = weights.filter((x) => x.date >= from && x.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const span = w.length ? dayIndex(w.at(-1)!.date) - dayIndex(w[0]!.date) : 0;
  if (complete.length < MIN_COMPLETE_DAYS || w.length < MIN_WEIGH_INS || span < MIN_WEIGHT_SPAN)
    return { ready: false, completeDays: complete.length, weighIns: w.length, weightSpan: span };

  // Weight trend by least squares, so one heavy morning doesn't decide it.
  const xs = w.map((x) => dayIndex(x.date));
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = w.reduce((s, x) => s + x.kg, 0) / w.length;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (w[i]!.kg - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const avgKcal = complete.reduce((s, d) => s + d.kcal, 0) / complete.length;
  const tdee = Math.round((avgKcal - slope * 7700) / 10) * 10;
  if (!(tdee >= 1200 && tdee <= 5000)) return { ready: false, completeDays: complete.length, weighIns: w.length, weightSpan: span };
  return { ready: true, tdee, from, to: end, completeDays: complete.length, avgKcal: Math.round(avgKcal), kgPerWeek: Math.round(slope * 7 * 100) / 100 };
}

/** The measurement for the profile, the energy in use now and whether a new value is worth offering. */
export function useCalibration(profile: Profile | null) {
  const end = addDays(today(), -1);
  const [thisMonth] = useLocal<FoodEntry[]>(foodsKey(end), []);
  const [prevMonth] = useLocal<FoodEntry[]>(foodsKey(addDays(end, -(WINDOW_DAYS - 1))), []);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [dismissed, setDismissed] = useLocal<number>("forma.calibration.dismissed", 0);
  if (!profile) return null;
  const foods = foodsKey(end) === foodsKey(addDays(end, -(WINDOW_DAYS - 1))) ? thisMonth : [...prevMonth, ...thisMonth];
  const result = calibrate(foods, weights, end);
  const inUse = targets(profile).tdee;
  const suggest = result.ready && Math.abs(result.tdee - inUse) / inUse >= SUGGEST_DIFF;
  return { result, inUse, suggest, dismissed: result.ready && dismissed === result.tdee, dismiss: () => result.ready && setDismissed(result.tdee) };
}
