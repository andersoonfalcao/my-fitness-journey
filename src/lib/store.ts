import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { historyKey, historyMonthsKey, readCloud, subscribeCloud, writeCloud, writeCloudMany } from "./cloud-store";

export { daysKey, foodsKey, waterKey } from "./cloud-store";

/**
 * State of one key in the signed-in user's account (Firestore, cached on the device), shared across components.
 * Kept the old name and shape so screens didn't change when storage moved from localStorage to the cloud.
 */
export function useLocal<T>(key: string, fallback: T) {
  const userId = useAuth().user?.uid;
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!userId) return;
    return subscribeCloud(userId, key, () => rerender((n) => n + 1));
  }, [userId, key]);

  const { value, ready } = userId ? readCloud(userId, key, fallback) : { value: fallback, ready: false };

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      if (!userId) return;
      const prev = readCloud(userId, key, fallback).value;
      writeCloud(userId, key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, key],
  );

  return [value, update, ready] as const;
}

const byMonth = (records: WorkoutRecord[]) => {
  const months = new Map<string, WorkoutRecord[]>();
  for (const r of records) months.set(r.date.slice(0, 7), [...(months.get(r.date.slice(0, 7)) ?? []), r]);
  return months;
};

/**
 * Finished workouts, oldest first. One document per month (`forma.history.YYYY-MM`) so the log never reaches
 * Firestore's 1 MB document limit. The old single document `forma.history` works as an inbox: whatever is in
 * it (everything on the first run, or a workout saved by an outdated copy of the app) is moved into the
 * months and the inbox is emptied, in one all-or-nothing write.
 */
export function useHistory() {
  const userId = useAuth().user?.uid;
  const [months, , monthsReady] = useLocal<string[]>(historyMonthsKey, []);
  const [inbox, , inboxReady] = useLocal<WorkoutRecord[]>(KEYS.history, []);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const stops = months.map((m) => subscribeCloud(userId, historyKey(m), () => rerender((n) => n + 1)));
    return () => stops.forEach((stop) => stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, months.join()]);

  // The month list is saved sorted, so concatenating the months keeps the records oldest first.
  const monthly = userId ? months.map((m) => readCloud<WorkoutRecord[]>(userId, historyKey(m), [])) : [];
  const ready = monthsReady && inboxReady && monthly.every((m) => m.ready);
  const stored = monthly.flatMap((m) => m.value);
  // Until the inbox is moved, its records are shown too (ids keep a record from appearing twice).
  const ids = new Set(stored.map((r) => r.id));
  const records = inbox.length ? [...stored, ...inbox.filter((r) => !ids.has(r.id))] : stored;

  const save = useCallback(
    (next: WorkoutRecord[], current: string[]) => {
      if (!userId) return;
      const grouped = byMonth(next);
      const writes: [string, unknown][] = [];
      for (const m of new Set([...current, ...grouped.keys()])) {
        const list = grouped.get(m) ?? [];
        if (JSON.stringify(list) !== JSON.stringify(readCloud(userId, historyKey(m), []).value)) writes.push([historyKey(m), list]);
      }
      const nextMonths = [...grouped.keys()].sort();
      if (nextMonths.join() !== current.join()) writes.push([historyMonthsKey, nextMonths]);
      if (readCloud<WorkoutRecord[]>(userId, KEYS.history, []).value.length) writes.push([KEYS.history, []]);
      if (writes.length) writeCloudMany(userId, writes);
    },
    [userId],
  );

  useEffect(() => {
    if (ready && inbox.length) save(records, months);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, inbox.length]);

  const update = useCallback(
    (next: (prev: WorkoutRecord[]) => WorkoutRecord[]) => {
      if (!userId) return;
      const current = readCloud<string[]>(userId, historyMonthsKey, []).value;
      const prev = current.flatMap((m) => readCloud<WorkoutRecord[]>(userId, historyKey(m), []).value);
      const prevIds = new Set(prev.map((r) => r.id));
      const pending = readCloud<WorkoutRecord[]>(userId, KEYS.history, []).value.filter((r) => !prevIds.has(r.id));
      save(next([...prev, ...pending]), current);
    },
    [userId, save],
  );

  return [records, update, ready] as const;
}

export type Sex = "m" | "f";
export type Focus = "perder" | "massa" | "forca" | "condicionamento";
export type Level = "iniciante" | "intermediario" | "avancado";

export type Profile = {
  name: string;
  sex: Sex;
  age: number;
  height: number;
  weight: number;
  goalWeight: number;
  activity: number; // multiplier
  focus: Focus;
  days: number;
  level: Level;
  minutes: number;
};

export type MealType = "cafe" | "almoco" | "lanche" | "jantar";
export type FoodEntry = {
  id: string;
  date: string;
  meal: MealType;
  name: string;
  grams: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
};
export type WeightEntry = { date: string; kg: number };
/** One bioimpedance reading; every measure is optional because scales report different sets. */
export type BodyEntry = {
  date: string;
  weightKg?: number | undefined;
  fatPct?: number | undefined;
  muscleKg?: number | undefined;
  leanKg?: number | undefined;
  waterPct?: number | undefined;
  visceral?: number | undefined;
  boneKg?: number | undefined;
  bmrKcal?: number | undefined;
  metabolicAge?: number | undefined;
};
export type LoadEntry = {
  id: string;
  exerciseId: string;
  date: string;
  kg: number;
  createdAt?: number;
};

export type WorkoutSession = {
  dayName: string;
  startedAt: number;
  /** Completed sets per plan item index of this day. */
  sets?: Record<number, number>;
  /** Weight of each completed set per plan item index (null = no weight, e.g. bodyweight). */
  kgs?: Record<number, (number | null)[]>;
  /** Reps actually done in each set (null = time-based work); defaults to the plan target when not typed. */
  repsDone?: Record<number, (number | null)[]>;
  /** Rest after a set; `item` is the plan item index whose card shows the countdown. */
  rest?: { item: number; endsAt: number; next: string } | undefined;
};

/** Snapshot of a finished workout; names are copied so the log survives plan changes. */
export type WorkoutRecord = {
  id: string;
  date: string;
  dayName: string;
  startedAt?: number | undefined;
  finishedAt: number;
  durationMs?: number | undefined;
  exercises: {
    exId: string;
    name: string;
    setsDone: number;
    setsPlanned: number;
    reps: string;
    kg?: number | undefined;
    setKgs?: (number | null)[] | undefined;
    /** Missing in records saved before per-set reps; then every set counts the target `reps`. */
    setReps?: (number | null)[] | undefined;
  }[];
};

/** Water drunk per day in a month document: { "YYYY-MM-DD": ml }. */
export type WaterLog = Record<string, number>;

/** A closed day: the day's numbers, the numbers since the start, and the AI review written from them. */
export type DayRecord = {
  date: string;
  closedAt: number;
  day: {
    kcal: number; protein: number; carbs: number; fat: number; waterMl: number; meals: number;
    targets: { kcal: number; protein: number; carbs: number; fat: number; waterMl: number };
    workout: { name: string; minutes: number | null; setsDone: number; setsPlanned: number; volumeKg: number; volumeDiffKg: number | null } | null;
    weightKg: number | null;
    /** Strava activities of the day (missing in records closed before the integration). */
    strava?: { sport: string; km: number; minutes: number; kcal: number | null; avgHr: number | null }[] | undefined;
  };
  sinceStart: {
    startDate: string; days: number;
    weightStart: number; weightNow: number; weightGoal: number;
    workouts: number; workoutsLast7Days: number;
    daysLogged: number; avgKcal: number; avgProtein: number; daysOnCalories: number; daysOnProtein: number;
    volumeTrend: { name: string; firstKg: number; lastKg: number }[];
    stravaActivities?: number | undefined;
    stravaKm?: number | undefined;
  };
  ai: { overview: string; goingWell: string[]; improve: string[]; sinceStart: string; tomorrow: string };
};

export const KEYS = {
  profile: "forma.profile",
  foods: "forma.foods",
  weights: "forma.weights",
  body: "forma.body",
  loads: "forma.loads",
  plan: "forma.plan",
  done: "forma.done",
  session: "forma.session",
  history: "forma.history",
  /** Workouts done when the sequence was last restarted from the first workout. */
  cycle: "forma.cycle",
  /** Rest between sets and the daily reminder (src/lib/push.ts). */
  settings: "forma.settings",
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

// ~7700 kcal per kg of body weight change; dividing by 7 gives the daily balance for a weekly rate.
const KCAL_PER_KG_DAY = 7700 / 7;

/**
 * Daily targets. Energy: Mifflin-St Jeor × activity. Rates and macros follow
 * Helms et al. 2014 (cut: lose 0.5–1% of body weight/week, fat 15–30% of kcal),
 * Iraki et al. 2019 (bulk: +10–20% for novices/intermediates, less when advanced; protein 1.6–2.2 g/kg)
 * and the ISSN protein position stand (1.4–2.0 g/kg for exercising people, more in a deficit).
 */
export function targets(p: Profile) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * p.activity;
  const losing = p.goalWeight < p.weight - 0.5;
  const gaining = p.goalWeight > p.weight + 0.5;
  const deficitFor = (weeklyRate: number) => Math.min(p.weight * weeklyRate * KCAL_PER_KG_DAY, tdee * 0.25);

  let kcal: number;
  let energyNote: string;
  if (p.focus === "perder") {
    kcal = tdee - deficitFor(0.0075);
    energyNote = "déficit para perder ~0,75% do peso por semana";
  } else if (p.focus === "massa") {
    const surplus = p.level === "iniciante" ? 0.15 : p.level === "intermediario" ? 0.1 : 0.05;
    kcal = tdee * (1 + surplus);
    energyNote = `superávit de ${surplus * 100}% para ganho de massa`;
  } else if (losing) {
    kcal = tdee - deficitFor(0.005);
    energyNote = "déficit leve (~0,5% do peso por semana) rumo à meta";
  } else if (gaining) {
    kcal = tdee * 1.05;
    energyNote = "superávit leve de 5% rumo à meta";
  } else {
    kcal = tdee;
    energyNote = "manutenção do peso";
  }
  kcal = Math.round(Math.max(kcal, p.sex === "m" ? 1500 : 1200));

  // In a deficit, protein follows the goal weight so overweight profiles aren't overestimated.
  const proteinWeight = p.focus === "perder" || losing ? Math.min(p.weight, p.goalWeight) : p.weight;
  const proteinPerKg = p.focus === "perder" ? 2.2 : p.focus === "massa" ? 2 : p.focus === "forca" ? 1.8 : 1.6;
  const protein = Math.round(proteinWeight * proteinPerKg);
  const fat = Math.round(Math.max((kcal * 0.25) / 9, p.weight * 0.6));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  // ~35 ml per kg of body weight is the usual practical guide for active adults; kept within 1.5–4 L.
  const waterMl = Math.round(Math.min(4000, Math.max(1500, p.weight * 35)) / 50) * 50;

  const notes = [
    energyNote,
    `proteína ${proteinPerKg.toLocaleString("pt-BR")} g/kg${proteinWeight !== p.weight ? " do peso-meta" : ""}`,
    "gordura ~25% das calorias",
    "carboidratos completam o restante",
    "água ~35 ml/kg",
  ];
  return { kcal, protein, carbs, fat, waterMl, tdee: Math.round(tdee), notes };
}
