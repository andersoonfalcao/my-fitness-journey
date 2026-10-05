import { auth } from "./firebase";
import { readCloudOnce, writeCloud } from "./cloud-store";

// Cloudflare Worker that holds the Strava tokens (strava-worker/). Public client id; the secret stays there.
export const STRAVA_WORKER = "https://forma-strava.newave.workers.dev";
const STRAVA_CLIENT_ID = "284730";

export type StravaActivity = {
  id: number;
  name: string;
  sport: string;
  date: string;
  start: string;
  distanceM: number;
  movingS: number;
  elevationM: number;
  avgHr: number | null;
  maxHr: number | null;
  kcal: number | null;
};

/** Strava activities are kept one document per month, like food logs. */
export const stravaKey = (date: string) => `forma.strava.${date.slice(0, 7)}`;
const SYNC_KEY = "forma.strava.sync";

const SPORTS: Record<string, string> = {
  Run: "Corrida", TrailRun: "Corrida em trilha", VirtualRun: "Corrida indoor", Ride: "Pedal", MountainBikeRide: "Mountain bike",
  GravelRide: "Pedal gravel", VirtualRide: "Pedal indoor", EBikeRide: "Bike elétrica", Walk: "Caminhada", Hike: "Trilha",
  Swim: "Natação", WeightTraining: "Musculação", Workout: "Treino", Yoga: "Yoga", Crossfit: "Crossfit", Elliptical: "Elíptico",
  StairStepper: "Escada", Rowing: "Remo", Soccer: "Futebol", Tennis: "Tênis", Pilates: "Pilates", HighIntensityIntervalTraining: "HIIT",
};
export const sportLabel = (sport: string) => SPORTS[sport] ?? sport;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new Error("Entre na sua conta para usar o Strava.");
  const res = await fetch(`${STRAVA_WORKER}${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Não foi possível falar com o Strava agora. Tente de novo.");
  return (await res.json()) as T;
}

/** Sends the user to Strava to authorize read access; Strava returns to /strava with a code. */
export function startStravaConnect() {
  const state = Math.random().toString(36).slice(2);
  sessionStorage.setItem("forma.strava.state", state);
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: `${window.location.origin}/strava`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  });
  window.location.href = `https://www.strava.com/oauth/authorize?${params}`;
}

export async function finishStravaConnect(code: string, state: string | null) {
  if (state !== sessionStorage.getItem("forma.strava.state")) throw new Error("A conexão com o Strava expirou. Tente conectar de novo.");
  sessionStorage.removeItem("forma.strava.state");
  return call<{ connected: boolean; athlete: { name: string } }>("/connect", { method: "POST", body: JSON.stringify({ code }) });
}

export type StravaDetail = {
  id: number; name: string; sport: string; start: string; startLocal: string; description: string | null;
  distanceM: number; movingS: number; elapsedS: number; elevationM: number;
  avgSpeed: number | null; maxSpeed: number | null; avgHr: number | null; maxHr: number | null;
  avgCadence: number | null; avgWatts: number | null; kcal: number | null; sufferScore: number | null;
  prCount: number; achievements: number; kudos: number; device: string | null; polyline: string | null;
  splits: { km: number; distanceM: number; movingS: number; avgSpeed: number; avgHr: number | null; elevationM: number }[];
};

/**
 * Full details of one activity (fetched on demand: the synced list only has the summary). When Strava
 * reports exact calories, the stored activity is updated so the day close uses the better number.
 */
export async function stravaActivityDetail(uid: string, activity: StravaActivity): Promise<StravaDetail | null> {
  const { connected, activity: detail } = await call<{ connected: boolean; activity?: StravaDetail }>(`/activity?id=${activity.id}`);
  if (!connected || !detail) return null;
  if (detail.kcal !== null && detail.kcal !== activity.kcal) {
    const key = stravaKey(activity.date);
    const list = await readCloudOnce<StravaActivity[]>(uid, key, []);
    writeCloud(uid, key, list.map((a) => (a.id === activity.id ? { ...a, kcal: detail.kcal } : a)));
  }
  return detail;
}

/** Sports measured by pace (min/km) rather than speed (km/h). */
export const usesPace = (sport: string) => /Run|Walk|Hike|Swim/.test(sport);
export const pace = (secondsPerKm: number) => {
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} /km`;
};

/** Decodes a Google encoded polyline (Strava map) into [lat, lng] points. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export const stravaStatus = () => call<{ connected: boolean; athlete?: { name: string } }>("/status");
export const disconnectStrava = () => call<{ connected: boolean }>("/disconnect", { method: "POST" });

/**
 * Pulls activities newer than the last sync into the account (monthly documents), at most every 15 minutes
 * unless forced. Returns how many new activities arrived, or null when Strava isn't connected.
 */
export async function syncStrava(uid: string, force = false): Promise<number | null> {
  const sync = await readCloudOnce<{ after: number; at: number } | null>(uid, SYNC_KEY, null);
  if (!force && sync && Date.now() - sync.at < 15 * 60 * 1000) return 0;
  // First sync brings the last 60 days.
  const after = sync?.after ?? Math.floor(Date.now() / 1000) - 60 * 86400;
  const { connected, activities } = await call<{ connected: boolean; activities: StravaActivity[] }>(`/activities?after=${after}`);
  if (!connected) return null;
  const byMonth = new Map<string, StravaActivity[]>();
  for (const a of activities) byMonth.set(stravaKey(a.date), [...(byMonth.get(stravaKey(a.date)) ?? []), a]);
  let added = 0;
  for (const [key, list] of byMonth) {
    const current = await readCloudOnce<StravaActivity[]>(uid, key, []);
    const known = new Set(current.map((a) => a.id));
    const fresh = list.filter((a) => !known.has(a.id));
    added += fresh.length;
    if (fresh.length) writeCloud(uid, key, [...current, ...fresh].sort((a, b) => a.start.localeCompare(b.start)));
  }
  const newest = activities.reduce((max, a) => Math.max(max, Math.floor(new Date(a.start).getTime() / 1000)), after);
  writeCloud(uid, SYNC_KEY, { after: newest, at: Date.now() });
  return added;
}

export const km = (m: number) => (m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export const duration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
};
