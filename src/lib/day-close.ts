import { BEST_MODELS, generateJson, Schema } from "./ai";
import { foodsKey, readCloudOnce, waterKey } from "./cloud-store";
import { targets, type DayRecord, type FoodEntry, type Profile, type WaterLog, type WeightEntry, type WorkoutRecord } from "./store";
import { lastRecordBefore, recordTotal } from "./workout-stats";
import { byId, GROUP_LABEL } from "./exercises";
import { sportLabel, stravaActivityDetail, stravaKey, type StravaActivity, type StravaDetail } from "./strava";
import { doseLabel, SUPPLEMENTS_KEY, type Supplement } from "./supplements";
import { healthKey, type HealthMonth } from "./health";

const FOCUS_LABEL: Record<Profile["focus"], string> = {
  perder: "perder gordura",
  massa: "ganhar massa muscular",
  forca: "ficar mais forte",
  condicionamento: "melhorar o condicionamento",
};

const SYSTEM = `Você é um treinador e nutricionista brasileiro acompanhando um aluno num app de treino e alimentação.
Escreva em português do Brasil, com tom próximo, direto e encorajador, sem exageros.
Use SOMENTE os números recebidos; não invente dados. Escreva números no formato brasileiro (80,45 kg; 2.065 kcal; 1,55 L). Se algo não foi registrado (refeições, água, treino, peso), diga isso com naturalidade e incentive o registro.
Não dê diagnóstico médico nem recomende remédios ou suplementos específicos.
Campos:
Sobre a musculação, use hoje.treino: diga o que foi treinado e quais músculos, e compare a carga total do treino (soma de peso × repetições de todos os exercícios) com a última vez que esse mesmo treino foi feito: cargaTotalHoje e cargaTotalUltimaVez, no formato "de 3.400 kg para 3.650 kg" (nunca use ×). Não compare exercício por exercício e não fale de séries nem de repetições. Quando hoje.treino trouxer fcMedia, fcMaxima, kcalGastas e esforco, são do Strava para esse mesmo treino (a pulseira gravou a musculação): comente o esforço e as calorias gastas como parte dele, um treino só, nunca como uma segunda atividade.
Analise também cada atividade do Strava em hoje.strava e relacione com o resto do dia (calorias, proteína, água, descanso). Em todas, use o tempo em movimento (minutes), a frequência cardíaca média e máxima (avgHr, maxHr), as calorias (kcal) e o esforço relativo do Strava (effort, quanto maior mais puxado). Nas que têm distância, use também distância, ritmo ou velocidade e desnível; em musculação e outras sem distância, ignore distância, ritmo e desnível.
- overview: 2 a 4 frases sobre o dia, citando o treino e as atividades do Strava quando houver.
- goingWell: 2 a 4 pontos curtos do que foi bem hoje ou no acompanhamento.
- improve: 2 a 4 pontos curtos, cada um com uma ação concreta.
- sinceStart: 2 a 3 frases sobre a evolução desde o início (peso, treinos, constância na alimentação, volume de treino).
- tomorrow: 1 a 2 frases com o foco para amanhã.`;

const SCHEMA = Schema.object({
  properties: {
    overview: Schema.string(),
    goingWell: Schema.array({ items: Schema.string() }),
    improve: Schema.array({ items: Schema.string() }),
    sinceStart: Schema.string(),
    tomorrow: Schema.string(),
  },
});

const muscleOf = (exId: string) => {
  const ex = byId(exId);
  return ex ? GROUP_LABEL[ex.group] : "";
};
/** Running pace (min/km) for foot sports, speed (km/h) for the rest. */
function paceOf(a: StravaActivity) {
  if (!a.distanceM || !a.movingS) return { pace: null, kmh: null };
  const foot = /Run|Walk|Hike/.test(a.sport);
  if (!foot) return { pace: null, kmh: Math.round((a.distanceM / a.movingS) * 36) / 10 };
  const secPerKm = a.movingS / (a.distanceM / 1000);
  return { pace: `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")} min/km`, kmh: null };
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);

function monthsBetween(start: string, end: string) {
  const months: string[] = [];
  let [y, m] = start.slice(0, 7).split("-").map(Number) as [number, number];
  const last = end.slice(0, 7);
  while (months.length < 36) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    months.push(key);
    if (key >= last) break;
    if (++m > 12) { m = 1; y++; }
  }
  return months;
}

type Inputs = { uid: string; date: string; profile: Profile; weights: WeightEntry[]; history: WorkoutRecord[] };

/** Exact numbers of the day and since the start of tracking (computed here, never by the AI). */
export async function dayNumbers({ uid, date, profile, weights, history }: Inputs): Promise<Omit<DayRecord, "ai" | "closedAt">> {
  const t = targets(profile);
  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const start = [sortedWeights[0]?.date, history[0]?.date].filter((d): d is string => !!d).sort()[0] ?? date;

  const months = monthsBetween(start < date ? start : date, date);
  const [foodMonths, waterMonths, stravaMonths, routine, healthMonth] = await Promise.all([
    Promise.all(months.map((m) => readCloudOnce<FoodEntry[]>(uid, foodsKey(`${m}-01`), []))),
    Promise.all(months.map((m) => readCloudOnce<WaterLog>(uid, waterKey(`${m}-01`), {}))),
    Promise.all(months.map((m) => readCloudOnce<StravaActivity[]>(uid, stravaKey(`${m}-01`), []))),
    readCloudOnce<Supplement[]>(uid, SUPPLEMENTS_KEY, []),
    readCloudOnce<HealthMonth>(uid, healthKey(date), {}),
  ]);
  const healthDay = healthMonth[date];
  const health = healthDay
    ? { sleepMin: healthDay.sleepMin ?? null, steps: healthDay.steps ?? null, activeKcal: healthDay.activeKcal ?? null, restingHr: healthDay.restingHr ?? null, vo2max: healthDay.vo2max ?? null }
    : null;
  const strava = stravaMonths.flat().filter((a) => a.date >= start && a.date <= date);
  const foods = foodMonths.flat().filter((f) => f.date >= start && f.date <= date);
  const water: WaterLog = Object.assign({}, ...waterMonths);

  const byDay = new Map<string, { kcal: number; p: number; c: number; f: number; meals: Set<string> }>();
  for (const f of foods) {
    const d = byDay.get(f.date) ?? { kcal: 0, p: 0, c: 0, f: 0, meals: new Set<string>() };
    d.kcal += f.kcal; d.p += f.p; d.c += f.c; d.f += f.f; if (f.meal !== "suplementos") d.meals.add(f.meal);
    byDay.set(f.date, d);
  }
  const todayFood = byDay.get(date);
  // The synced list is only a summary; the detail (what the activity card shows) brings calories and relative effort,
  // which matter most for weight training, where there is no distance. Without signal the summary is used.
  const stravaToday = strava.filter((a) => a.date === date);
  const details = await Promise.all(stravaToday.map((a) => stravaActivityDetail(uid, a).catch((): StravaDetail | null => null)));
  // The routine, each marked taken or not, followed by any one-off supplement taken today.
  const todaySupplements = foods.filter((f) => f.date === date && f.meal === "suplementos");
  const supplements = [
    ...routine.map((s) => ({ name: s.name, dose: doseLabel(s), taken: todaySupplements.some((f) => f.suppId === s.id), daily: true })),
    ...todaySupplements.filter((f) => !routine.some((s) => s.id === f.suppId)).map((f) => ({ name: f.name, dose: f.dose ?? `${f.grams} g`, taken: true, daily: false })),
  ];
  const logged = [...byDay.values()];
  const avg = (fn: (d: (typeof logged)[number]) => number) => (logged.length ? Math.round(logged.reduce((s, d) => s + fn(d), 0) / logged.length) : 0);

  const todaysWorkout = [...history].reverse().find((r) => r.date === date) ?? null;
  let workout: DayRecord["day"]["workout"] = null;
  if (todaysWorkout) {
    const volumeKg = recordTotal(todaysWorkout);
    const before = lastRecordBefore(history.slice(0, history.indexOf(todaysWorkout)), todaysWorkout.dayName);
    const beforeKg = recordTotal(before);
    workout = {
      name: todaysWorkout.dayName,
      minutes: todaysWorkout.durationMs !== undefined ? Math.round(todaysWorkout.durationMs / 60000) : null,
      setsDone: todaysWorkout.exercises.reduce((s, e) => s + e.setsDone, 0),
      setsPlanned: todaysWorkout.exercises.reduce((s, e) => s + e.setsPlanned, 0),
      volumeKg: Math.round(volumeKg),
      volumeDiffKg: volumeKg > 0 && beforeKg > 0 ? Math.round(volumeKg - beforeKg) : null,
      exercises: todaysWorkout.exercises.map((e) => ({ name: e.name, muscle: muscleOf(e.exId) })),
    };
  }

  const volumeTrend = [...new Set(history.map((r) => r.dayName))]
    .map((name) => {
      const withVolume = history.filter((r) => r.dayName === name && recordTotal(r) > 0);
      return { name, firstKg: Math.round(recordTotal(withVolume[0])), lastKg: Math.round(recordTotal(withVolume.at(-1))), count: withVolume.length };
    })
    .filter((v) => v.count >= 2)
    .map(({ name, firstKg, lastKg }) => ({ name, firstKg, lastKg }));

  return {
    date,
    day: {
      kcal: Math.round(todayFood?.kcal ?? 0),
      protein: Math.round(todayFood?.p ?? 0),
      carbs: Math.round(todayFood?.c ?? 0),
      fat: Math.round(todayFood?.f ?? 0),
      waterMl: water[date] ?? 0,
      meals: todayFood?.meals.size ?? 0,
      targets: { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, waterMl: t.waterMl },
      workout,
      weightKg: weights.find((w) => w.date === date)?.kg ?? null,
      strava: stravaToday.map((a, i) => {
        const d = details[i];
        return {
          sport: sportLabel(a.sport), name: a.name, km: Math.round(a.distanceM / 100) / 10, minutes: Math.round((d?.movingS ?? a.movingS) / 60),
          kcal: d?.kcal ?? a.kcal, avgHr: d?.avgHr ?? a.avgHr, maxHr: d?.maxHr ?? a.maxHr, elevationM: a.elevationM, effort: d?.sufferScore ?? null, ...paceOf(a),
        };
      }),
      supplements,
      health,
    },
    sinceStart: {
      startDate: start,
      days: daysBetween(start, date) + 1,
      weightStart: sortedWeights[0]?.kg ?? profile.weight,
      weightNow: sortedWeights.at(-1)?.kg ?? profile.weight,
      weightGoal: profile.goalWeight,
      workouts: history.length,
      workoutsLast7Days: history.filter((r) => r.date >= addDays(date, -6) && r.date <= date).length,
      daysLogged: logged.length,
      avgKcal: avg((d) => d.kcal),
      avgProtein: avg((d) => d.p),
      daysOnCalories: logged.filter((d) => Math.abs(d.kcal - t.kcal) <= t.kcal * 0.1).length,
      daysOnProtein: logged.filter((d) => d.p >= t.protein * 0.9).length,
      volumeTrend,
      stravaActivities: strava.length,
      stravaKm: Math.round(strava.reduce((s, a) => s + a.distanceM, 0) / 100) / 10,
    },
  };
}

/** Builds the day's record: numbers from the app, review from Gemini. */
export async function closeDay(inputs: Inputs): Promise<DayRecord> {
  const numbers = await dayNumbers(inputs);
  const { profile } = inputs;
  // Weight training on Strava is today's workout as the band recorded it: one session, with Strava's effort and calories.
  const gym = numbers.day.workout ? numbers.day.strava?.find((a) => a.sport === sportLabel("WeightTraining")) : undefined;
  const prompt = JSON.stringify({
    aluno: { nome: profile.name, objetivo: FOCUS_LABEL[profile.focus], nivel: profile.level, treinosPorSemana: profile.days },
    unidades: "calorias em kcal, macros em g, água em ml, peso em kg, volume de treino = soma de peso × repetições em kg",
    suplementos: "hoje.supplements lista os suplementos da rotina diária (daily = true), com taken = tomado ou não, e os avulsos do dia; comente quando faltar algum da rotina",
    observacao: "atividades do Strava (corrida, pedal etc.) são gasto extra informativo; a meta de calorias do dia não muda por causa delas",
    saude: "hoje.health vem da pulseira (Mi Band, pelo app Saúde): sleepMin = minutos dormidos na noite que terminou hoje, steps = passos, activeKcal = energia ativa em kcal (informativa, não muda a meta), restingHr = batimento em repouso em bpm, vo2max em mL/kg/min; null = não chegou. Relacione o sono e o batimento em repouso com o treino e a recuperação, e os passos com o movimento do dia; se health for null, não comente",
    // The AI sees what was trained, the muscles and the load comparison only (no sets or reps).
    hoje: { ...numbers.day, workout: undefined, strava: gym ? numbers.day.strava?.filter((a) => a !== gym) : numbers.day.strava, treino: numbers.day.workout && {
      nome: numbers.day.workout.name,
      minutos: gym?.minutes ?? numbers.day.workout.minutes,
      ...(gym ? { fcMedia: gym.avgHr, fcMaxima: gym.maxHr ?? null, kcalGastas: gym.kcal, esforco: gym.effort ?? null } : {}),
      musculos: [...new Set(numbers.day.workout.exercises?.map((e) => e.muscle).filter(Boolean))],
      exercicios: numbers.day.workout.exercises?.map((e) => ({ exercicio: e.name, musculo: e.muscle })),
      cargaTotalHoje: numbers.day.workout.volumeKg || null,
      cargaTotalUltimaVez: numbers.day.workout.volumeDiffKg === null ? null : numbers.day.workout.volumeKg - numbers.day.workout.volumeDiffKg,
    } },
    desdeOInicio: numbers.sinceStart,
  });
  const ai = (await generateJson(SYSTEM, SCHEMA, prompt, { models: BEST_MODELS, timeoutMs: 40_000 })) as Partial<DayRecord["ai"]>;
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  return {
    ...numbers,
    closedAt: Date.now(),
    ai: {
      overview: String(ai.overview ?? ""),
      goingWell: list(ai.goingWell),
      improve: list(ai.improve),
      sinceStart: String(ai.sinceStart ?? ""),
      tomorrow: String(ai.tomorrow ?? ""),
    },
  };
}
