import { useCallback, useEffect, useState } from "react";

const EVT = "forma-store";

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Hydration-safe localStorage state shared across components. */
export function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(readLocal(key, fallback));
    setReady(true);
    const sync = (e: Event) => {
      const k = (e as CustomEvent<string>).detail ?? (e as StorageEvent).key;
      if (k === key) setValue(readLocal(key, fallback));
    };
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readLocal(key, fallback);
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      localStorage.setItem(key, JSON.stringify(v));
      setValue(v);
      window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
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
};

export const KEYS = {
  profile: "forma.profile",
  foods: "forma.foods",
  weights: "forma.weights",
  loads: "forma.loads",
  plan: "forma.plan",
  done: "forma.done",
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function targets(p: Profile) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * p.activity;
  const losing = p.goalWeight < p.weight - 0.5;
  const gaining = p.goalWeight > p.weight + 0.5;
  let kcal = tdee;
  if (p.focus === "perder" || (losing && p.focus !== "massa")) kcal = tdee - 500;
  else if (p.focus === "massa" || gaining) kcal = tdee + 300;
  kcal = Math.round(Math.max(kcal, p.sex === "m" ? 1500 : 1200));
  const protein = Math.round(p.weight * (p.focus === "perder" ? 2.2 : 2));
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, tdee: Math.round(tdee) };
}
