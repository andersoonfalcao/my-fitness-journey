import { Link } from "@tanstack/react-router";
import { BedDouble, Flame, Footprints, HeartPulse } from "lucide-react";
import { useHistory, useLocal } from "@/lib/store";
import { cardioAsActivity, cardioKey, type CardioRecord } from "@/lib/cardio";
import { restingAverage } from "@/lib/heart";
import { dayStrain, STRAIN_MAX, STRAIN_ZONES } from "@/lib/strain";
import { stravaKey, type StravaActivity } from "@/lib/strava";
import { overreach } from "@/lib/insights";
import { clock, dayDistanceM, DEFAULT_STEPS_GOAL, healthKey, kmLabel, readiness, sleepLabel, STEPS_GOAL_KEY, type HealthMonth } from "@/lib/health";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };

/** Background and title color; the text stays in the normal color so it reads on any of them. */
const TONE: Record<"bom" | "normal" | "baixo", [string, string]> = {
  bom: ["bg-[#3f9d6b]/12", "text-[#2f7d54] dark:text-[#6cc495]"],
  normal: ["bg-muted", "text-foreground"],
  baixo: ["bg-accent/15", "text-accent"],
};

/** Hoje: readiness, last night's sleep and the day's steps (against the goal), active energy and resting heart rate. */
export function HealthToday({ date, age }: { date: string; age: number }) {
  const [thisMonth] = useLocal<HealthMonth>(healthKey(date), {});
  const [prevMonth] = useLocal<HealthMonth>(healthKey(addDays(date, -17)), {});
  const [stepsGoal] = useLocal<number>(STEPS_GOAL_KEY, DEFAULT_STEPS_GOAL);
  const [strava] = useLocal<StravaActivity[]>(stravaKey(date), []);
  const [waitingCardio] = useLocal<CardioRecord[]>(cardioKey(date), []);
  const [history] = useHistory();
  const day = thisMonth[date];
  if (!day) return null;
  const walked = dayDistanceM(day, date, strava);
  const all = { ...prevMonth, ...thisMonth };
  const before = Object.entries(all).filter(([d]) => d < date && d >= addDays(date, -14)).map(([, v]) => v);
  // Three days in a row above normal is accumulated fatigue: it replaces today's reading so the screen says it once.
  const sustained = overreach(all, [], date);
  const ready = sustained?.kind === "batimento"
    ? { level: "baixo" as const, title: "Cansaço acumulado", detail: `Batimento em repouso pelo menos ${sustained.above} acima do seu normal nos últimos três dias: vale um dia de descanso ou uma semana com menos carga.` }
    : readiness(day, before);
  const strain = dayStrain({ day, date, age, restingAvg: restingAverage(all, date), strava: [...strava, ...waitingCardio.map(cardioAsActivity)], history, ready });

  const tiles: [typeof BedDouble, string, string, string | null, number | null][] = [];
  if (day.sleepMin !== undefined) tiles.push([BedDouble, "Sono", sleepLabel(day.sleepMin), day.sleepStart && day.sleepEnd ? `${clock(day.sleepStart)}–${clock(day.sleepEnd)}` : null, null]);
  if (day.steps !== undefined) tiles.push([Footprints, "Passos", day.steps.toLocaleString("pt-BR"), `${walked !== undefined ? `${kmLabel(walked)}\n` : ""}meta ${stepsGoal.toLocaleString("pt-BR")}`, Math.min(1, day.steps / stepsGoal)]);
  if (day.activeKcal !== undefined) tiles.push([Flame, "Energia ativa", `${day.activeKcal.toLocaleString("pt-BR")} kcal`, null, null]);
  if (day.restingHr !== undefined) tiles.push([HeartPulse, "Repouso", `${day.restingHr} bpm`, null, null]);
  if (!tiles.length) return null;
  return (
    <Link to="/corpo" search={{ aba: "evolucao" }} hash="saude" className="block rounded-3xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">Sua Mi Band hoje</h2>
        <span className="shrink-0 text-xs text-muted-foreground">atualizado {clock(new Date(day.at).toISOString())}</span>
      </div>
      {ready && (
        <div className={`mt-3 rounded-2xl px-3 py-2.5 ${TONE[ready.level][0]}`}>
          <div className={`text-sm font-bold ${TONE[ready.level][1]}`}>{ready.title}</div>
          <div className="mt-0.5 text-sm leading-snug text-foreground">{ready.detail}</div>
        </div>
      )}
      {strain && (
        <div className="mt-3 space-y-2 rounded-2xl bg-muted/60 px-3 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold"><Flame className="h-4 w-4 text-accent" aria-hidden />Esforço do dia</span>
            <span className="text-xs text-muted-foreground">de 0 a {STRAIN_MAX}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold leading-none tabular-nums">{strain.score.toLocaleString("pt-BR")}</span>
            <span className="text-sm font-bold">{strain.zone}</span>
          </div>
          <div className="relative pt-1" role="img" aria-label={`Esforço ${strain.score.toLocaleString("pt-BR")} de ${STRAIN_MAX}, ${strain.zone}`}>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {STRAIN_ZONES.map(([zone, width], i) => (
                <span key={zone} style={{ flexGrow: width }} className={["bg-[#9ec9ae] dark:bg-[#4f8a68]", "bg-[#e8b04a]", "bg-accent", "bg-[#c4442f]"][i]} />
              ))}
            </div>
            <span className="absolute top-0 h-[1.125rem] w-1.5 -translate-x-1/2 rounded-full border-2 border-card bg-foreground" style={{ left: `${(strain.score / STRAIN_MAX) * 100}%` }} />
            <div className="mt-1 flex text-[11px] text-muted-foreground">
              {STRAIN_ZONES.map(([zone, width]) => <span key={zone} style={{ flexGrow: width, flexBasis: 0 }}>{zone === "moderado" ? "moder." : zone === "máximo" ? "máx." : zone}</span>)}
            </div>
          </div>
          <p className="text-xs leading-snug">
            {[...strain.parts.map((p) => `${p.label} (${p.minutes} min${p.avgHr ? `, batimento médio ${p.avgHr}` : ""})`), ...(strain.steps ? [`${strain.steps.toLocaleString("pt-BR")} passos`] : [])].join(" + ")}.
            {strain.aim && <> {strain.aim.text}</>}
          </p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([Icon, label, value, sub, progress]) => (
          <div key={label} className="rounded-2xl bg-muted/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Icon className="h-3.5 w-3.5 text-accent" aria-hidden />{label}</div>
            <div className="mt-1 whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{value}</div>
            {progress !== null && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border" role="img" aria-label={`${Math.round(progress * 100)}% da meta de passos`}>
                <div className={`h-full rounded-full ${progress >= 1 ? "bg-[#3f9d6b]" : "bg-accent"}`} style={{ width: `${progress * 100}%` }} />
              </div>
            )}
            {/* The distance walked sits on its own line above the goal: side by side they don't fit half a phone screen. */}
            {sub && <div className="mt-0.5 whitespace-pre-line text-xs tabular-nums text-muted-foreground">{sub}</div>}
          </div>
        ))}
      </div>
    </Link>
  );
}
