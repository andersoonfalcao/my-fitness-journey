import { byId, type Exercise, type Group } from "./exercises";
import { repsCount } from "./plan";
import type { DropSet, WorkoutRecord } from "./store";

export type SetValues = (number | null)[] | undefined;

/** Total weight of an exercise = sum of the weight used in each set (sets without weight count as zero). */
export function sumKg(kgs: SetValues) {
  return (kgs ?? []).reduce<number>((sum, kg) => sum + (kg ?? 0), 0);
}

/** Reps of set `j`: what was typed, else the plan target (null for time-based work such as plank). */
export const repsOfSet = (setReps: SetValues, j: number, reps: string) => setReps?.[j] ?? repsCount(reps);

/** Training volume = Σ weight × reps of each set; time-based work (plank) has no volume. */
export function volume(kgs: SetValues, setReps: SetValues, reps: string) {
  return (kgs ?? []).reduce<number>((sum, kg, j) => sum + (kg ?? 0) * (repsOfSet(setReps, j, reps) ?? 0), 0);
}

/** Volume of the drop sets of an exercise (kg × reps of every drop). */
export function dropVolume(drops: Record<number, DropSet[]> | undefined) {
  return Object.values(drops ?? {}).flat().reduce((sum, d) => sum + (d.kg ?? 0) * d.reps, 0);
}

/** Volume of a whole workout (kg × reps of every set, drop sets included). */
export function recordTotal(record: WorkoutRecord | undefined) {
  return record?.exercises.reduce((sum, e) => sum + volume(e.setKgs, e.setReps, e.reps) + dropVolume(e.setDrops), 0) ?? 0;
}

export function lastRecordBefore(records: WorkoutRecord[], dayName: string) {
  return [...records].reverse().find((r) => r.dayName === dayName);
}

type ExerciseLog = WorkoutRecord["exercises"][number];

/** The exercise's entries in finished workouts that carry weight, newest first. */
function weightedLogs(records: WorkoutRecord[], exId: string): ExerciseLog[] {
  return records.flatMap((r) => r.exercises.filter((e) => e.exId === exId && sumKg(e.setKgs) > 0)).reverse();
}

/** Every planned set done with at least the target reps (sets without typed reps count as on target). */
function hitTarget(e: ExerciseLog) {
  const target = repsCount(e.reps);
  if (target === null || e.setsDone < e.setsPlanned) return false;
  return Array.from({ length: e.setsDone }, (_, j) => repsOfSet(e.setReps, j, e.reps) ?? 0).every((reps) => reps >= target);
}

export type LoadAdvice = {
  kind: "subir" | "manter" | "reduzir";
  /** Short explanation shown under the load field. */
  reason: string;
  /** Suggested weight for set `j` (index into the last session's sets). */
  kgFor: (j: number) => number | undefined;
};

const roundHalf = (kg: number) => Math.round(kg * 2) / 2;

/**
 * Load progression on fixed rep targets: all sets at the target last time → add weight (5 kg on compound
 * leg lifts, 2.5 kg elsewhere); missed the target twice in a row → drop ~10% and build back; otherwise repeat.
 * Time-based work and exercises without logged weight get no advice.
 */
export function loadAdvice(records: WorkoutRecord[], ex: Exercise): LoadAdvice | null {
  const [last, before] = weightedLogs(records, ex.id);
  if (!last || repsCount(last.reps) === null) return null;
  const lastKg = (j: number) => last.setKgs?.[j] ?? [...(last.setKgs ?? [])].reverse().find((kg) => kg !== null) ?? undefined;
  // Reps left in the last set, when told: 0 means the target was hit at the limit, so the load stays.
  const lastRir = [...(last.setRir ?? [])].reverse().find((r) => r !== null && r !== undefined) ?? null;
  if (hitTarget(last) && lastRir === 0) {
    return { kind: "manter", reason: "Você fez todas as repetições, mas no limite (0 sobrando): repita a carga até sobrar fôlego.", kgFor: lastKg };
  }
  if (hitTarget(last)) {
    const step = ex.compound && (ex.group === "quadriceps" || ex.group === "posterior") ? 5 : 2.5;
    const shown = step.toLocaleString("pt-BR");
    return {
      kind: "subir",
      reason: `Na última vez você fez todas as repetições: suba ${shown} kg (ou o próximo peso disponível).`,
      kgFor: (j) => { const kg = lastKg(j); return kg === undefined ? undefined : kg + step; },
    };
  }
  if (before && !hitTarget(before)) {
    return {
      kind: "reduzir",
      reason: "Duas vezes seguidas abaixo das repetições-alvo: reduza ~10% e volte a subir.",
      kgFor: (j) => { const kg = lastKg(j); return kg === undefined ? undefined : roundHalf(kg * 0.9); },
    };
  }
  return { kind: "manter", reason: "Repita a carga até fazer todas as repetições em todas as séries.", kgFor: lastKg };
}

/** Estimates beyond this many reps say little about maximal strength, so those sets are left out. */
const E1RM_MAX_REPS = 12;

/** Estimated one-rep max of a set (Epley: kg × (1 + reps/30)); a single rep is the weight itself. */
export function e1rm(kg: number, reps: number) {
  return reps <= 1 ? kg : kg * (1 + reps / 30);
}

/** The exercise log's best set: heaviest weight, and the set with the highest estimated max (null when not estimable). */
export function bestSets(e: ExerciseLog) {
  let top = 0;
  let best: { kg: number; reps: number; e1rm: number } | null = null;
  (e.setKgs ?? []).forEach((kg, j) => {
    if (!kg) return;
    top = Math.max(top, kg);
    const reps = repsOfSet(e.setReps, j, e.reps);
    if (!reps || reps > E1RM_MAX_REPS) return;
    const est = e1rm(kg, reps);
    if (!best || est > best.e1rm) best = { kg, reps, e1rm: est };
  });
  return { top, best: best as { kg: number; reps: number; e1rm: number } | null };
}

/** Heaviest set and highest estimated max ever logged for each exercise in these records. */
function bests(records: WorkoutRecord[]) {
  const out = new Map<string, { kg: number; e1rm: number }>();
  for (const r of records) for (const e of r.exercises) {
    const { top, best } = bestSets(e);
    const cur = out.get(e.exId) ?? { kg: 0, e1rm: 0 };
    out.set(e.exId, { kg: Math.max(cur.kg, top), e1rm: Math.max(cur.e1rm, best?.e1rm ?? 0) });
  }
  return out;
}

export type PersonalRecord =
  | { kind: "carga"; exId: string; name: string; kg: number; previousKg: number }
  | { kind: "repeticoes"; exId: string; name: string; kg: number; reps: number; e1rm: number; previousE1rm: number };

/**
 * Exercises of `record` that beat every earlier workout (an earlier weighted set is needed to compare): a heavier
 * set ("carga"), or else more reps for the weight, which shows as a higher estimated max ("repeticoes").
 */
export function personalRecords(earlier: WorkoutRecord[], record: WorkoutRecord): PersonalRecord[] {
  const before = bests(earlier);
  return record.exercises.flatMap((e): PersonalRecord[] => {
    const previous = before.get(e.exId);
    if (!previous?.kg) return [];
    const { top, best } = bestSets(e);
    if (top > previous.kg) return [{ kind: "carga", exId: e.exId, name: e.name, kg: top, previousKg: previous.kg }];
    // Rounding keeps a tie (same weight and reps) from counting as a record.
    if (best && previous.e1rm > 0 && Math.round(best.e1rm * 10) > Math.round(previous.e1rm * 10)) {
      return [{ kind: "repeticoes", exId: e.exId, name: e.name, kg: best.kg, reps: best.reps, e1rm: best.e1rm, previousE1rm: previous.e1rm }];
    }
    return [];
  });
}

/** One point per finished workout with this exercise: heaviest weight and estimated max of the day. */
export function strengthHistory(records: WorkoutRecord[], exId: string) {
  return records.flatMap((r) => r.exercises.filter((e) => e.exId === exId).flatMap((e) => {
    const { top, best } = bestSets(e);
    return top > 0 ? [{ date: r.date, kg: top, e1rm: best ? Math.round(best.e1rm * 10) / 10 : null, set: best ? `${best.kg.toLocaleString("pt-BR")} kg × ${best.reps}` : null }] : [];
  }));
}

// ---------- Barbell plates and warm-up

/** Weight of the empty bar, for exercises done with a barbell; null for anything else. */
export function barKg(ex: Exercise): number | null {
  const eq = ex.equipment;
  if (/^Barra W\b/.test(eq)) return 10;
  if (/^Barra hexagonal/.test(eq)) return 25;
  if (/^Barra( e |$)/.test(eq)) return 20;
  return null;
}

/** Plates commonly found in Brazilian gyms, heaviest first. */
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Plates on each side of the bar for `total` kg; `left` is what could not be matched with these plates. */
export function platesPerSide(total: number, bar: number) {
  let side = Math.round(((total - bar) / 2) * 100) / 100;
  if (side <= 0) return { plates: [] as number[], left: 0 };
  const plates: number[] = [];
  for (const p of PLATES) while (side + 1e-9 >= p) { plates.push(p); side = Math.round((side - p) * 100) / 100; }
  return { plates, left: side };
}

/**
 * Warm-up sets before the first working set of a compound lift: lighter sets that rehearse the movement
 * (an empty bar first when there is one). They are not logged. Loads under 20 kg need no warm-up.
 */
export function warmupSets(workKg: number, ex: Exercise) {
  if (!ex.compound || workKg < 20) return [];
  const bar = barKg(ex);
  // Barbell loads round to what plates allow (2.5 kg steps); dumbbells and machines to 2 kg.
  const step = bar ? 2.5 : 2;
  const round = (kg: number) => Math.max(bar ?? step, Math.round(kg / step) * step);
  const sets = [
    ...(bar && workKg >= bar + 20 ? [{ kg: bar, reps: 10 }] : []),
    { kg: round(workKg * 0.5), reps: 8 },
    { kg: round(workKg * 0.7), reps: 5 },
    ...(workKg >= 40 ? [{ kg: round(workKg * 0.85), reps: 2 }] : []),
  ];
  // Drop repeats and anything at or above the working weight.
  return sets.filter((s, i) => s.kg < workKg && sets.findIndex((o) => o.kg === s.kg) === i);
}

// ---------- Muscle recovery

export type Recovery = "cansado" | "recuperando" | "pronto";

/**
 * How rested each muscle trained in the last week is, from the hours since its last session and how many sets it
 * took then: up to 6 sets recover in ~48 h, more in ~72 h (the usual window for muscle protein synthesis and
 * soreness to settle). "cansado" before 2/3 of the window, "recuperando" until it closes, then "pronto".
 */
export function muscleRecovery(records: WorkoutRecord[], now: number): Partial<Record<Group, { state: Recovery; hours: number; sets: number }>> {
  const last: Partial<Record<Group, { at: number; sets: number }>> = {};
  for (const r of records) {
    if (now - r.finishedAt > 7 * 86_400_000 || r.finishedAt > now) continue;
    const sets: Partial<Record<Group, number>> = {};
    for (const e of r.exercises) {
      const group = (byId(e.exId) as Exercise | undefined)?.group;
      if (group && group !== "cardio" && e.setsDone > 0) sets[group] = (sets[group] ?? 0) + e.setsDone;
    }
    for (const [g, n] of Object.entries(sets) as [Group, number][]) {
      if (!last[g] || r.finishedAt > last[g]!.at) last[g] = { at: r.finishedAt, sets: n };
    }
  }
  const out: Partial<Record<Group, { state: Recovery; hours: number; sets: number }>> = {};
  for (const [g, v] of Object.entries(last) as [Group, { at: number; sets: number }][]) {
    const hours = (now - v.at) / 3_600_000;
    const window = v.sets > 6 ? 72 : 48;
    out[g] = { state: hours < window * (2 / 3) ? "cansado" : hours < window ? "recuperando" : "pronto", hours: Math.round(hours), sets: v.sets };
  }
  return out;
}

/** Monday of the week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Completed sets per muscle group in workouts from `from` (inclusive) onwards. */
export function setsByGroup(records: WorkoutRecord[], from: string) {
  const sets: Partial<Record<Group, number>> = {};
  for (const r of records) {
    if (r.date < from) continue;
    for (const e of r.exercises) {
      // Records keep exercises that may since have left the library; those don't count toward a group.
      const group = (byId(e.exId) as Exercise | undefined)?.group;
      if (!group) continue;
      sets[group] = (sets[group] ?? 0) + e.setsDone;
    }
  }
  return sets;
}
