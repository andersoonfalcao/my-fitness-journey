import type { Plan } from "./plan";
import { addDays } from "./insights";

/**
 * The plan runs in cycles of six weeks whose intensity only goes up (no light week, by the person's choice):
 * 40% → 65%. Intensity sets how close to the limit the sets go (reps left in reserve), which also sets the load
 * suggested from the estimated max, and how long the cardio target is. A new cycle starts over at 40%.
 */
export const PROGRAM_WEEKS = [
  { pct: 40, rir: 4, cardioMin: 30 },
  { pct: 45, rir: 3, cardioMin: 34 },
  { pct: 50, rir: 3, cardioMin: 38 },
  { pct: 55, rir: 2, cardioMin: 42 },
  { pct: 60, rir: 1, cardioMin: 46 },
  { pct: 65, rir: 1, cardioMin: 50 },
] as const;
export const CYCLE_WEEKS = PROGRAM_WEEKS.length;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monday = (date: string) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };

/** Monday of the week the plan was made: week 1 of cycle 1. */
export const programStart = (plan: Pick<Plan, "createdAt">) => monday(iso(new Date(plan.createdAt)));

export type ProgramPosition = { cycle: number; week: number; weekStart: string; cycleStart: string } & (typeof PROGRAM_WEEKS)[number];

/** Cycle and week (both from 1) of a date, with that week's intensity. Dates before the plan count as week 1. */
export function programAt(plan: Pick<Plan, "createdAt">, date: string): ProgramPosition {
  const start = programStart(plan);
  const days = Math.max(0, Math.round((new Date(`${monday(date)}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000));
  const weeks = Math.floor(days / 7);
  const cycle = Math.floor(weeks / CYCLE_WEEKS) + 1;
  const week = (weeks % CYCLE_WEEKS) + 1;
  return { cycle, week, weekStart: addDays(start, weeks * 7), cycleStart: addDays(start, (cycle - 1) * CYCLE_WEEKS * 7), ...PROGRAM_WEEKS[week - 1]! };
}

/** "deixe ~3 repetições sobrando" for a week's effort. */
export const rirText = (rir: number) => (rir <= 1 ? "pare com 1 repetição sobrando" : `deixe ~${rir} repetições sobrando`);

/** A guided max test: the best attempt (heaviest estimate) and when it was done. */
export type MaxTest = { kg: number; reps: number; e1rm: number; date: string };

/**
 * Estimated max to plan loads from. A test done after the last workout with the exercise is the newest measure and
 * wins; otherwise the best of the last three workouts, or a test of the last 60 days if higher.
 */
export function referenceMax(points: { date: string; e1rm: number | null }[], test: MaxTest | undefined, today: string) {
  const lastDate = points.at(-1)?.date ?? "";
  if (test && test.date >= lastDate && test.date >= addDays(today, -60)) return { kg: test.e1rm, fromTest: true };
  const recent = points.filter((p) => p.e1rm !== null).slice(-3).map((p) => p.e1rm!);
  const fromTest = test && test.date >= addDays(today, -60) ? test.e1rm : 0;
  const best = Math.max(0, fromTest, ...recent);
  return best > 0 ? { kg: best, fromTest: fromTest > 0 && fromTest >= Math.max(0, ...recent) } : null;
}

/**
 * Load for `reps` with `rir` left from an estimated max (Epley turned around): e1RM / (1 + (reps + rir) / 30),
 * rounded down to what the gym has (2.5 kg with a barbell, 2 kg otherwise).
 */
export function weekLoad(e1rmKg: number, reps: number, rir: number, barbell: boolean) {
  const step = barbell ? 2.5 : 2;
  return Math.floor(e1rmKg / (1 + (reps + rir) / 30) / step) * step;
}
