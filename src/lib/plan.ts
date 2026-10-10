import { byId, type Exercise } from "./exercises";
import type { Profile } from "./store";
import { coreReps, METHODS, PROGRESSION_NOTE, type MethodId } from "./methods";

/**
 * `extra`: added by hand to the workout (after the ones the method chose), so it can be taken out again.
 * `combo`: exercises of a day sharing this id are done one after the other with no rest (bi-set, tri-set);
 * the rest comes when the round ends. They are kept next to each other in the day.
 */
export type PlanItem = { exId: string; sets: number; reps: string; rest: number; extra?: boolean | undefined; combo?: string | undefined };

/** A combined block needs two exercises: one left alone (its pair was removed) goes back to a normal exercise. */
export function tidyCombos(items: PlanItem[]): PlanItem[] {
  const size = new Map<string, number>();
  for (const it of items) if (it.combo) size.set(it.combo, (size.get(it.combo) ?? 0) + 1);
  return items.map((it) => {
    if (!it.combo || size.get(it.combo)! > 1) return it;
    const { combo: _alone, ...rest } = it;
    return rest;
  });
}

export const comboName = (count: number) => (count === 2 ? "Bi-set" : count === 3 ? "Tri-set" : "Combinado");

/** The combined block exercise `j` belongs to: its members in order and a name ("Bi-set", "Tri-set B"…). */
export function comboOf(items: PlanItem[], j: number) {
  const id = items[j]?.combo;
  if (!id) return null;
  const members = items.flatMap((it, k) => (it.combo === id ? [k] : []));
  if (members.length < 2) return null;
  const ids = [...new Set(items.flatMap((it) => (it.combo ? [it.combo] : [])))];
  const letter = ids.length > 1 ? ` ${String.fromCharCode(65 + ids.indexOf(id))}` : "";
  return { id, members, label: `${comboName(members.length)}${letter}`, position: members.indexOf(j) + 1 };
}

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

/** Sets, reps and rest the plan's method gives an exercise added by hand (as an accessory, never a main lift). */
export const prescribeFor = (p: Profile, ex: Exercise, plan?: Plan) => METHODS[plan?.methodId ?? "full-body"].prescribe(p, ex, false);

/** Reps target for an exercise swapped into a plan, following the plan's method. */
export const repsFor = (p: Profile, ex: Exercise, plan?: Plan) => METHODS[plan?.methodId ?? "full-body"].prescribe(p, ex, false).reps;

// Ranges used by plans generated before single targets; each maps to the value the new prescription gives.
const LEGACY_RANGES: Record<string, string> = { "4–6": "5", "8–10": "8", "6–10": "8", "10–12": "12", "12–15": "15" };

/** Repetitions per set, or null for time-based work (e.g. plank). */
export function repsCount(reps: string): number | null {
  const value = Number(LEGACY_RANGES[reps] ?? reps);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** Seconds of a time-based target such as "45 s" or "1 min"; null for a rep target. */
export function holdSeconds(reps: string): number | null {
  const match = /^(\d+)\s*(s|seg|min)\b/i.exec(reps.trim());
  return match ? Number(match[1]) * (match[2]!.toLowerCase() === "min" ? 60 : 1) : null;
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

export { generatePlan, withSmallMuscles } from "./methods";

/**
 * Index of the next workout: the plan days follow each other in order. `cycleStart` is how many workouts
 * were done when the user last chose "start again from the first workout" (0 if never).
 */
export function nextWorkoutIndex(doneCount: number, cycleStart: number, days: number) {
  return days ? (((doneCount - cycleStart) % days) + days) % days : 0;
}
