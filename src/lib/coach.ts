import { BEST_MODELS, generateJson, Schema } from "./ai";
import { foodsKey, readCloudOnce, waterKey } from "./cloud-store";
import { FEEL_LABEL, targets, type FoodEntry, type Profile, type WaterLog, type WeightEntry, type WorkoutRecord } from "./store";
import { bestSets, recordTotal, strengthHistory } from "./workout-stats";
import { stravaKey, type StravaActivity } from "./strava";
import { healthKey, type HealthMonth } from "./health";
import { addDays, readSleep, readWeight } from "./insights";
import { weekStart, weekStats } from "./week";
import type { Plan } from "./plan";

/** One line of the conversation with the assistant (the "Pergunte ao forma" chat in the header). */
export type CoachMessage = { role: "user" | "coach"; text: string };

/** The conversation is kept on this device only, so it survives closing the app. */
export const COACH_STORAGE_KEY = "forma.coach";

const FOCUS_LABEL: Record<Profile["focus"], string> = {
  perder: "perder gordura",
  massa: "ganhar massa muscular",
  forca: "ficar mais forte",
  condicionamento: "melhorar o condicionamento",
};

const SYSTEM = `Você é o assistente do forma, um app brasileiro de treino e alimentação. Atua como treinador e nutricionista do aluno.
Responda em português do Brasil, com tom próximo e direto, em no máximo 6 frases curtas (ou uma lista curta quando ajudar).
Use SOMENTE os dados recebidos em "dados"; nunca invente números. Escreva números no formato brasileiro (80,45 kg; 2.065 kcal).
Se a pergunta pedir algo que não está nos dados (por exemplo, sem registros), diga que ainda não há registro e sugira como registrar no app.
Sobre carga, use "forca" (primeira e última carga mais pesada de cada exercício, e a melhor série) e "treinos" (os mais recentes, com a carga total = soma de peso × repetições).
Sobre alimentação, use "metas" e "alimentacao" (totais de cada dia registrado nos últimos 14 dias).
Sobre peso, use "peso": tendencia é kg por semana (negativo = perdendo), previsaoMeta é a data prevista para a meta.
Não dê diagnóstico médico nem recomende remédios. Suplemento só em termos gerais. Se o assunto fugir de treino, alimentação, sono ou saúde geral, responda em uma frase e volte ao tema.`;

const SCHEMA = Schema.object({ properties: { resposta: Schema.string() } });

const months = (date: string) => [addDays(date, -40), date].map((d) => d.slice(0, 7)).filter((m, i, all) => all.indexOf(m) === i);

type Inputs = { uid: string; date: string; profile: Profile; weights: WeightEntry[]; history: WorkoutRecord[]; plan: Plan | null };

/** The person's numbers, computed here (never by the AI), small enough to send with every question. */
export async function coachData({ uid, date, profile, weights, history, plan }: Inputs) {
  const ms = months(date);
  const [foodMonths, waterMonths, stravaMonths, healthMonths] = await Promise.all([
    Promise.all(ms.map((m) => readCloudOnce<FoodEntry[]>(uid, foodsKey(`${m}-01`), []))),
    Promise.all(ms.map((m) => readCloudOnce<WaterLog>(uid, waterKey(`${m}-01`), {}))),
    Promise.all(ms.map((m) => readCloudOnce<StravaActivity[]>(uid, stravaKey(`${m}-01`), []).catch((): StravaActivity[] => []))),
    Promise.all(ms.map((m) => readCloudOnce<HealthMonth>(uid, healthKey(`${m}-01`), {}).catch((): HealthMonth => ({})))),
  ]);
  const foods = foodMonths.flat();
  const water: WaterLog = Object.assign({}, ...waterMonths);
  const health: HealthMonth = Object.assign({}, ...healthMonths);
  const strava = stravaMonths.flat();
  const t = targets(profile, date);

  const days = new Map<string, { kcal: number; p: number; c: number; f: number; meals: Set<string> }>();
  for (const f of foods) {
    if (f.date < addDays(date, -13) || f.date > date) continue;
    const d = days.get(f.date) ?? { kcal: 0, p: 0, c: 0, f: 0, meals: new Set<string>() };
    d.kcal += f.kcal; d.p += f.p; d.c += f.c; d.f += f.f;
    if (f.meal !== "suplementos") d.meals.add(f.meal);
    days.set(f.date, d);
  }

  const weight = readWeight(weights, foods, profile.goalWeight, profile.goalWeight < profile.weight - 0.5, date);
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));

  // The most trained exercises, with where their heaviest set started and where it is now.
  const count = new Map<string, number>();
  for (const r of history) for (const e of r.exercises) count.set(e.exId, (count.get(e.exId) ?? 0) + 1);
  const forca = [...count].sort((a, b) => b[1] - a[1]).slice(0, 15).flatMap(([exId]) => {
    const points = strengthHistory(history, exId);
    if (!points.length) return [];
    const name = [...history].reverse().flatMap((r) => r.exercises).find((e) => e.exId === exId)?.name ?? exId;
    const first = points[0]!;
    const last = points.at(-1)!;
    return [{ exercicio: name, vezes: points.length, primeiraKg: first.kg, primeiraData: first.date, ultimaKg: last.kg, ultimaData: last.date, melhorSerieRecente: last.set }];
  });

  const week = (start: string) => weekStats(start, date, { foods, water, weights, history, strava, health, targets: { kcal: t.kcal, waterMl: t.waterMl } });
  const thisWeek = weekStart(date);

  return {
    hoje: date,
    perfil: {
      nome: profile.name, sexo: profile.sex === "m" ? "masculino" : "feminino", idade: profile.age, alturaCm: profile.height,
      objetivo: FOCUS_LABEL[profile.focus], nivel: profile.level, treinosPorSemana: profile.days, minutosPorTreino: profile.minutes,
      pesoMetaKg: profile.goalWeight,
    },
    metas: { kcal: t.kcal, proteinaG: t.protein, carboidratoG: t.carbs, gorduraG: t.fat, aguaMl: t.waterMl },
    plano: plan ? { metodo: plan.method, treinos: plan.days.map((d) => d.name) } : null,
    peso: {
      atualKg: weight.current, inicioKg: sorted[0]?.kg ?? profile.weight, inicioData: sorted[0]?.date ?? null,
      tendencia: weight.rate, previsaoMeta: weight.eta, metaAtingida: weight.goalReached, perdaRapida: !!weight.fast, parado: !!weight.plateau,
      ultimasPesagens: sorted.slice(-8).map((w) => ({ data: w.date, kg: w.kg })),
    },
    alimentacao: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([data, d]) => ({
      data, kcal: Math.round(d.kcal), proteinaG: Math.round(d.p), carboidratoG: Math.round(d.c), gorduraG: Math.round(d.f), refeicoes: d.meals.size, aguaMl: water[data] ?? 0,
    })),
    treinos: history.slice(-12).map((r) => ({
      data: r.date, treino: r.dayName,
      minutos: r.durationMs !== undefined ? Math.round(r.durationMs / 60000) : null,
      cargaTotalKg: Math.round(recordTotal(r)),
      sensacao: r.feel ? FEEL_LABEL[r.feel] : null,
      exercicios: r.exercises.map((e) => {
        const { top, best } = bestSets(e);
        return { nome: e.name, series: `${e.setsDone} de ${e.setsPlanned}`, maiorCargaKg: top || null, melhorSerie: best ? `${best.kg} kg × ${best.reps}` : null };
      }),
    })),
    totalDeTreinos: history.length,
    forca,
    semanaAtual: week(thisWeek),
    semanaPassada: week(addDays(thisWeek, -7)),
    sono: readSleep(health, date),
  };
}

/** Asks the assistant; `past` is the conversation so far (the last turns go along so follow-ups make sense). */
export async function askCoach(question: string, past: CoachMessage[], inputs: Inputs): Promise<string> {
  const data = await coachData(inputs);
  const conversation = past.slice(-8).map((m) => `${m.role === "user" ? "Aluno" : "Assistente"}: ${m.text}`).join("\n");
  const prompt = `dados = ${JSON.stringify(data)}\n\n${conversation ? `Conversa até aqui:\n${conversation}\n\n` : ""}Pergunta do aluno: ${question}`;
  const result = (await generateJson(SYSTEM, SCHEMA, prompt, { models: BEST_MODELS, timeoutMs: 45_000 })) as { resposta?: unknown };
  const answer = typeof result.resposta === "string" ? result.resposta.trim() : "";
  if (!answer) throw new Error("A IA não respondeu. Tente perguntar de outro jeito.");
  return answer;
}
