import { BEST_MODELS, generateJson, Schema } from "./ai";
import { foodsKey, readCloudOnce, waterKey } from "./cloud-store";
import { dayNumbers } from "./day-close";
import { byId, GROUP_LABEL } from "./exercises";
import { healthKey, readiness, type HealthMonth } from "./health";
import { addDays, overreach, readSleep, readWeight } from "./insights";
import { nextWorkoutIndex, type Plan } from "./plan";
import { stravaKey, sportLabel, type StravaActivity } from "./strava";
import { cardioAsActivity, cardioKey, type CardioRecord } from "./cardio";
import { FEEL_LABEL, mealSlot, targets, type FoodEntry, type Profile, type WaterLog, type WeightEntry, type WorkoutRecord } from "./store";
import { weekStart, weekStats } from "./week";
import { recordTotal } from "./workout-stats";

/**
 * "Pergunte ao forma": a chat that answers from the person's own numbers. The app computes everything (last 14 days
 * one by one, the last four weeks, trends, when each muscle was last trained, the next workout); Gemini only reads it
 * and writes the answer. One question = one call against the same free daily quota as the other AI features.
 */
export const CHAT_KEY = "forma.chat";
export type ChatMessage = { role: "eu" | "forma"; text: string; at: number };
/** Kept on the account; older messages fall off. */
export const CHAT_KEEP = 40;
/** Messages that go back to the AI as the conversation so far. */
const CONTEXT_MESSAGES = 6;

export const STARTERS = ["Por que meu peso parou?", "Posso treinar perna hoje?", "Como está minha proteína?", "O que melhorar na próxima semana?"];

const SYSTEM = `Você é o assistente do forma, um app de treino e alimentação, conversando com o aluno sobre os dados DELE.
Responda em português do Brasil, em tom próximo e direto, em 2 a 5 frases curtas (no máximo 120 palavras). Separe ideias em parágrafos com uma linha em branco quando ajudar. Não use markdown, asteriscos, títulos nem listas com símbolos.
Use SOMENTE os números recebidos em "dados"; nunca invente valores. Se a pergunta pedir algo que não está nos dados, diga o que falta registrar. Números no formato brasileiro (80,45 kg; 2.065 kcal; 6h39).
Quando a pergunta for sobre treinar hoje ou amanhã, use musculoUltimoTreino (data em que cada músculo foi treinado; cerca de 48 h de recuperação depois de até 6 séries, 72 h depois de mais), proximoTreino, prontidao e sinalDeCansaco.
Sobre peso, use tendencias (pesoKgPorSemana negativo = perdendo; pesoParado = duas semanas sem mudar mesmo em déficit) e as médias semanais: compare semanas, não dias soltos, porque o peso oscila de um dia para o outro.
Treinos no Strava com sport "Musculação" no mesmo dia de um treino do app são o mesmo treino gravado pela pulseira, não um treino a mais.
Não dê diagnóstico médico nem recomende remédios. Para dor, lesão ou sintomas, sugira procurar um profissional.
Responda só à última pergunta; a conversa anterior é contexto.`;

const SCHEMA = Schema.object({ properties: { resposta: Schema.string() } });

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Inputs = {
  uid: string; date: string; profile: Profile; weights: WeightEntry[]; history: WorkoutRecord[];
  plan: Plan | null; doneCount: number; cycleStart: number;
};

/** Everything the answer may use, computed here. */
export async function chatData({ uid, date, profile, weights, history, plan, doneCount, cycleStart }: Inputs) {
  const from = addDays(date, -34);
  const months = [...new Set([from, addDays(date, -17), date].map((d) => d.slice(0, 7)))].map((m) => `${m}-01`);
  const [foodM, waterM, stravaM, healthM, cardioM, numbers] = await Promise.all([
    Promise.all(months.map((m) => readCloudOnce<FoodEntry[]>(uid, foodsKey(m), []))),
    Promise.all(months.map((m) => readCloudOnce<WaterLog>(uid, waterKey(m), {}))),
    Promise.all(months.map((m) => readCloudOnce<StravaActivity[]>(uid, stravaKey(m), []))),
    Promise.all(months.map((m) => readCloudOnce<HealthMonth>(uid, healthKey(m), {}))),
    Promise.all(months.map((m) => readCloudOnce<CardioRecord[]>(uid, cardioKey(m), []))),
    dayNumbers({ uid, date, profile, weights, history }),
  ]);
  const foods = foodM.flat();
  const water: WaterLog = Object.assign({}, ...waterM);
  const strava = [...stravaM.flat(), ...cardioM.flat().map(cardioAsActivity)];
  const health: HealthMonth = Object.assign({}, ...healthM);
  const t = targets(profile, date);
  const tWeek = targets(profile);

  const dias = Array.from({ length: 14 }, (_, i) => addDays(date, -i)).map((d) => {
    const day = foods.filter((f) => f.date === d);
    const h = health[d];
    const w = history.filter((r) => r.date === d);
    return {
      data: d,
      kcal: day.length ? Math.round(day.reduce((s, f) => s + f.kcal, 0)) : null,
      proteina: day.length ? Math.round(day.reduce((s, f) => s + f.p, 0)) : null,
      refeicoes: new Set(day.map(mealSlot).filter(Boolean)).size,
      aguaMl: water[d] ?? null,
      peso: weights.find((x) => x.date === d)?.kg ?? null,
      treino: w.map((r) => ({ nome: r.dayName, cargaKg: Math.round(recordTotal(r)), minutos: r.durationMs ? Math.round(r.durationMs / 60000) : null, sensacao: r.feel ? FEEL_LABEL[r.feel] : null })),
      strava: strava.filter((a) => a.date === d).map((a) => ({ sport: sportLabel(a.sport), minutos: Math.round(a.movingS / 60), km: Math.round(a.distanceM / 100) / 10, fcMedia: a.avgHr ?? null })),
      sonoMin: h?.sleepMin ?? null, passos: h?.steps ?? null, repousoBpm: h?.restingHr ?? null,
    };
  });

  const inputs = { foods, water, weights, history, strava, health, targets: { kcal: tWeek.kcal, waterMl: tWeek.waterMl } };
  const semanas = [0, 1, 2, 3].map((k) => {
    const start = addDays(weekStart(date), -7 * k);
    const s = weekStats(start, date, inputs);
    return { inicio: s.start, fim: s.end, pesoMedio: s.weightAvg, kcalMedia: s.kcalAvg, proteinaMedia: s.proteinAvg, diasNaMeta: s.kcalOnTarget, treinos: s.workouts, cargaKg: s.volumeKg, sonoMedioMin: s.sleepAvg, passosMedia: s.stepsAvg, repousoMedio: s.restingAvg };
  });

  const lastByGroup: Record<string, string> = {};
  for (const r of history) for (const e of r.exercises) {
    if (!e.setsDone) continue;
    const g = byId(e.exId)?.group;
    if (g && g !== "cardio" && (lastByGroup[GROUP_LABEL[g]] ?? "") < r.date) lastByGroup[GROUP_LABEL[g]] = r.date;
  }
  const next = plan?.days[nextWorkoutIndex(doneCount, cycleStart, plan.days.length)] ?? null;
  const before = Array.from({ length: 14 }, (_, i) => health[addDays(date, -1 - i)]).filter((h): h is NonNullable<typeof h> => !!h);
  const weight = readWeight(weights, foods, profile.goalWeight, tWeek.kcal < tWeek.tdee, date);
  const trained = new Set([...history.map((r) => r.date), ...strava.filter((a) => a.sport !== "WeightTraining").map((a) => a.date)]);

  return {
    hoje: date,
    aluno: { nome: profile.name, objetivo: profile.focus, nivel: profile.level, treinosPorSemana: profile.days, idade: profile.age, pesoMeta: profile.goalWeight },
    metas: { kcal: t.kcal, proteina: t.protein, carboidratos: t.carbs, gorduras: t.fat, aguaMl: t.waterMl },
    hojeDetalhe: numbers.day,
    desdeOInicio: numbers.sinceStart,
    dias,
    semanas,
    tendencias: { pesoKgPorSemana: weight.rate, pesoParado: !!weight.plateau, perdaRapida: !!weight.fast, metaAtingida: weight.goalReached, sono: readSleep(health, date) },
    musculoUltimoTreino: lastByGroup,
    proximoTreino: next ? { nome: next.name, musculos: [...new Set(next.items.map((it) => GROUP_LABEL[byId(it.exId)?.group ?? "core"]))] } : null,
    prontidao: health[date] ? readiness(health[date], before) : null,
    sinalDeCansaco: overreach(health, trained, date),
  };
}

/** Asks one question with the conversation so far; returns the answer text. */
export async function askForma(inputs: Inputs, question: string, past: ChatMessage[]) {
  const dados = await chatData(inputs);
  const conversa = past.slice(-CONTEXT_MESSAGES).map((m) => ({ quem: m.role === "eu" ? "aluno" : "forma", texto: m.text }));
  const prompt = JSON.stringify({ dados, conversa, pergunta: question.trim().slice(0, 400) });
  const ai = (await generateJson(SYSTEM, SCHEMA, prompt, { models: BEST_MODELS, timeoutMs: 40_000 })) as { resposta?: unknown };
  const text = String(ai.resposta ?? "").replace(/\*\*?/g, "").trim();
  if (!text) throw new Error("A IA não respondeu. Tente de novo.");
  return text;
}

export const chatDay = () => iso(new Date());
