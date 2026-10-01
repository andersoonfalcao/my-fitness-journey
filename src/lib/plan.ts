import { EXERCISES, type Group } from "./exercises";
import type { Profile } from "./store";

export type PlanItem = { exId: string; sets: number; reps: string; rest: number };
export type PlanDay = { name: string; focus: string; items: PlanItem[] };
export type Plan = { createdAt: string; method: string; summary: string; days: PlanDay[] };

type Template = { name: string; focus: string; slots: Group[] };

const FULL_A: Template = { name: "Treino A", focus: "Corpo inteiro", slots: ["quadriceps", "peito", "costas", "ombros", "posterior", "core"] };
const FULL_B: Template = { name: "Treino B", focus: "Corpo inteiro", slots: ["posterior", "costas", "peito", "quadriceps", "biceps", "triceps"] };
const FULL_C: Template = { name: "Treino C", focus: "Corpo inteiro", slots: ["quadriceps", "costas", "peito", "ombros", "biceps", "core"] };
const UPPER: Template = { name: "Superior", focus: "Peito, costas, braços", slots: ["peito", "costas", "peito", "costas", "ombros", "biceps", "triceps"] };
const LOWER: Template = { name: "Inferior", focus: "Pernas e abdômen", slots: ["quadriceps", "posterior", "quadriceps", "posterior", "core"] };
const PUSH: Template = { name: "Empurrar", focus: "Peito, ombros, tríceps", slots: ["peito", "peito", "ombros", "ombros", "triceps", "triceps"] };
const PULL: Template = { name: "Puxar", focus: "Costas e bíceps", slots: ["costas", "costas", "costas", "ombros", "biceps", "biceps"] };
const LEGS: Template = { name: "Pernas", focus: "Quadríceps, posterior, abdômen", slots: ["quadriceps", "posterior", "quadriceps", "posterior", "core", "core"] };

function templatesFor(days: number): { method: string; list: Template[] } {
  if (days <= 2) return { method: "Full body A/B", list: [FULL_A, FULL_B] };
  if (days === 3) return { method: "Full body A/B/C", list: [FULL_A, FULL_B, FULL_C] };
  if (days === 4) return { method: "Superior / Inferior", list: [{ ...UPPER, name: "Superior 1" }, { ...LOWER, name: "Inferior 1" }, { ...UPPER, name: "Superior 2" }, { ...LOWER, name: "Inferior 2" }] };
  if (days === 5) return { method: "Push / Pull / Legs + Superior/Inferior", list: [PUSH, PULL, LEGS, UPPER, LOWER] };
  return { method: "Push / Pull / Legs (2x)", list: [PUSH, PULL, LEGS, { ...PUSH, name: "Empurrar 2" }, { ...PULL, name: "Puxar 2" }, { ...LEGS, name: "Pernas 2" }] };
}

function prescription(p: Profile, compound: boolean, group: Group): Omit<PlanItem, "exId"> {
  if (group === "core") return { sets: 3, reps: p.focus === "condicionamento" ? "45 s" : "30–45 s / 12–15", rest: 45 };
  const beginner = p.level === "iniciante";
  switch (p.focus) {
    case "forca":
      return compound ? { sets: beginner ? 3 : 5, reps: "4–6", rest: 150 } : { sets: 3, reps: "8–10", rest: 90 };
    case "massa":
      return compound ? { sets: beginner ? 3 : 4, reps: "6–10", rest: 120 } : { sets: 3, reps: "10–12", rest: 75 };
    case "perder":
      return compound ? { sets: 3, reps: "10–12", rest: 75 } : { sets: 3, reps: "12–15", rest: 45 };
    default:
      return { sets: 3, reps: "12–15", rest: 40 };
  }
}

export function generatePlan(p: Profile): Plan {
  const { method, list } = templatesFor(p.days);
  const maxItems = p.minutes <= 45 ? 5 : p.minutes <= 60 ? 6 : 7;
  const rotation: Partial<Record<Group, number>> = {};

  const days = list.map((t) => {
    const used = new Set<string>();
    const items = t.slots.slice(0, maxItems).map((g) => {
      const pool = EXERCISES.filter((e) => e.group === g && !(p.level === "iniciante" && e.id === "barra-fixa"));
      // prefer compound first, rotate across days for variety
      const sorted = [...pool].sort((a, b) => Number(b.compound) - Number(a.compound));
      let idx = rotation[g] ?? 0;
      let ex = sorted[idx % sorted.length];
      for (let i = 0; i < sorted.length && used.has(ex.id); i++) ex = sorted[++idx % sorted.length];
      rotation[g] = idx + 1;
      used.add(ex.id);
      return { exId: ex.id, ...prescription(p, ex.compound, g) };
    });
    return { name: t.name, focus: t.focus, items };
  });

  const goal =
    p.focus === "perder" ? "perda de gordura preservando massa muscular"
    : p.focus === "massa" ? "ganho de massa muscular (hipertrofia)"
    : p.focus === "forca" ? "ganho de força"
    : "condicionamento geral";
  const diff = p.goalWeight - p.weight;
  const weeks = Math.ceil(Math.abs(diff) / (diff < 0 ? 0.5 : 0.25));
  const summary = `Método ${method}, ${p.days}x por semana, focado em ${goal}. ${
    Math.abs(diff) >= 0.5 ? `Meta de ${p.goalWeight} kg: ritmo saudável estimado de ~${weeks} semanas.` : "Meta: manter o peso e recompor o corpo."
  } Aumente a carga quando completar o topo da faixa de repetições em todas as séries (progressão dupla).`;

  return { createdAt: new Date().toISOString(), method, summary, days };
}
