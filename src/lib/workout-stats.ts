import { byId, type Exercise, type Group } from "./exercises";
import { repsCount } from "./plan";
import type { WorkoutRecord } from "./store";

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

/** Volume of a whole workout (kg × reps of every set). */
export function recordTotal(record: WorkoutRecord | undefined) {
  return record?.exercises.reduce((sum, e) => sum + volume(e.setKgs, e.setReps, e.reps), 0) ?? 0;
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

/** Heaviest set ever logged for each exercise in these records. */
function bestKgs(records: WorkoutRecord[]) {
  const best = new Map<string, number>();
  for (const r of records) for (const e of r.exercises) {
    const top = Math.max(0, ...(e.setKgs ?? []).map((kg) => kg ?? 0));
    if (top > (best.get(e.exId) ?? 0)) best.set(e.exId, top);
  }
  return best;
}

/** Exercises of `record` whose heaviest set beats every earlier workout (needs an earlier weighted set to compare). */
export function personalRecords(earlier: WorkoutRecord[], record: WorkoutRecord) {
  const before = bestKgs(earlier);
  return record.exercises.flatMap((e) => {
    const top = Math.max(0, ...(e.setKgs ?? []).map((kg) => kg ?? 0));
    const previous = before.get(e.exId);
    return previous && top > previous ? [{ exId: e.exId, name: e.name, kg: top, previousKg: previous }] : [];
  });
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
