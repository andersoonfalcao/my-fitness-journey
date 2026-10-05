import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { readCloud, subscribeCloud, writeCloud } from "./cloud-store";

export { foodsKey } from "./cloud-store";

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

export const KEYS = {
  profile: "forma.profile",
  foods: "forma.foods",
  weights: "forma.weights",
  loads: "forma.loads",
  plan: "forma.plan",
  done: "forma.done",
  session: "forma.session",
  history: "forma.history",
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

  const notes = [
    energyNote,
    `proteína ${proteinPerKg.toLocaleString("pt-BR")} g/kg${proteinWeight !== p.weight ? " do peso-meta" : ""}`,
    "gordura ~25% das calorias",
    "carboidratos completam o restante",
  ];
  return { kcal, protein, carbs, fat, tdee: Math.round(tdee), notes };
}
