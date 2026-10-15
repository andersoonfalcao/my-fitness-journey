import { DEFAULT_RESTING_HR, hrMax } from "./heart";
import type { HealthDay, Readiness } from "./health";
import { isGymCopy, sportLabel, type StravaActivity } from "./strava";
import type { WorkoutRecord } from "./store";

/**
 * Esforço do dia (0 to 21, the scale Whoop made familiar): the day's cardiovascular load. Each session counts as
 * Banister's TRIMP (minutes × heart-rate reserve × 0.64·e^(1.92 × reserve)) with its average heart rate from Strava;
 * a session without heart rate is taken at half the reserve (gym) or 60% (cardio). Steps outside training add a light
 * load. The sum goes through 21 × (1 − e^(−load / 70)), so it grows fast at first and flattens near the top:
 * a 60-minute gym session plus 5,000 steps lands near 12, a rest day with a walk near 3.
 */
export type StrainPart = { label: string; minutes: number; avgHr: number | null };
export type Strain = { score: number; zone: StrainZone; parts: StrainPart[]; steps: number | null; aim: { max: number; text: string } | null };
export type StrainZone = "leve" | "moderado" | "alto" | "máximo";

export const STRAIN_MAX = 21;
const SCALE = 70;
/** Load per 1,000 steps: a brisk walk sits near a quarter of the reserve. */
const PER_1000_STEPS = 2;

export const strainZone = (s: number): StrainZone => (s < 10 ? "leve" : s < 14 ? "moderado" : s < 18 ? "alto" : "máximo");
/** Zone widths on the 0–21 bar, in the order above. */
export const STRAIN_ZONES: [StrainZone, number][] = [["leve", 10], ["moderado", 4], ["alto", 4], ["máximo", 3]];

const trimp = (minutes: number, reserve: number) => minutes * reserve * 0.64 * Math.exp(1.92 * reserve);

export function dayStrain({ day, date, age, restingAvg, strava, history, ready }: {
  day: HealthDay; date: string; age: number; restingAvg: number | null;
  strava: StravaActivity[]; history: WorkoutRecord[]; ready: Readiness | null;
}): Strain | null {
  const rest = day.restingHr ?? restingAvg ?? DEFAULT_RESTING_HR;
  const max = hrMax(age);
  const reserveOf = (hr: number | null, fallback: number) => (hr && max > rest ? Math.min(1, Math.max(0, (hr - rest) / (max - rest))) : fallback);
  const parts: StrainPart[] = [];
  let load = 0;

  const todays = strava.filter((a) => a.date === date);
  const workouts = history.filter((r) => r.date === date);
  for (const a of todays) {
    const minutes = Math.round(a.movingS / 60);
    if (!minutes) continue;
    const gym = a.sport === "WeightTraining";
    load += trimp(minutes, reserveOf(a.avgHr, gym ? 0.5 : 0.6));
    // Weight training the band recorded on a workout day is that workout: it goes under the workout's name.
    const label = gym && isGymCopy(a, workouts) ? workouts.map((r) => r.dayName).join(" + ") : a.app ? a.name : sportLabel(a.sport);
    parts.push({ label, minutes, avgHr: a.avgHr });
  }
  // Gym workouts the band didn't record count by their duration.
  if (!todays.some((a) => a.sport === "WeightTraining")) {
    for (const r of workouts) {
      const minutes = Math.round((r.durationMs ?? 0) / 60000);
      if (!minutes) continue;
      load += trimp(minutes, 0.5);
      parts.push({ label: r.dayName, minutes, avgHr: null });
    }
  }
  const steps = day.steps ?? null;
  if (steps) load += (steps / 1000) * PER_1000_STEPS;
  if (!load) return null;

  const score = Math.round(STRAIN_MAX * (1 - Math.exp(-load / SCALE)) * 10) / 10;
  // How far today should go, by how recovered the body is.
  const aim = !ready ? null
    : ready.level === "baixo" ? { max: 10, text: "Com a recuperação baixa de hoje, até 10 seria o ideal." }
    : ready.level === "bom" ? { max: 18, text: "Bem recuperado: dá para ir até 14 a 18 hoje." }
    : { max: 14, text: "Recuperação normal: entre 10 e 14 é um bom dia." };
  return { score, zone: strainZone(score), parts, steps, aim };
}
