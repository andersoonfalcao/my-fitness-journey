import { byId, type Exercise } from "./exercises";
import type { Profile } from "./store";
import { coreReps, METHODS, PROGRESSION_NOTE, type MethodId } from "./methods";

export type PlanItem = { exId: string; sets: number; reps: string; rest: number };
export type PlanDay = { name: string; focus: string; items: PlanItem[] };
export type Plan = {
  createdAt: string;
  /** Method name as shown; plans made before the method catalog only have this. */
  method: string;
  summary: string;
  days: PlanDay[];
  methodId?: MethodId | undefined;
  /** 0 = the standard exercises; each "trocar os exercícios" picks another set from the whole library. */
  variation?: number | undefined;
  /** Circuit plans go through one set of each exercise in turn and rest at the end of the round. */
  circuit?: boolean | undefined;
};

/** Reps target for an exercise swapped into a plan, following the plan's method. */
export const repsFor = (p: Profile, ex: Exercise, plan?: Plan) => METHODS[plan?.methodId ?? "full-body"].prescribe(p, ex, false).reps;

// Ranges used by plans generated before single targets; each maps to the value the new prescription gives.
const LEGACY_RANGES: Record<string, string> = { "4–6": "5", "8–10": "8", "6–10": "8", "10–12": "12", "12–15": "15" };

/** Repetitions per set, or null for time-based work (e.g. plank). */
export function repsCount(reps: string): number | null {
  const value = Number(LEGACY_RANGES[reps] ?? reps);
  return Number.isInteger(value) && value > 0 ? value : null;
}

const OLD_PROGRESSION_NOTE = "Aumente a carga quando completar o topo da faixa de repetições em todas as séries (progressão dupla).";

/**
 * Converts a saved plan with rep ranges to single targets and refreshes the old progression note;
 * returns the same object when nothing changes.
 */
export function normalizePlan(plan: Plan): Plan {
  let changed = plan.summary.includes(OLD_PROGRESSION_NOTE);
  const summary = plan.summary.replace(OLD_PROGRESSION_NOTE, PROGRESSION_NOTE);
  const days = plan.days.map((d) => ({
    ...d,
    items: d.items.map((it) => {
      const ex = byId(it.exId);
      const reps = LEGACY_RANGES[it.reps] ?? (it.reps.includes("–") && ex.group === "core" ? coreReps(ex) : it.reps);
      if (reps === it.reps) return it;
      changed = true;
      return { ...it, reps };
    }),
  }));
  return changed ? { ...plan, summary, days } : plan;
}

export { generatePlan } from "./methods";

/**
 * Index of the next workout: the plan days follow each other in order. `cycleStart` is how many workouts
 * were done when the user last chose "start again from the first workout" (0 if never).
 */
export function nextWorkoutIndex(doneCount: number, cycleStart: number, days: number) {
  return days ? (((doneCount - cycleStart) % days) + days) % days : 0;
}
