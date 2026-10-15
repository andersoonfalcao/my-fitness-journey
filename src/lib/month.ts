import { weightTrend } from "./insights";
import type { WeightEntry, WorkoutRecord } from "./store";
import { addDays, weekStats, type WeekInputs, type WeekStats } from "./week";
import { personalRecords, recordTotal, type PersonalRecord } from "./workout-stats";

/**
 * Retrospectiva do mês (/mes): the month's numbers (the weekly summary's, over the whole month), compared with the
 * month before, plus the records set in it and its heaviest workout. Opened by the notification on the 1st.
 */
export type MonthReview = {
  month: string; start: string; end: string; inProgress: boolean;
  stats: WeekStats; before: WeekStats;
  /** Workouts the plan asks for in these days (workouts per week × weeks). */
  planned: number;
  /** Smoothed weight (7-day average) at the first and last weigh-in of the month. */
  weight: { from: number; to: number } | null;
  /** One per exercise, the best of the month (a weight record beats a reps one). */
  records: PersonalRecord[];
  best: { date: string; name: string; kg: number } | null;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const daysIn = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
export const shiftMonth = (month: string, n: number) => iso(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1)).slice(0, 7);
export const monthName = (month: string) => {
  const s = new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s[0]!.toUpperCase() + s.slice(1);
};
export const monthShort = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long" });

/** The month the screen opens on: the one that ended during the first week, the current one after that. */
export const defaultMonth = (today: string) => (Number(today.slice(8)) <= 7 ? shiftMonth(today.slice(0, 7), -1) : today.slice(0, 7));

export function monthReview(month: string, today: string, x: WeekInputs, weights: WeightEntry[], history: WorkoutRecord[], perWeek: number): MonthReview {
  const start = `${month}-01`;
  const days = daysIn(month);
  const lastDay = addDays(start, days - 1);
  const end = lastDay < today ? lastDay : today;
  const inProgress = end < lastDay;
  const stats = weekStats(start, end, x, days);
  // A month in progress is compared with the same days of the month before.
  const prev = shiftMonth(month, -1);
  const prevDays = daysIn(prev);
  const sameDays = Math.min(prevDays, stats.days);
  const before = weekStats(`${prev}-01`, addDays(`${prev}-01`, sameDays - 1), x, prevDays);

  const trend = weightTrend(weights).filter((w) => w.date >= start && w.date <= end);
  const weight = trend.length >= 2 ? { from: trend[0]!.trend, to: trend.at(-1)!.trend } : null;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date) || (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
  const byExercise = new Map<string, PersonalRecord>();
  sorted.forEach((r, i) => {
    if (r.date < start || r.date > end) return;
    for (const pr of personalRecords(sorted.slice(0, i), r)) {
      const had = byExercise.get(pr.exId);
      // The later record of the same exercise is the better one.
      if (!had || pr.kind === "carga" || had.kind === "repeticoes") byExercise.set(pr.exId, pr);
    }
  });
  const inMonth = sorted.filter((r) => r.date >= start && r.date <= end);
  const top = inMonth.reduce<WorkoutRecord | null>((b, r) => (!b || recordTotal(r) > recordTotal(b) ? r : b), null);

  return {
    month, start, end, inProgress, stats, before,
    planned: Math.round((perWeek * stats.days) / 7),
    weight,
    records: [...byExercise.values()],
    best: top && recordTotal(top) > 0 ? { date: top.date, name: top.dayName, kg: Math.round(recordTotal(top)) } : null,
  };
}
