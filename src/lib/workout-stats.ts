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
