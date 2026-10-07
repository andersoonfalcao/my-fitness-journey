import { auth } from "./firebase";
import { STRAVA_WORKER } from "./strava";
import { useLocal } from "./store";

/**
 * Data from the iPhone's Health app (the Mi Band reaches it through Mi Fitness). Web apps can't read Health, so an
 * iPhone Shortcut reads it and posts to the Worker (strava-worker/src/health.ts) with a personal key made here; the
 * Worker saves each day in `forma.health.YYYY-MM`. Read-only on the app side.
 */
export type HealthDay = {
  steps?: number; activeKcal?: number; restingHr?: number; vo2max?: number;
  /** Sleep that ended on this day: minutes asleep, first and last moment asleep (ISO). */
  sleepMin?: number; sleepStart?: string; sleepEnd?: string;
  /** When the Shortcut last sent this day (ms). */
  at: number;
};
export type HealthMonth = Record<string, HealthDay>;

export const healthKey = (date: string) => `forma.health.${date.slice(0, 7)}`;
export const HEALTH_INGEST_URL = `${STRAVA_WORKER}/health/ingest`;

/** The day's Health numbers, or null when nothing arrived for it. */
export function useHealthDay(date: string) {
  const [month] = useLocal<HealthMonth>(healthKey(date), {});
  return month[date] ?? null;
}

/** Daily steps goal, set in Configurações → Saúde do iPhone. */
export const STEPS_GOAL_KEY = "forma.stepsgoal";
export const DEFAULT_STEPS_GOAL = 8000;

export type Readiness = { level: "bom" | "normal" | "baixo"; title: string; detail: string };
/** At least this many earlier days with each measure before comparing today with the person's own normal. */
export const READINESS_MIN_DAYS = 5;

/**
 * Today's sleep and resting heart rate against the person's own average of the previous 14 days: a resting rate
 * well above normal or a short night suggests a lighter session. Rules of thumb, not a diagnosis.
 */
export function readiness(day: HealthDay, before: HealthDay[]): Readiness | null {
  const sleeps = before.map((d) => d.sleepMin).filter((n): n is number => n !== undefined);
  const hrs = before.map((d) => d.restingHr).filter((n): n is number => n !== undefined);
  const hasSleep = day.sleepMin !== undefined && sleeps.length >= READINESS_MIN_DAYS;
  const hasHr = day.restingHr !== undefined && hrs.length >= READINESS_MIN_DAYS;
  if (!hasSleep && !hasHr) return null;
  const avgSleep = hasSleep ? sleeps.reduce((s, n) => s + n, 0) / sleeps.length : 0;
  const avgHr = hasHr ? hrs.reduce((s, n) => s + n, 0) / hrs.length : 0;
  const sleepDiff = hasSleep ? day.sleepMin! - avgSleep : 0;
  const hrDiff = hasHr ? day.restingHr! - avgHr : 0;

  const reasons: string[] = [];
  if (hasSleep && (day.sleepMin! < 300 || sleepDiff <= -90)) reasons.push(`dormiu ${sleepLabel(day.sleepMin!)}${sleepDiff <= -30 ? `, ${sleepLabel(Math.round(-sleepDiff))} a menos que a sua média` : ""}`);
  if (hasHr && hrDiff >= 5) reasons.push(`batimento em repouso ${Math.round(hrDiff)} acima do seu normal`);
  if (reasons.length) {
    const text = reasons.join(" e ");
    return { level: "baixo", title: "Recuperação baixa", detail: `${text[0]!.toUpperCase()}${text.slice(1)}: considere um treino mais leve ou mais descanso entre as séries.` };
  }
  if ((!hasHr || hrDiff <= 1) && (!hasSleep || (day.sleepMin! >= 390 && sleepDiff >= -30)))
    return { level: "bom", title: "Recuperado", detail: "Sono e batimento dentro ou melhor que o seu normal: bom dia para puxar carga." };
  return { level: "normal", title: "Recuperação normal", detail: "Nada fora do comum: siga o plano do dia." };
}

export const sleepLabel = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
export const clock = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

async function call<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new Error("Entre na sua conta primeiro.");
  const res = await fetch(`${STRAVA_WORKER}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Não foi possível falar com o servidor.");
  return data;
}

export const healthStatus = () => call<{ hasKey: boolean; createdAt: number | null }>("/health/status");

/** A new personal key for the Shortcut (the previous one stops working). Shown once. */
export const createHealthKey = () => call<{ key: string }>("/health/key", { refreshToken: auth().currentUser?.refreshToken });

export const revokeHealthKey = () => call<{ ok: boolean }>("/health/revoke", {});
