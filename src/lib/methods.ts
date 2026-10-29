import { byId, EXERCISES, type Exercise, type Group } from "./exercises";
import { photosFor } from "./exercise-photos";
import type { Plan, PlanDay, PlanItem } from "./plan";
import type { Focus, Level, Profile } from "./store";

/**
 * Training methods. Each one decides how the week is split (which muscles each workout trains) and how sets
 * and reps are prescribed; `recommendMethod` picks one from goal, level and days, and the person can change it.
 */
export type MethodId = "full-body" | "superior-inferior" | "ppl" | "divisao" | "forca-5x5" | "circuito";

/** A slot is a muscle group (the exercise rotates) or a fixed lift (strength methods keep the same main lifts). */
type Slot = Group | { ex: string };
type Template = { name: string; focus: string; slots: Slot[] };

export type Method = {
  id: MethodId;
  name: string;
  /** One line for the picker. */
  description: string;
  /** Supported days per week. */
  minDays: number;
  maxDays: number;
  templates: (days: number) => Template[];
  /** `main` = a fixed main lift of a strength method. */
  prescribe: (p: Profile, ex: Exercise, main: boolean) => Omit<PlanItem, "exId">;
  /** Extra guidance written into the plan summary. */
  note: string;
  circuit?: boolean;
};

// One target per set (no ranges) so weight × reps gives a comparable training volume.
const PLANK_HOLD = "45 s";
export const coreReps = (ex: Exercise) => (ex.pattern === "estabilizar-core" ? PLANK_HOLD : "15");
export const PROGRESSION_NOTE = "Quando fizer todas as repetições em todas as séries, o app sugere subir a carga na vez seguinte.";

// Shorter sessions keep only the first slots (5 up to 45 min, 6 up to 60, else 7), so calves, traps and forearms sit
// within the first five of the workout they belong to: every plan trains them, whatever the time available.
// When a week has a single workout of a kind, that one carries two of them ("_ONLY").
const FULL_A: Template = { name: "Treino A", focus: "Corpo inteiro e panturrilha", slots: ["quadriceps", "peito", "costas", "ombros", "panturrilha", "posterior", "core"] };
const FULL_B: Template = { name: "Treino B", focus: "Corpo inteiro e trapézio", slots: ["posterior", "costas", "peito", "quadriceps", "trapezio", "biceps", "triceps"] };
const FULL_C: Template = { name: "Treino C", focus: "Corpo inteiro e antebraço", slots: ["quadriceps", "costas", "peito", "ombros", "antebraco", "biceps", "core"] };
const FULL_B_ONLY: Template = { name: "Treino B", focus: "Corpo inteiro, trapézio e antebraço", slots: ["posterior", "costas", "peito", "trapezio", "antebraco", "quadriceps", "biceps"] };
const UPPER_1: Template = { name: "Superior 1", focus: "Peito, costas, ombros, trapézio e braços", slots: ["peito", "costas", "ombros", "trapezio", "biceps", "triceps", "peito"] };
const UPPER_2: Template = { name: "Superior 2", focus: "Peito, costas, ombros, antebraço e braços", slots: ["peito", "costas", "ombros", "antebraco", "triceps", "biceps", "costas"] };
const UPPER_ONLY: Template = { name: "Superior 1", focus: "Peito, costas, ombros, trapézio e antebraço", slots: ["peito", "costas", "ombros", "trapezio", "antebraco", "biceps", "triceps"] };
const LOWER: Template = { name: "Inferior", focus: "Pernas, panturrilha e abdômen", slots: ["quadriceps", "posterior", "quadriceps", "posterior", "panturrilha", "core", "core"] };
const PUSH: Template = { name: "Empurrar", focus: "Peito, ombros, tríceps", slots: ["peito", "peito", "ombros", "ombros", "triceps", "triceps", "peito"] };
const PULL: Template = { name: "Puxar", focus: "Costas, trapézio, bíceps e antebraço", slots: ["costas", "costas", "biceps", "trapezio", "antebraco", "ombros", "costas"] };
const LEGS: Template = { name: "Pernas", focus: "Quadríceps, posterior, panturrilha", slots: ["quadriceps", "posterior", "quadriceps", "posterior", "panturrilha", "core", "quadriceps"] };

const SPLIT_A: Template = { name: "A · Peito e tríceps", focus: "Peito e tríceps", slots: ["peito", "peito", "peito", "triceps", "triceps", "peito", "triceps"] };
const SPLIT_B: Template = { name: "B · Costas e bíceps", focus: "Costas, bíceps e antebraço", slots: ["costas", "costas", "biceps", "antebraco", "costas", "biceps", "costas"] };
// With three workouts there is no shoulders day, so traps go with the back.
const SPLIT_B_TRAPS: Template = { name: "B · Costas e bíceps", focus: "Costas, trapézio, bíceps e antebraço", slots: ["costas", "costas", "biceps", "trapezio", "antebraco", "costas", "biceps"] };
const SPLIT_C: Template = { name: "C · Pernas", focus: "Quadríceps, posterior, glúteos e panturrilha", slots: ["quadriceps", "posterior", "quadriceps", "posterior", "panturrilha", "quadriceps", "core"] };
const SPLIT_D: Template = { name: "D · Ombros e abdômen", focus: "Ombros, trapézio e abdômen", slots: ["ombros", "ombros", "ombros", "trapezio", "core", "core", "ombros"] };
const SPLIT_E: Template = { name: "E · Posterior e braços", focus: "Posterior, glúteos, braços e antebraço", slots: ["posterior", "posterior", "biceps", "triceps", "antebraco", "panturrilha", "posterior"] };

const STRENGTH_A: Template = { name: "Força A", focus: "Agachamento, supino e remada", slots: [{ ex: "agachamento" }, { ex: "supino-reto" }, { ex: "remada-curvada" }, "posterior", "panturrilha", "core"] };
const STRENGTH_B: Template = { name: "Força B", focus: "Agachamento, desenvolvimento e levantamento terra", slots: [{ ex: "agachamento" }, { ex: "desenvolvimento-barra" }, { ex: "terra-convencional" }, "trapezio", "core", "costas"] };
const STRENGTH_C: Template = { name: "Força C", focus: "Leg press, supino e puxada", slots: [{ ex: "leg-press" }, { ex: "supino-reto" }, { ex: "puxada" }, "triceps", "antebraco", "core"] };
const STRENGTH_D: Template = { name: "Força D", focus: "Agachamento, desenvolvimento e remada", slots: [{ ex: "agachamento" }, { ex: "desenvolvimento-barra" }, { ex: "remada-baixa" }, "biceps", "core", "panturrilha"] };
// With two workouts a week the forearms go in the second one, in place of the abs it would lose anyway at five exercises.
const STRENGTH_B_ONLY: Template = { ...STRENGTH_B, slots: [{ ex: "agachamento" }, { ex: "desenvolvimento-barra" }, { ex: "terra-convencional" }, "trapezio", "antebraco", "core"] };

// Strength moves alternate with conditioning ones (swing, escalador, corda naval…) to keep the heart rate up.
const CIRCUIT_A: Template = { name: "Circuito A", focus: "Corpo inteiro com condicionamento", slots: ["quadriceps", "peito", "cardio", "costas", "panturrilha", "cardio", "core"] };
const CIRCUIT_B: Template = { name: "Circuito B", focus: "Corpo inteiro com condicionamento", slots: ["posterior", "costas", "cardio", "peito", "trapezio", "cardio", "quadriceps"] };
const CIRCUIT_C: Template = { name: "Circuito C", focus: "Corpo inteiro com condicionamento", slots: ["quadriceps", "costas", "cardio", "ombros", "antebraco", "cardio", "core"] };
const CIRCUIT_B_ONLY: Template = { name: "Circuito B", focus: "Corpo inteiro com condicionamento", slots: ["posterior", "peito", "cardio", "trapezio", "antebraco", "cardio", "costas"] };

const renamed = (t: Template, suffix: string): Template => ({ ...t, name: `${t.name} ${suffix}` });
/** Repeats a base sequence to fill the week; repeats get a number so every workout keeps a unique name. */
function cycle(base: Template[], days: number) {
  return Array.from({ length: days }, (_, i) => (i < base.length ? base[i]! : renamed(base[i % base.length]!, String(Math.floor(i / base.length) + 1))));
}

/** Conditioning moves are done for time (40 s of effort), never counted in reps. */
const CARDIO = { sets: 3, reps: "40 s", rest: 30 };

/** Calves and forearms are small, endurance-heavy muscles: higher reps (or a timed carry) whatever the goal or method. */
function smallMuscle(ex: Exercise): Omit<PlanItem, "exId"> | null {
  if (ex.group !== "panturrilha" && ex.group !== "antebraco") return null;
  return ex.pattern === "carregar" ? { sets: 3, reps: "40 s", rest: 60 } : { sets: 3, reps: "15", rest: 45 };
}

/** The hypertrophy/fat-loss prescription the app has always used, by goal. */
function byGoal(p: Profile, ex: Exercise): Omit<PlanItem, "exId"> {
  if (ex.group === "core") return { sets: 3, reps: coreReps(ex), rest: 45 };
  if (ex.group === "cardio") return CARDIO;
  const small = smallMuscle(ex);
  if (small) return small;
  const beginner = p.level === "iniciante";
  switch (p.focus) {
    case "forca":
      return ex.compound ? { sets: beginner ? 3 : 5, reps: "5", rest: 150 } : { sets: 3, reps: "8", rest: 90 };
    case "massa":
      return ex.compound ? { sets: beginner ? 3 : 4, reps: "8", rest: 120 } : { sets: 3, reps: "12", rest: 75 };
    case "perder":
      return ex.compound ? { sets: 3, reps: "12", rest: 75 } : { sets: 3, reps: "15", rest: 45 };
    default:
      return { sets: 3, reps: "15", rest: 40 };
  }
}

export const METHODS: Record<MethodId, Method> = {
  "full-body": {
    id: "full-body",
    name: "Full body",
    description: "Corpo inteiro em todo treino. Cada músculo é trabalhado várias vezes na semana com pouco volume por sessão.",
    minDays: 2,
    maxDays: 6,
    templates: (days) => cycle(days <= 2 ? [FULL_A, FULL_B_ONLY] : [FULL_A, FULL_B, FULL_C], days),
    prescribe: (p, ex) => byGoal(p, ex),
    note: "Ideal para quem está começando ou treina poucas vezes na semana.",
  },
  "superior-inferior": {
    id: "superior-inferior",
    name: "Superior / Inferior",
    description: "Alterna parte de cima e pernas. Cada músculo treina 2x por semana com mais volume que o full body.",
    minDays: 2,
    maxDays: 6,
    templates: (days) => cycle([days <= 2 ? UPPER_ONLY : UPPER_1, { ...LOWER, name: "Inferior 1" }, UPPER_2, { ...LOWER, name: "Inferior 2" }], days),
    prescribe: (p, ex) => byGoal(p, ex),
    note: "Bom equilíbrio entre frequência e volume para 4 treinos por semana.",
  },
  ppl: {
    id: "ppl",
    name: "Push / Pull / Legs",
    description: "Empurrar (peito, ombro, tríceps), puxar (costas, trapézio, bíceps, antebraço) e pernas com panturrilha. Com 6 dias, cada um se repete 2x.",
    minDays: 3,
    maxDays: 6,
    templates: (days) => cycle([PUSH, PULL, LEGS], days),
    prescribe: (p, ex) => byGoal(p, ex),
    note: "Organiza o volume por movimento; muito usado para hipertrofia.",
  },
  divisao: {
    id: "divisao",
    name: "Divisão por grupo (ABC…)",
    description: "Cada treino foca em um ou dois grupos com bastante volume: A peito e tríceps, B costas e bíceps, C pernas…",
    minDays: 3,
    maxDays: 6,
    templates: (days) => cycle(days === 3 ? [SPLIT_A, SPLIT_B_TRAPS, SPLIT_C] : days === 4 ? [SPLIT_A, SPLIT_B, SPLIT_C, SPLIT_D] : [SPLIT_A, SPLIT_B, SPLIT_C, SPLIT_D, SPLIT_E], days),
    prescribe: (p, ex) => {
      const base = byGoal(p, ex);
      // More sets per exercise make up for training each muscle once a week.
      return ex.group === "core" ? base : { ...base, sets: base.sets + (p.level === "avancado" ? 1 : 0) };
    },
    note: "Para quem já treina há um tempo e quer muito volume por músculo.",
  },
  "forca-5x5": {
    id: "forca-5x5",
    name: "Força 5×5",
    description: "Poucos exercícios básicos e pesados (agachamento, supino, terra, desenvolvimento, remada), sempre os mesmos, subindo a carga.",
    minDays: 2,
    maxDays: 6,
    templates: (days) => cycle(days <= 2 ? [STRENGTH_A, STRENGTH_B_ONLY] : days === 3 ? [STRENGTH_A, STRENGTH_B, STRENGTH_C] : [STRENGTH_A, STRENGTH_B, STRENGTH_C, STRENGTH_D], days),
    prescribe: (p, ex, main) => {
      if (ex.group === "core") return { sets: 3, reps: coreReps(ex), rest: 45 };
      if (main) return { sets: p.level === "iniciante" ? 3 : 5, reps: "5", rest: 180 };
      return smallMuscle(ex) ?? { sets: 3, reps: "8", rest: 90 };
    },
    note: "Progressão linear: os levantamentos principais se repetem para a carga subir toda semana.",
  },
  circuito: {
    id: "circuito",
    name: "Circuito",
    description: "Uma série de cada exercício em sequência, quase sem pausa, e descanso só no fim da volta. Gasta mais energia por minuto.",
    minDays: 2,
    maxDays: 6,
    templates: (days) => cycle(days <= 2 ? [CIRCUIT_A, CIRCUIT_B_ONLY] : [CIRCUIT_A, CIRCUIT_B, CIRCUIT_C], days),
    prescribe: (_p, ex) => (ex.group === "core" ? { sets: 3, reps: coreReps(ex), rest: 30 } : ex.group === "cardio" ? CARDIO : { ...(smallMuscle(ex) ?? { sets: 3, reps: ex.compound ? "12" : "15" }), rest: 30 }),
    note: "Faça a volta inteira (uma série de cada exercício) e descanse no fim; repita as voltas.",
    circuit: true,
  },
};

export const METHOD_LIST = Object.values(METHODS);

export const methodFits = (m: Method, days: number) => days >= m.minDays && days <= m.maxDays;

/** The method the app suggests for this goal, level and number of days, with the reason shown to the person. */
export function recommendMethod(p: Pick<Profile, "focus" | "level" | "days">): { id: MethodId; reason: string } {
  const { focus, level, days } = p;
  const lv: Record<Level, string> = { iniciante: "iniciante", intermediario: "intermediário", avancado: "avançado" };
  const goal: Record<Focus, string> = { perder: "perder gordura", massa: "ganhar massa", forca: "ficar mais forte", condicionamento: "condicionamento" };
  const pick = (id: MethodId) => {
    const m = METHODS[id];
    return methodFits(m, days) ? id : days < m.minDays ? "full-body" : "superior-inferior";
  };
  let id: MethodId;
  if (focus === "forca") id = "forca-5x5";
  else if (focus === "condicionamento") id = "circuito";
  else if (level === "iniciante") id = days <= 3 ? "full-body" : "superior-inferior";
  else if (focus === "massa") id = days <= 2 ? "full-body" : days === 4 ? "superior-inferior" : level === "avancado" && days >= 4 ? "divisao" : "ppl";
  else id = days <= 3 ? "full-body" : days === 4 ? "superior-inferior" : "ppl";
  id = pick(id);
  return { id, reason: `Para ${goal[focus]}, nível ${lv[level]}, ${days}x por semana.` };
}

/** Days a method can generate; outside its range it uses the nearest. */
const daysFor = (m: Method, days: number) => Math.min(m.maxDays, Math.max(m.minDays, days));

const SMALL_MUSCLES: Group[] = ["panturrilha", "trapezio", "antebraco"];

/**
 * A plan made before calves, traps and forearms entered the split, brought up to date without generating it again
 * (the person's swaps and added exercises stay): each workout gets, at the end, the small muscles its kind of
 * workout now has. Workouts are matched by name, since older plans don't record their method. Returns the same
 * plan when nothing is missing.
 */
export function withSmallMuscles(p: Profile, plan: Plan): Plan {
  const m = METHODS[plan.methodId ?? "full-body"];
  const known = METHOD_LIST.flatMap((method) => [2, 3, 4, 5, 6].flatMap((days) => (methodFits(method, days) ? method.templates(days) : [])));
  const inPlan = (g: Group) => plan.days.some((d) => d.items.some((it) => byId(it.exId).group === g));
  const missing = SMALL_MUSCLES.filter((g) => !inPlan(g));
  if (!missing.length) return plan;
  const given: Partial<Record<Group, number>> = {};
  let added = false;
  const days = plan.days.map((d) => {
    // "Puxar 2" is the second "Puxar" of the week; with several templates of one name, the one of this plan's size wins.
    const base = d.name.replace(/ \d+$/, "");
    const template = m.templates(daysFor(m, plan.days.length)).find((t) => t.name === d.name) ?? known.find((t) => t.name === d.name) ?? known.find((t) => t.name === base);
    const wanted = missing.filter((g) => template?.slots.includes(g));
    if (!wanted.length) return d;
    const items = [...d.items];
    for (const g of wanted) {
      const options = EXERCISES.filter((e) => e.group === g && !!photosFor(e.id) && !items.some((it) => it.exId === e.id)).sort((a, b) => Number(b.compound) - Number(a.compound));
      const ex = options[(given[g] ?? 0) % Math.max(1, options.length)];
      if (!ex) continue;
      given[g] = (given[g] ?? 0) + 1;
      items.push({ exId: ex.id, ...m.prescribe(p, ex, false), extra: true });
      added = true;
    }
    return { ...d, items };
  });
  return added ? { ...plan, days } : plan;
}

export function generatePlan(p: Profile, opts: { method?: MethodId | undefined; variation?: number | undefined } = {}): Plan {
  const methodId = opts.method ?? p.method ?? recommendMethod(p).id;
  const m = METHODS[methodId];
  const variation = opts.variation ?? 0;
  const list = m.templates(daysFor(m, p.days));
  const maxItems = p.minutes <= 45 ? 5 : p.minutes <= 60 ? 6 : 7;
  const rotation: Partial<Record<Group, number>> = {};
  const beginnerSkip = (e: Exercise) => p.level === "iniciante" && (e.id === "barra-fixa" || e.id === "agachamento-bulgaro");
  // Standard plans use the original exercises; a variation draws from the whole library, starting further along it.
  // Library exercises without execution photos (only the bird dog today) stay swap-only.
  // The fixed main lifts of a strength method are not repeated as accessories.
  const fixed = new Set(list.flatMap((t) => t.slots.flatMap((s) => (typeof s === "string" ? [] : [s.ex]))));
  const library = (g: Group, all: boolean) =>
    EXERCISES.filter((e) => e.group === g && (all || !e.extra) && !beginnerSkip(e) && !fixed.has(e.id) && (!e.extra || !!photosFor(e.id))).sort((a, b) => Number(b.compound) - Number(a.compound));
  // When a day asks for more exercises of a group than the original ones, the whole library fills in.
  const pool = (g: Group, used: Set<string>) => {
    const own = library(g, variation > 0);
    return own.some((e) => !used.has(e.id)) ? own : library(g, true);
  };

  const days: PlanDay[] = list.map((t) => {
    const used = new Set<string>();
    const items = t.slots.slice(0, Math.max(maxItems, t.slots.filter((s) => typeof s !== "string").length)).map((slot) => {
      if (typeof slot !== "string") {
        const ex = byId(slot.ex);
        used.add(ex.id);
        return { exId: ex.id, ...m.prescribe(p, ex, true) };
      }
      const sorted = pool(slot, used);
      let idx = (rotation[slot] ?? 0) + variation * 3;
      let ex = sorted[idx % sorted.length]!;
      for (let i = 0; i < sorted.length && used.has(ex.id); i++) ex = sorted[++idx % sorted.length]!;
      rotation[slot] = (rotation[slot] ?? 0) + 1;
      used.add(ex.id);
      return { exId: ex.id, ...m.prescribe(p, ex, false) };
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
  const perWeek = daysFor(m, p.days) === p.days ? `${p.days}x por semana` : `${days.length} treinos em sequência (${p.days}x por semana)`;
  const summary = `Método ${m.name}, ${perWeek}, focado em ${goal}. ${m.note} ${
    Math.abs(diff) >= 0.5 ? `Meta de ${p.goalWeight} kg: ritmo saudável estimado de ~${weeks} semanas.` : "Meta: manter o peso e recompor o corpo."
  } ${PROGRESSION_NOTE}`;

  return { createdAt: new Date().toISOString(), method: m.name, methodId, variation, circuit: m.circuit, summary, days };
}

/** Methods that suit each goal, best first: the variations "Novo treino" offers for it. */
const METHODS_FOR: Record<Focus, MethodId[]> = {
  perder: ["full-body", "superior-inferior", "circuito", "ppl"],
  massa: ["ppl", "superior-inferior", "divisao", "full-body"],
  forca: ["forca-5x5", "superior-inferior", "full-body"],
  condicionamento: ["circuito", "full-body", "superior-inferior"],
};

/**
 * Plan variations for a goal: the recommended method first, then the other methods that suit the goal and fit the
 * week's days (up to four). `variation` draws other exercises for all of them. Nothing is saved here.
 */
export function planOptions(p: Profile, variation = 0): Plan[] {
  const rec = recommendMethod(p).id;
  const ids = [...new Set([rec, ...METHODS_FOR[p.focus]])].filter((id) => methodFits(METHODS[id], p.days)).slice(0, 4);
  return ids.map((method) => generatePlan(p, { method, variation }));
}
