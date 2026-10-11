import { readCloudOnce, writeCloudMany } from "./cloud-store";
import { sportLabel, stravaKey, type StravaActivity } from "./strava";

/**
 * Cardio started here (stopwatch, plus speed and incline on the treadmill). The same activity is recorded by the band
 * and arrives through Strava, so the two are joined into one record: the Strava activity, which keeps what only the
 * app knows in its `app` field. Until Strava arrives, the cardio waits in its own month document.
 */
export type CardioKind = "caminhada" | "corrida" | "bicicleta" | "esteira" | "eliptico" | "outro";

/** Strava sports each kind can turn out to be (the band sends a treadmill session as a run or a walk). */
export const CARDIO_KINDS: { kind: CardioKind; label: string; sports: string[] }[] = [
  { kind: "caminhada", label: "Caminhada", sports: ["Walk", "Hike"] },
  { kind: "corrida", label: "Corrida", sports: ["Run", "TrailRun", "VirtualRun"] },
  { kind: "bicicleta", label: "Bicicleta", sports: ["Ride", "MountainBikeRide", "GravelRide", "VirtualRide", "EBikeRide"] },
  { kind: "esteira", label: "Esteira", sports: ["Run", "VirtualRun", "Walk"] },
  { kind: "eliptico", label: "Elíptico", sports: ["Elliptical"] },
  { kind: "outro", label: "Outro", sports: [] },
];
const CLAIMED = new Set(CARDIO_KINDS.flatMap((k) => k.sports));

/** Treadmill setting from `atS` seconds into the session until the next change. */
export type TreadmillStep = { atS: number; kmh: number | null; incline: number | null };

export type CardioSession = { kind: CardioKind; name?: string | undefined; startedAt: number; steps?: TreadmillStep[] | undefined };
export type CardioRecord = CardioSession & { id: string; date: string; finishedAt: number };

export const CARDIO_SESSION_KEY = "forma.cardio.session";
/** Cardio that hasn't met its Strava activity yet, one document per month. */
export const cardioKey = (date: string) => `forma.cardio.${date.slice(0, 7)}`;

export const cardioLabel = (c: { kind: CardioKind; name?: string | undefined }) =>
  (c.kind === "outro" && c.name?.trim()) || CARDIO_KINDS.find((k) => k.kind === c.kind)?.label || "Cardio";

export const cardioSeconds = (c: CardioRecord) => Math.max(0, Math.round((c.finishedAt - c.startedAt) / 1000));

/** Time-weighted numbers of a treadmill session; the distance is what the belt covered at the speeds typed. */
export function treadmillStats(steps: TreadmillStep[] | undefined, totalS: number) {
  let speedS = 0, kmhS = 0, inclineS = 0, pctS = 0, maxKmh = 0, maxIncline = 0;
  (steps ?? []).forEach((step, i) => {
    const seconds = Math.max(0, Math.min(steps![i + 1]?.atS ?? totalS, totalS) - step.atS);
    if (step.kmh !== null) { speedS += seconds; kmhS += step.kmh * seconds; maxKmh = Math.max(maxKmh, step.kmh); }
    if (step.incline !== null) { inclineS += seconds; pctS += step.incline * seconds; maxIncline = Math.max(maxIncline, step.incline); }
  });
  return {
    avgKmh: speedS ? kmhS / speedS : null,
    maxKmh: speedS ? maxKmh : null,
    avgIncline: inclineS ? pctS / inclineS : null,
    maxIncline: inclineS ? maxIncline : null,
    distanceM: Math.round(kmhS / 3.6),
  };
}

/** Weight training on Strava is the gym workout as the band recorded it; everything else is cardio. */
export const isCardio = (a: StravaActivity) => a.sport !== "WeightTraining";

/**
 * Cardio done on each date, by name ("Esteira", "Corrida"): Strava activities plus the cardio still waiting for one.
 * A day with cardio counts as a training day even with no gym workout.
 */
export function cardioByDate(strava: StravaActivity[], waiting: CardioRecord[]) {
  const days: Record<string, string[]> = {};
  for (const a of strava) if (isCardio(a)) (days[a.date] ??= []).push(a.app ? cardioLabel(a.app) : sportLabel(a.sport));
  for (const c of waiting) (days[c.date] ??= []).push(cardioLabel(c));
  return days;
}

const JOIN_WINDOW_MS = 15 * 60 * 1000;
const sameKind = (kind: CardioKind, sport: string) =>
  kind === "outro" ? !CLAIMED.has(sport) && sport !== "WeightTraining" : CARDIO_KINDS.find((k) => k.kind === kind)!.sports.includes(sport);
const startGap = (c: CardioRecord, a: StravaActivity) => Math.abs(new Date(a.start).getTime() - c.startedAt);

/**
 * Joins each cardio with the Strava activity of the same kind that started within 15 minutes of it (the closest one,
 * when there are several). Strava's numbers stay as they are; the cardio goes into the activity's `app` field and
 * leaves the waiting list.
 */
export function joinCardio(cardio: CardioRecord[], activities: StravaActivity[]) {
  let next = activities;
  const waiting: CardioRecord[] = [];
  for (const c of [...cardio].sort((a, b) => a.startedAt - b.startedAt)) {
    const match = next
      .filter((a) => !a.app && sameKind(c.kind, a.sport) && startGap(c, a) <= JOIN_WINDOW_MS)
      .sort((a, b) => startGap(c, a) - startGap(c, b))[0];
    if (match) next = next.map((a) => (a === match ? { ...a, app: c } : a));
    else waiting.push(c);
  }
  return { activities: next, waiting, joined: cardio.length - waiting.length };
}

/** Joins the month's waiting cardio with Strava activities already stored (a cardio finished after Strava arrived). */
export async function joinStoredCardio(uid: string, date: string) {
  const [cardio, strava] = await Promise.all([
    readCloudOnce<CardioRecord[]>(uid, cardioKey(date), []),
    readCloudOnce<StravaActivity[]>(uid, stravaKey(date), []),
  ]);
  const { activities, waiting, joined } = joinCardio(cardio, strava);
  if (joined) writeCloudMany(uid, [[stravaKey(date), activities], [cardioKey(date), waiting]]);
  return joined;
}

/** A waiting cardio in the shape of an activity, for the summaries that count Strava activities (day close, week). */
export function cardioAsActivity(c: CardioRecord): StravaActivity {
  const seconds = cardioSeconds(c);
  return {
    id: -c.startedAt,
    name: cardioLabel(c),
    sport: CARDIO_KINDS.find((k) => k.kind === c.kind)?.sports[0] ?? "Workout",
    date: c.date,
    start: new Date(c.startedAt).toISOString(),
    distanceM: treadmillStats(c.steps, seconds).distanceM,
    movingS: seconds,
    elevationM: 0,
    avgHr: null,
    maxHr: null,
    kcal: null,
  };
}
