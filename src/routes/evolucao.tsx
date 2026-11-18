import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarRange, ChevronRight, Dumbbell, Flame, LineChart as LineIcon, Scale } from "lucide-react";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NeedProfile } from "@/components/AppShell";
import { StreakBadge, useWeekStreak } from "@/components/TrainingInsights";
import { WeightPace } from "@/components/WeightInsights";
import { daysKey, fmtKg, foodsKey, KEYS, today, useHistory, useLocal, type DayRecord, type FoodEntry, type Profile, type WeightEntry } from "@/lib/store";
import { addDays, weightTrend } from "@/lib/insights";
import { useTrainedDays } from "@/lib/trained";
import { strengthHistory } from "@/lib/workout-stats";
import { byId } from "@/lib/exercises";

export const Route = createFileRoute("/evolucao")({
  head: () => ({
    meta: [
      { title: "Evolução — forma" },
      { name: "description", content: "Constância das últimas 12 semanas, peso com a previsão da meta e a força de cada exercício." },
    ],
  }),
  component: ProgressPage,
});

const WEEKS = 12;
const monthOf = (date: string) => date.slice(0, 7);

/** Progress in one place: how steady the last 12 weeks were, the weight and the strength per exercise. */
function ProgressPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  if (!ready) return <ScreenSkeleton />;
  if (!profile) return <NeedProfile />;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow tone="muted">Últimas {WEEKS} semanas</Eyebrow>
          <h1 className="type-h1 mt-1">Evolução</h1>
        </div>
        <StreakBadge planned={profile.days} />
      </header>
      <ConstancyMap planned={profile.days} />
      <WeightCard profile={profile} />
      <StrengthCard />
      <nav aria-label="Mais sobre a sua evolução" className="grid gap-2 sm:grid-cols-2">
        {([
          ["/semana", CalendarRange, "Resumo da semana", "Números e comentário da IA"],
          ["/mes", LineIcon, "Retrospectiva do mês", "O mês comparado com o anterior"],
          ["/corpo", Scale, "Corpo", "Pesagens, IMC e bioimpedância"],
        ] as const).map(([to, Icon, title, sub]) => (
          <Link key={to} to={to} search={to === "/corpo" ? { aba: "evolucao" } : {}} className="pressable flex min-h-16 items-center gap-3 rounded-3xl surface-card px-4 py-3 hover:border-line-strong">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-accent"><Icon className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block truncate text-xs text-muted-foreground">{sub}</span></span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}

/**
 * One square per day of the last 12 weeks (columns are weeks, Monday on top), darker the more the day had:
 * a workout (gym or cardio), food logged and the day closed count one point each.
 */
function ConstancyMap({ planned }: { planned: number }) {
  const end = today();
  const mondayNow = addDays(end, -((new Date(`${end}T12:00:00`).getDay() + 6) % 7));
  const start = addDays(mondayNow, -(WEEKS - 1) * 7);
  // The 12 weeks span at most four months; one hook per month document, always four.
  const months = [0, 1, 2, 3].map((i) => { const d = new Date(`${end}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() - i); return `${monthOf(d.toISOString().slice(0, 10))}-15`; });
  const f0 = useLocal<FoodEntry[]>(foodsKey(months[0]!), [])[0];
  const f1 = useLocal<FoodEntry[]>(foodsKey(months[1]!), [])[0];
  const f2 = useLocal<FoodEntry[]>(foodsKey(months[2]!), [])[0];
  const f3 = useLocal<FoodEntry[]>(foodsKey(months[3]!), [])[0];
  const d0 = useLocal<DayRecord[]>(daysKey(months[0]!), [])[0];
  const d1 = useLocal<DayRecord[]>(daysKey(months[1]!), [])[0];
  const d2 = useLocal<DayRecord[]>(daysKey(months[2]!), [])[0];
  const d3 = useLocal<DayRecord[]>(daysKey(months[3]!), [])[0];
  const trained = new Set(useTrainedDays());
  const ate = new Set([...f0, ...f1, ...f2, ...f3].map((f) => f.date));
  const closed = new Set([...d0, ...d1, ...d2, ...d3].map((d) => d.date));
  const streak = useWeekStreak(planned);

  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const date = addDays(start, w * 7 + d);
    const level = date > end ? -1 : (trained.has(date) ? 1 : 0) + (ate.has(date) ? 1 : 0) + (closed.has(date) ? 1 : 0);
    return { date, level };
  }));
  const days = weeks.flat().filter((d) => d.level >= 0);
  const full = days.filter((d) => d.level === 3).length;
  const workouts = days.filter((d) => trained.has(d.date)).length;
  const shade = ["var(--muted)", "color-mix(in srgb, var(--accent-base) 32%, var(--muted))", "color-mix(in srgb, var(--accent-base) 64%, var(--muted))", "var(--accent-base)"];
  const label = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-h3">Constância</h2>
        {streak >= 1 && <span className="inline-flex items-center gap-1 text-sm font-semibold text-warning-text"><Flame className="h-4 w-4 fill-warning text-warning" aria-hidden />{streak} {streak === 1 ? "semana" : "semanas"} no plano</span>}
      </div>
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <div className="grid grid-rows-7 gap-1 text-xs text-muted-foreground" aria-hidden>
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <span key={i} className="flex items-center leading-none">{i % 2 === 0 ? d : ""}</span>)}
        </div>
        <div className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-1" role="img"
          aria-label={`${full} dias completos e ${workouts} dias com treino nas últimas ${WEEKS} semanas`}>
          {weeks.flat().map(({ date, level }) => (
            <span key={date} title={level >= 0 ? `${label(date)}: ${["nada registrado", "1 de 3", "2 de 3", "dia completo"][level]}` : undefined}
              className="aspect-square rounded-[4px] transition-colors duration-300" style={{ background: level < 0 ? "transparent" : shade[level] }} />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-5 text-xs text-muted-foreground" aria-hidden>
        <span>{label(start)}</span><span>hoje</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <dl className="flex gap-6">
          <div><dt className="type-overline text-muted-foreground">Dias completos</dt><dd className="type-number text-2xl">{full}</dd></div>
          <div><dt className="type-overline text-muted-foreground">Dias com treino</dt><dd className="type-number text-2xl">{workouts}</dd></div>
        </dl>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden>
          menos{shade.map((c) => <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)}mais
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Cada dia soma um ponto por treino, por refeições registradas e por fechar o dia.</p>
    </Card>
  );
}

/** Weight: the 7-day average with the goal line, the pace and the date the goal arrives at it. */
function WeightCard({ profile }: { profile: Profile }) {
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const points = weightTrend(weights).filter((w) => w.date >= addDays(today(), -WEEKS * 7));
  const first = points[0];
  const last = points.at(-1);
  const change = first && last ? last.kg - first.kg : 0;
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-h3">Peso</h2>
        {first && last && first !== last && (
          <span className={`text-sm font-semibold tabular-nums ${Math.sign(change) === Math.sign(profile.goalWeight - first.kg) ? "text-success-text" : "text-muted-foreground"}`}>
            {change > 0 ? "+" : "−"}{fmtKg(Math.abs(change))} kg
          </span>
        )}
      </div>
      {points.length < 2 ? (
        <EmptyState compact icon={Scale} title="A curva aparece com duas pesagens">Pese-se pela manhã, em jejum, e registre em Corpo.</EmptyState>
      ) : (
        <>
          <div className="type-number mt-1 text-4xl">{fmtKg(last!.kg)}<span className="text-base font-semibold text-muted-foreground"> kg · meta {fmtKg(profile.goalWeight)}</span></div>
          <div className="mt-3 h-40" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="evo-weight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-base)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--accent-base)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={[(min: number) => Math.min(min, profile.goalWeight) - 1, (max: number) => max + 1]} hide />
                <ReferenceLine y={profile.goalWeight} stroke="var(--line-strong)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="trend" stroke="none" fill="url(#evo-weight)" />
                <Line type="monotone" dataKey="trend" stroke="var(--accent-base)" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Média de 7 dias · linha tracejada = meta</p>
          <WeightPace profile={profile} />
        </>
      )}
    </Card>
  );
}

/** Strength: the heaviest set of each workout for one exercise, picked from the ones trained. */
function StrengthCard() {
  const [history] = useHistory();
  const counts = new Map<string, { name: string; n: number }>();
  for (const r of history) for (const e of r.exercises) if ((e.setKgs ?? []).some((k) => (k ?? 0) > 0) || (e.kg ?? 0) > 0) {
    counts.set(e.exId, { name: byId(e.exId)?.name ?? e.name, n: (counts.get(e.exId)?.n ?? 0) + 1 });
  }
  const options = [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  const [picked, setPicked] = useState<string | null>(null);
  const exId = picked ?? options[0]?.[0] ?? null;
  if (!exId) {
    return <Card><h2 className="type-h3">Força</h2><EmptyState compact icon={Dumbbell} title="Seu primeiro recorde está a um treino">Registre a carga das séries no treino e a evolução de cada exercício aparece aqui.</EmptyState></Card>;
  }
  const points = strengthHistory(history, exId).slice(-10);
  const top = Math.max(...points.map((p) => p.kg));
  const gain = points.length > 1 ? points.at(-1)!.kg - points[0]!.kg : 0;
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-h3">Força</h2>
        <Link to="/treinos" search={{ aba: "historico" }} className="text-sm font-semibold text-accent">Histórico</Link>
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Exercício</span>
        <select value={exId} onChange={(e) => setPicked(e.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-base font-semibold md:text-sm">
          {options.map(([id, o]) => <option key={id} value={id}>{o.name}</option>)}
        </select>
      </label>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="type-number text-3xl">{fmtKg(top).replace(/,00$/, "")}<span className="text-base font-semibold text-muted-foreground"> kg</span></span>
        {gain !== 0 && <span className={`text-sm font-semibold ${gain > 0 ? "text-success-text" : "text-muted-foreground"}`}>{gain > 0 ? "+" : "−"}{fmtKg(Math.abs(gain)).replace(/,00$/, "")} kg em {points.length} treinos</span>}
      </div>
      <div className="mt-3 flex h-20 items-end gap-1.5" role="img" aria-label={`Carga máxima nos últimos ${points.length} treinos: ${points.map((p) => fmtKg(p.kg)).join(", ")} kg`}>
        {points.map((p, i) => (
          <span key={`${p.date}-${i}`} className="flex-1 rounded-t-md transition-[height] duration-500"
            style={{ height: `${Math.max(8, (p.kg / top) * 100)}%`, background: i === points.length - 1 ? "var(--accent-base)" : "var(--accent-soft)" }} />
        ))}
      </div>
    </Card>
  );
}
