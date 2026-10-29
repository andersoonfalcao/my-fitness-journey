import { BEST_MODELS, generateJson, Schema } from "./ai";
import { byId, EXERCISES, GROUP_LABEL } from "./exercises";
import { photosFor } from "./exercise-photos";
import { METHODS, PROGRESSION_NOTE, type MethodId } from "./methods";
import { holdSeconds, repsCount, type Plan, type PlanDay } from "./plan";
import type { Profile } from "./store";

const METHOD_IDS = Object.keys(METHODS) as MethodId[];

// Same rule as generatePlan: library entries without execution photos stay out of generated plans.
const CATALOG = EXERCISES.filter((e) => !e.extra || !!photosFor(e.id))
  .map((e) => `${e.id} | ${e.name} | ${GROUP_LABEL[e.group]} | ${e.equipment} | ${e.compound ? "composto" : "isolado"}`)
  .join("\n");

const SYSTEM = `Você é um treinador de musculação brasileiro, com formação em educação física, que monta treinos baseados em evidência.
A pessoa descreve um objetivo de treino com as palavras dela. Analise o objetivo junto com o perfil e monte 3 VARIAÇÕES de plano
semanal diferentes entre si (outra divisão, outro método ou outra seleção de exercícios), todas adequadas ao objetivo.
Regras:
- Use SOMENTE exercícios do catálogo, pelo id exato (primeira coluna). Não invente ids.
- Cada plano tem exatamente o número de treinos por semana do perfil, salvo se o objetivo pedir menos.
- Respeite o tempo por treino: até 45 min → 5 exercícios; até 60 min → 6; mais que isso → até 7.
- Não repita um exercício no mesmo treino. Respeite lesões, dores ou limitações citadas (troque ou evite o movimento).
- Para iniciantes evite movimentos muito técnicos (barra fixa, búlgaro, terra pesado) no começo.
- reps é um número único ("8", "12") ou um tempo ("40 s", "45 s") para prancha, carregamentos e exercícios de condicionamento.
- rest em segundos (30 a 180). sets entre 2 e 5.
- methodId é o método do catálogo mais parecido com a variação: ${METHOD_IDS.join(", ")}.
- name do treino é curto ("Treino A", "Superior 1", "Pernas"); focus resume os músculos.
- title é um nome curto para a variação; why explica em 1 ou 2 frases por que ela atende o objetivo.
- analysis resume em 2 ou 3 frases como você entendeu o objetivo e o que priorizou.
Escreva tudo em português do Brasil.

Catálogo (id | nome | grupo | equipamento | tipo):
${CATALOG}`;

const SCHEMA = Schema.object({
  properties: {
    analysis: Schema.string(),
    options: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          why: Schema.string(),
          methodId: Schema.enumString({ enum: METHOD_IDS }),
          days: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string(),
                focus: Schema.string(),
                items: Schema.array({
                  items: Schema.object({ properties: { exId: Schema.string(), sets: Schema.integer(), reps: Schema.string(), rest: Schema.integer() } }),
                }),
              },
            }),
          }),
        },
      }),
    }),
  },
});

const LEVEL: Record<Profile["level"], string> = { iniciante: "iniciante (< 6 meses)", intermediario: "intermediário", avancado: "avançado (> 3 anos)" };

export type AiPlans = { analysis: string; plans: Plan[] };

/** Asks the AI for plan variations for an objective written by the person. Nothing is saved here. */
export async function suggestPlans(goal: string, p: Profile, current: Plan | null): Promise<AiPlans> {
  const prompt = [
    `Objetivo: ${goal.trim()}`,
    `Perfil: ${p.sex === "f" ? "mulher" : "homem"}, ${p.age} anos, ${p.height} cm, ${p.weight} kg (meta ${p.goalWeight} kg), nível ${LEVEL[p.level]}, ${p.days} treinos por semana, ${p.minutes} min por treino.`,
    current ? `Plano atual: ${current.method} — ${current.days.map((d) => d.name).join(", ")}.` : "Ainda não tem plano.",
  ].join("\n");
  const result = (await generateJson(SYSTEM, SCHEMA, prompt, { models: BEST_MODELS, timeoutMs: 90_000 })) as { analysis?: unknown; options?: unknown };
  const options = Array.isArray(result.options) ? result.options : [];
  const plans = options.flatMap((o: Record<string, unknown>) => {
    const plan = toPlan(o, p, goal.trim(), current?.variation);
    return plan ? [plan] : [];
  });
  if (!plans.length) throw new Error("A IA não conseguiu montar um treino com esse objetivo. Tente descrever de outro jeito.");
  return { analysis: String(result.analysis ?? ""), plans };
}

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Checks one AI option against the library: unknown exercises and repeats are dropped, numbers kept in range. */
function toPlan(o: Record<string, unknown>, p: Profile, goal: string, variation: number | undefined): Plan | null {
  const methodId = METHOD_IDS.includes(o["methodId"] as MethodId) ? (o["methodId"] as MethodId) : "full-body";
  const m = METHODS[methodId];
  const known = new Set(EXERCISES.map((e) => e.id));
  const names = new Set<string>();
  const days: PlanDay[] = (Array.isArray(o["days"]) ? o["days"] : []).flatMap((d: Record<string, unknown>, i: number) => {
    const used = new Set<string>();
    const items = (Array.isArray(d["items"]) ? d["items"] : []).flatMap((it: Record<string, unknown>) => {
      const id = String(it["exId"] ?? "").trim();
      if (!known.has(id) || used.has(id)) return [];
      used.add(id);
      const ex = byId(id);
      const usual = m.prescribe(p, ex, false);
      const raw = String(it["reps"] ?? "").trim();
      const reps = repsCount(raw) || holdSeconds(raw) ? raw : usual.reps;
      return [{ exId: id, sets: clamp(it["sets"], 1, 6, usual.sets), reps, rest: clamp(it["rest"], 15, 300, usual.rest) }];
    });
    if (!items.length) return [];
    // Workout names must be unique: the sequence and the history tell them apart by name.
    const base = String(d["name"] ?? "").trim() || `Treino ${String.fromCharCode(65 + i)}`;
    let name = base;
    for (let n = 2; names.has(name); n++) name = `${base} ${n}`;
    names.add(name);
    return [{ name, focus: String(d["focus"] ?? "").trim(), items }];
  });
  if (!days.length) return null;
  const why = String(o["why"] ?? "").trim();
  return {
    createdAt: new Date().toISOString(),
    method: String(o["title"] ?? "").trim() || m.name,
    methodId,
    variation,
    circuit: m.circuit,
    summary: `${why ? `${why} ` : ""}Montado pela IA a partir do seu objetivo, com base no método ${m.name}. ${PROGRESSION_NOTE}`,
    goal,
    ai: true,
    days,
  };
}
