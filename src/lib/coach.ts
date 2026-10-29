import { BEST_MODELS, generateJson, Schema } from "./ai";
import { foodsKey, readCloudOnce, waterKey } from "./cloud-store";
import { FEEL_LABEL, KEYS, targets, type BodyEntry, type FoodEntry, type MeasureEntry, type Profile, type WaterLog, type WeightEntry, type WorkoutRecord } from "./store";
import { bestSets, recordTotal, strengthHistory } from "./workout-stats";
import { sportLabel, stravaKey, type StravaActivity } from "./strava";
import { cardioAsActivity, cardioKey, type CardioRecord } from "./cardio";
import { doseLabel, SUPPLEMENTS_KEY, type Supplement } from "./supplements";
import type { Fast, FastRecord } from "./fasting";
import { byId } from "./exercises";
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
Responda em português do Brasil, com tom próximo e direto, em até 8 frases curtas ou uma lista curta quando ajudar.
O aluno pode perguntar sobre qualquer coisa que o app registra (treinos, cargas, plano, cardio, alimentação, água, suplementos, jejum, peso, bioimpedância, medidas, sono, passos, batimentos) e também pedir indicações e orientações: o que comer para fechar as metas do dia, como montar uma refeição, como ajustar o treino, a carga ou o descanso, como dormir melhor, como sair de um platô.
Regras:
- Números do aluno: use SOMENTE os de "dados"; nunca invente. Escreva no formato brasileiro (80,45 kg; 2.065 kcal; 1,5 L).
- Orientações: baseie-se nos dados dele (metas, o que falta hoje em "hojeFalta", o histórico) e em conhecimento geral de treino e nutrição. Seja concreto (alimentos com quantidades caseiras, séries, cargas, horários). Prefira alimentos comuns no Brasil.
- Se faltar registro para responder, diga isso e explique como registrar no app.
- Carga: "forca" tem a primeira e a última carga mais pesada de cada exercício e a melhor série; "treinos" traz os mais recentes, com cargaTotalKg = soma de peso × repetições. "plano" traz os treinos do plano com séries × repetições.
- Peso: "peso.tendencia" é kg por semana (negativo = perdendo); "peso.previsaoMeta" é a data prevista para a meta.
- Saúde: não dê diagnóstico médico nem indique remédios; diante de dor, lesão, tontura ou sintoma, oriente procurar um profissional. Suplementos só em termos gerais (os que ele já usa estão em "suplementos").
- Assunto fora de treino, alimentação, sono e saúde geral: responda em uma frase e volte ao tema.`;

const SCHEMA = Schema.object({ properties: { resposta: Schema.string() } });

const months = (date: string) => [addDays(date, -40), date].map((d) => d.slice(0, 7)).filter((m, i, all) => all.indexOf(m) === i);

type Inputs = { uid: string; date: string; profile: Profile; weights: WeightEntry[]; history: WorkoutRecord[]; plan: Plan | null };

/** The person's numbers, computed here (never by the AI), small enough to send with every question. */
export async function coachData({ uid, date, profile, weights, history, plan }: Inputs) {
  const ms = months(date);
  const quiet = <T,>(read: Promise<T>, fallback: T) => read.catch(() => fallback);
  const [foodMonths, waterMonths, stravaMonths, healthMonths, cardioMonths, body, measures, supplements, fasts, fast] = await Promise.all([
    Promise.all(ms.map((m) => readCloudOnce<FoodEntry[]>(uid, foodsKey(`${m}-01`), []))),
    Promise.all(ms.map((m) => readCloudOnce<WaterLog>(uid, waterKey(`${m}-01`), {}))),
    Promise.all(ms.map((m) => quiet(readCloudOnce<StravaActivity[]>(uid, stravaKey(`${m}-01`), []), []))),
    Promise.all(ms.map((m) => quiet(readCloudOnce<HealthMonth>(uid, healthKey(`${m}-01`), {}), {}))),
    Promise.all(ms.map((m) => quiet(readCloudOnce<CardioRecord[]>(uid, cardioKey(`${m}-01`), []), []))),
    quiet(readCloudOnce<BodyEntry[]>(uid, KEYS.body, []), []),
    quiet(readCloudOnce<MeasureEntry[]>(uid, KEYS.measures, []), []),
    quiet(readCloudOnce<Supplement[]>(uid, SUPPLEMENTS_KEY, []), []),
    quiet(readCloudOnce<FastRecord[]>(uid, KEYS.fasts, []), []),
    quiet(readCloudOnce<Fast | null>(uid, KEYS.fast, null), null),
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

  // Cardio of the last 14 days: Strava, plus what was done in the app and Strava hasn't brought yet.
  const recent = (d: string) => d >= addDays(date, -13) && d <= date;
  const cardio = [...strava, ...cardioMonths.flat().map(cardioAsActivity)]
    .filter((a) => recent(a.date) && a.sport !== "WeightTraining")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({ data: a.date, atividade: a.id < 0 ? a.name : sportLabel(a.sport), minutos: Math.round(a.movingS / 60), km: Math.round(a.distanceM / 100) / 10 || null, kcal: a.kcal ?? null, fcMedia: a.avgHr ?? null }));
  const todayFoods = foods.filter((f) => f.date === date);
  const eaten = todayFoods.reduce((s, f) => ({ kcal: s.kcal + f.kcal, p: s.p + f.p, c: s.c + f.c, f: s.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const sortedBody = [...body].sort((a, b) => a.date.localeCompare(b.date));
  const sortedMeasures = [...measures].sort((a, b) => a.date.localeCompare(b.date));

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
    plano: plan ? {
      metodo: plan.method,
      treinos: plan.days.map((d) => ({ nome: d.name, exercicios: d.items.map((it) => `${byId(it.exId).name} ${it.sets}x${it.reps}`) })),
    } : null,
    hojeComeu: todayFoods.map((f) => ({ refeicao: f.meal, alimento: f.name, gramas: f.grams, kcal: Math.round(f.kcal), proteinaG: Math.round(f.p) })),
    hojeFalta: {
      kcal: Math.round(t.kcal - eaten.kcal), proteinaG: Math.round(t.protein - eaten.p), carboidratoG: Math.round(t.carbs - eaten.c), gorduraG: Math.round(t.fat - eaten.f),
      aguaMl: t.waterMl - (water[date] ?? 0),
    },
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
    saudeUltimos7Dias: Object.entries(health).filter(([d]) => d >= addDays(date, -6) && d <= date).sort(([a], [b]) => a.localeCompare(b))
      .map(([d, h]) => ({ data: d, passos: h.steps ?? null, sonoMin: h.sleepMin ?? null, fcRepouso: h.restingHr ?? null, vo2max: h.vo2max ?? null, kcalAtivas: h.activeKcal ?? null })),
    cardio,
    bioimpedancia: sortedBody.length ? { primeira: sortedBody[0], ultimas: sortedBody.slice(-3) } : null,
    medidasCm: sortedMeasures.length ? { primeira: sortedMeasures[0], ultima: sortedMeasures.at(-1) } : null,
    suplementos: supplements.map((s) => `${s.name} ${doseLabel(s)}`),
    jejum: {
      emAndamentoHoras: fast ? Math.round(((Date.now() - fast.startedAt) / 3_600_000) * 10) / 10 : null,
      ultimos: fasts.slice(-5).map((f) => ({ data: new Date(f.endedAt).toISOString().slice(0, 10), horas: Math.round(((f.endedAt - f.startedAt) / 3_600_000) * 10) / 10, metaHoras: f.goalH })),
    },
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
