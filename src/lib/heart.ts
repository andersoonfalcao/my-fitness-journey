import type { HealthMonth } from "./health";
import { addDays } from "./insights";

/** Maximum heart rate by age (Tanaka, Monahan & Seals 2001: 208 − 0.7 × age), closer than 220 − age past 30. */
export const hrMax = (age: number) => Math.round(208 - 0.7 * age);

/** Resting heart rate when the band hasn't sent any: a common adult value, flagged as an estimate on screen. */
export const DEFAULT_RESTING_HR = 70;

/** Average resting heart rate of the last 7 days with a reading (the band's), or null. */
export function restingAverage(health: HealthMonth, today: string) {
  const values = Array.from({ length: 7 }, (_, i) => health[addDays(today, -i)]?.restingHr).filter((n): n is number => n !== undefined);
  return values.length ? Math.round(values.reduce((s, n) => s + n, 0) / values.length) : null;
}

/** Heart rate at a share of the heart rate reserve (Karvonen): rest + pct × (max − rest). */
export const karvonen = (rest: number, max: number, pct: number) => Math.round(rest + pct * (max - rest));

/** The five usual training zones as shares of the reserve. */
export const ZONES = [
  { n: 1, name: "Leve", from: 0.5, to: 0.6 },
  { n: 2, name: "Aeróbico", from: 0.6, to: 0.7 },
  { n: 3, name: "Moderado", from: 0.7, to: 0.8 },
  { n: 4, name: "Forte", from: 0.8, to: 0.9 },
  { n: 5, name: "Máximo", from: 0.9, to: 1 },
] as const;

/** Target band for steady cardio: 55–70% of the reserve, the moderate range that builds the aerobic base. */
export const cardioZone = (rest: number, max: number) => ({ low: karvonen(rest, max, 0.55), high: karvonen(rest, max, 0.7) });

/** VO2 max estimated from the heart rates (Uth et al. 2004: 15.3 × max ÷ rest), in ml/kg/min. */
export const vo2Estimate = (max: number, rest: number) => Math.round((15.3 * max) / rest * 10) / 10;
