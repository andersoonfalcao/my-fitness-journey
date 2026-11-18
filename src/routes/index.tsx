import { ScreenSkeleton } from "@/components/ui/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fmtKg, foodsKey, KEYS, targets, today, useLocal, type FoodEntry, type Profile, type WeightEntry, type WorkoutSession } from "@/lib/store";
import { WorkoutNow } from "@/components/WorkoutNow";
import { nextWorkoutIndex, type Plan } from "@/lib/plan";
import { MacroBar, NeedProfile, Ring } from "@/components/AppShell";
import { byId } from "@/lib/exercises";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { DayClose } from "@/components/DayClose";
import { HealthToday } from "@/components/HealthToday";
import { CalibrationNotice } from "@/components/CalibrationCard";
import { CheckCheck, ChevronRight, Dumbbell, HeartPulse, Moon, Play, Plus } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { addDays, weekStart } from "@/lib/week";
import { cardioByDate, cardioKey, type CardioRecord } from "@/lib/cardio";
import { stravaKey, type StravaActivity } from "@/lib/strava";
import { defaultTrainingDays, musclesOf } from "@/components/WeekPlan";
import { WeightNotices } from "@/components/WeightInsights";
import { StreakBadge, TrainingInsights } from "@/components/TrainingInsights";
import { MeasuresNotice, WeekGoal } from "@/components/WeekGoal";
import { AchievementWatcher } from "@/components/Achievements";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "forma — seu dia de dieta e treino" },
      { name: "description", content: "Resumo diário de calorias, macros, peso e o treino de hoje." },
      { property: "og:title", content: "forma — seu dia de dieta e treino" },
      { property: "og:description", content: "Calorias, macros, evolução do peso e plano de treino em um só lugar." },
    ],
  }),
  component: Index,
});

function Index() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [foods] = useLocal<FoodEntry[]>(foodsKey(today()), []);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [plan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog] = useLocal<string[]>(KEYS.done, []);
  const [cycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [schedule] = useLocal<number[] | null>(KEYS.schedule, null);
  const [strava] = useLocal<StravaActivity[]>(stravaKey(today()), []);
  const [waitingCardio] = useLocal<CardioRecord[]>(cardioKey(today()), []);
  // A workout in progress takes the top of the screen and the place of the "Treino de hoje" card.
  const [session] = useLocal<WorkoutSession | null>(KEYS.session, null);

  if (!ready) return <ScreenSkeleton />;
  if (!profile) return <NeedProfile />;

  const t = targets(profile, today());
  const day = foods.filter((f) => f.date === today());
  const sum = day.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const current = weights.length ? [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.kg : profile.weight;
  const next = plan ? plan.days[nextWorkoutIndex(doneLog.length, cycleStart, plan.days.length)] ?? null : null;
  // A workout finished today closes the card for the day; the following one only shows up tomorrow.
  const doneToday = doneLog.filter((d) => d.startsWith(`${today()}|`)).map((d) => d.slice(11));
  // A day with only cardio is a training day too.
  const cardioToday = [...new Set(cardioByDate(strava, waitingCardio)[today()] ?? [])];
  // Rest days follow the week chosen in Treinos; the next workout waits for the next training day.
  const trainingDays = schedule?.length ? schedule : defaultTrainingDays(profile.days);
  const weekday = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return { d, w: (d.getDay() + 6) % 7 }; };
  const restToday = !trainingDays.includes(weekday(0).w);
  const nextDay = restToday ? [1, 2, 3, 4, 5, 6, 7].map(weekday).find(({ w }) => trainingDays.includes(w))?.d : undefined;
  const left = t.kcal - Math.round(sum.kcal);

  const toGoal = Math.abs(current - profile.goalWeight);
  return (
    <div className="space-y-5">
      <header className="animate-fade-up">
        <Eyebrow tone="muted">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </Eyebrow>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="type-h1">Olá, {profile.name || "você"}.</h1>
          <StreakBadge planned={profile.days} />
        </div>
      </header>

      {session && <WorkoutNow session={session} plan={plan} />}

      {doneToday.length === 0 && cardioToday.length > 0 ? (
        <Link to="/treinos" search={next && !restToday ? {} : { aba: "historico" }} className="pressable flex items-center gap-4 rounded-3xl border border-brand-line bg-brand-soft p-5 sm:p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand animate-pop"><CheckCheck className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <Eyebrow tone="success">Treino de hoje · concluído</Eyebrow>
            <h2 className="type-h3 text-balance">Cardio: {cardioToday.join(" e ")}</h2>
            {next && !restToday && <p className="mt-0.5 text-sm text-muted-foreground">Ainda dá para fazer o {next.name}. Toque para ver.</p>}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ) : doneToday.length > 0 ? (
        <Link to="/treinos" search={{ aba: "historico" }} className="pressable flex items-center gap-4 rounded-3xl border border-brand-line bg-brand-soft p-5 sm:p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand animate-pop"><CheckCheck className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <Eyebrow tone="success">Treino de hoje · concluído</Eyebrow>
            <h2 className="type-h3 text-balance">{doneToday.join(" e ")}</h2>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ) : session ? null : next && restToday ? (
        <Card>
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Moon className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <Eyebrow tone="muted">Hoje é descanso</Eyebrow>
              <h2 className="type-h3">Próximo treino</h2>
              <p className="mt-0.5 text-sm font-semibold">
                {nextDay && <span className="whitespace-nowrap">{nextDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</span>}
                {nextDay && " · "}<span className="whitespace-nowrap">{next.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">{musclesOf(next.items.map((it) => it.exId))}</p>
            </div>
            <Link to="/treinos" className={buttonVariants({ variant: "outline", size: "sm", className: "hidden shrink-0 sm:inline-flex" })}>Ver semana</Link>
          </div>
          {/* A rest day can still be trained: the next workout of the sequence, or cardio. */}
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm font-semibold">Quer treinar mesmo assim?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/treinos" className="pressable flex min-h-14 flex-col justify-center rounded-2xl bg-muted px-4 py-2.5 text-left hover:bg-surface-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold"><Dumbbell className="h-4 w-4 shrink-0 text-accent" />Musculação</span>
                <span className="truncate text-xs text-muted-foreground">{next.name}</span>
              </Link>
              <Link to="/treinos" search={{ aba: "cardio" }} className="pressable flex min-h-14 flex-col justify-center rounded-2xl bg-muted px-4 py-2.5 text-left hover:bg-surface-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold"><HeartPulse className="h-4 w-4 shrink-0 text-accent" />Cardio</span>
                <span className="truncate text-xs text-muted-foreground">Esteira, corrida…</span>
              </Link>
            </div>
          </div>
        </Card>
      ) : next && (
        <Card variant="highlight">
          {/* Name on its own line and the muscles below, so any workout (short or with five muscle groups) reads cleanly. */}
          <Eyebrow>Treino de hoje</Eyebrow>
          <h2 className="type-h2 mt-1">{next.name}</h2>
          <p className="mt-1 text-balance text-sm text-muted-foreground">{musclesOf(next.items.map((it) => it.exId))} · {next.items.length} exercícios</p>
          <div className="-mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
            {next.items.map((it, i) => {
              const ex = byId(it.exId);
              return (
                <div key={i} className="w-28 shrink-0 snap-start">
                  <ExerciseMedia exercise={ex} compact className="aspect-square w-full rounded-2xl border border-border" />
                  <div className="mt-1.5 line-clamp-2 text-xs font-medium leading-tight">{ex.name}</div>
                </div>
              );
            })}
          </div>
          <Link to="/treinos" className={buttonVariants({ size: "lg", className: "mt-5 w-full sm:w-auto" })}>
            <Play className="fill-current" />Ver treino
          </Link>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-h3">Alimentação de hoje</h2>
          <span className="text-sm tabular-nums text-muted-foreground">meta {t.kcal.toLocaleString("pt-BR")} kcal</span>
        </div>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
          <Ring value={sum.kcal} max={t.kcal} label={Math.abs(left).toLocaleString("pt-BR")} sub={left >= 0 ? "kcal restantes" : "kcal acima"} />
          <div className="w-full flex-1 space-y-4">
            <MacroBar name="Proteína" value={sum.p} max={t.protein} color="var(--data-protein)" />
            <MacroBar name="Carboidratos" value={sum.c} max={t.carbs} color="var(--data-carbs)" />
            <MacroBar name="Gorduras" value={sum.f} max={t.fat} color="var(--data-fat)" />
          </div>
        </div>
        <Link to="/alimentacao" className={buttonVariants({ variant: "secondary", className: "mt-5 w-full sm:w-auto" })}><Plus />Registrar refeição</Link>
      </Card>

      <WeekGoal planned={profile.days} />

      <Link to="/corpo" search={{ aba: "evolucao" }} className="pressable flex items-end justify-between gap-3 rounded-3xl surface-card p-5 hover:border-line-strong sm:p-6">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">Peso atual</div>
          <div className="type-number whitespace-nowrap text-4xl leading-tight">{fmtKg(current)}<span className="text-xl font-semibold text-muted-foreground"> kg</span></div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm text-muted-foreground">Meta: {fmtKg(profile.goalWeight)} kg</div>
          <div className="whitespace-nowrap font-display text-lg font-bold text-accent">
            {toGoal < 0.1 ? "Meta atingida!" : `faltam ${fmtKg(toGoal)} kg`}
          </div>
        </div>
      </Link>

      <TrainingInsights planned={profile.days} streakRow={false} />

      <WeightNotices profile={profile} />

      <CalibrationNotice profile={profile} />

      <MeasuresNotice />

      <AchievementWatcher profile={profile} />

      {/* Sunday evening and Monday: the week just lived, one tap away. */}
      {[0, 1].includes(new Date().getDay()) && (
        <Link to="/semana" search={new Date().getDay() === 1 ? { inicio: weekStart(addDays(today(), -1)) } : {}}
          className="pressable flex min-h-14 items-center justify-between gap-3 rounded-3xl surface-card px-5 py-3 hover:border-line-strong">
          <span className="min-w-0">
            <Eyebrow>{new Date().getDay() === 1 ? "Semana passada" : "Domingo"}</Eyebrow>
            <span className="block font-semibold">Veja o resumo da semana</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <HealthToday date={today()} age={profile.age} />

      <DayClose profile={profile} date={today()} />
    </div>
  );
}
