import { generateJson, Schema } from "./ai";
import { foodsKey, readCloudOnce, waterKey } from "./cloud-store";
import { targets, type DayRecord, type FoodEntry, type Profile, type WaterLog, type WeightEntry, type WorkoutRecord } from "./store";
import { lastRecordBefore, recordTotal } from "./workout-stats";

const FOCUS_LABEL: Record<Profile["focus"], string> = {
  perder: "perder gordura",
  massa: "ganhar massa muscular",
  forca: "ficar mais forte",
  condicionamento: "melhorar o condicionamento",
};

const SYSTEM = `Você é um treinador e nutricionista brasileiro acompanhando um aluno num app de treino e alimentação.
Escreva em português do Brasil, com tom próximo, direto e encorajador, sem exageros.
Use SOMENTE os números recebidos; não invente dados. Escreva números no formato brasileiro (80,4 kg; 2.065 kcal; 1,55 L). Se algo não foi registrado (refeições, água, treino, peso), diga isso com naturalidade e incentive o registro.
Não dê diagnóstico médico nem recomende remédios ou suplementos específicos.
Campos:
- overview: 2 a 3 frases sobre o dia.
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
  const [foodMonths, waterMonths] = await Promise.all([
    Promise.all(months.map((m) => readCloudOnce<FoodEntry[]>(uid, foodsKey(`${m}-01`), []))),
    Promise.all(months.map((m) => readCloudOnce<WaterLog>(uid, waterKey(`${m}-01`), {}))),
  ]);
  const foods = foodMonths.flat().filter((f) => f.date >= start && f.date <= date);
  const water: WaterLog = Object.assign({}, ...waterMonths);

  const byDay = new Map<string, { kcal: number; p: number; c: number; f: number; meals: Set<string> }>();
  for (const f of foods) {
    const d = byDay.get(f.date) ?? { kcal: 0, p: 0, c: 0, f: 0, meals: new Set<string>() };
    d.kcal += f.kcal; d.p += f.p; d.c += f.c; d.f += f.f; d.meals.add(f.meal);
    byDay.set(f.date, d);
  }
  const todayFood = byDay.get(date);
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
    },
  };
}

/** Builds the day's record: numbers from the app, review from Gemini. */
export async function closeDay(inputs: Inputs): Promise<DayRecord> {
  const numbers = await dayNumbers(inputs);
  const { profile } = inputs;
  const prompt = JSON.stringify({
    aluno: { nome: profile.name, objetivo: FOCUS_LABEL[profile.focus], nivel: profile.level, treinosPorSemana: profile.days },
    unidades: "calorias em kcal, macros em g, água em ml, peso em kg, volume de treino = soma de peso × repetições em kg",
    hoje: numbers.day,
    desdeOInicio: numbers.sinceStart,
  });
  const ai = (await generateJson(SYSTEM, SCHEMA, prompt)) as Partial<DayRecord["ai"]>;
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
