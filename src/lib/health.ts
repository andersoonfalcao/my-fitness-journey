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
