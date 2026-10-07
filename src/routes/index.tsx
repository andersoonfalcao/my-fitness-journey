import { createFileRoute, Link } from "@tanstack/react-router";
import { fmtKg, foodsKey, KEYS, targets, today, useLocal, type FoodEntry, type Profile, type WeightEntry } from "@/lib/store";
import { nextWorkoutIndex, type Plan } from "@/lib/plan";
import { MacroBar, NeedProfile, Ring } from "@/components/AppShell";
import { byId } from "@/lib/exercises";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { DayClose } from "@/components/DayClose";
import { CheckCheck, Moon } from "lucide-react";
import { defaultTrainingDays, musclesOf } from "@/components/WeekPlan";

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

  if (!ready) return null;
  if (!profile) return <NeedProfile />;

  const t = targets(profile);
  const day = foods.filter((f) => f.date === today());
  const sum = day.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const current = weights.length ? [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.kg : profile.weight;
  const next = plan ? plan.days[nextWorkoutIndex(doneLog.length, cycleStart, plan.days.length)] ?? null : null;
  // A workout finished today closes the card for the day; the following one only shows up tomorrow.
  const doneToday = doneLog.filter((d) => d.startsWith(`${today()}|`)).map((d) => d.slice(11));
  // Rest days follow the week chosen in Treinos; the next workout waits for the next training day.
  const trainingDays = schedule?.length ? schedule : defaultTrainingDays(profile.days);
  const weekday = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return { d, w: (d.getDay() + 6) % 7 }; };
  const restToday = !trainingDays.includes(weekday(0).w);
  const nextDay = restToday ? [1, 2, 3, 4, 5, 6, 7].map(weekday).find(({ w }) => trainingDays.includes(w))?.d : undefined;
  const left = t.kcal - Math.round(sum.kcal);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 text-4xl font-extrabold">Olá, {profile.name || "você"}.</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 md:col-span-2">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Ring value={sum.kcal} max={t.kcal} label={`${Math.abs(left)}`} sub={left >= 0 ? "kcal restantes" : "kcal acima"} />
            <div className="w-full flex-1 space-y-3">
              <MacroBar name="Proteína" value={sum.p} max={t.protein} color="var(--chart-2)" />
              <MacroBar name="Carboidratos" value={sum.c} max={t.carbs} color="var(--chart-1)" />
              <MacroBar name="Gorduras" value={sum.f} max={t.fat} color="var(--chart-3)" />
            </div>
          </div>
          <Link to="/alimentacao" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">+ Registrar refeição</Link>
        </section>

        <Link to="/corpo" search={{ aba: "evolucao" }} className="rounded-3xl bg-primary p-6 text-primary-foreground">
          <div className="text-sm opacity-75">Peso atual</div>
          <div className="font-display text-5xl font-extrabold">{fmtKg(current)}<span className="text-xl"> kg</span></div>
          <div className="mt-4 text-sm opacity-75">Meta: {fmtKg(profile.goalWeight)} kg</div>
          <div className="font-display text-xl font-bold text-accent">
            {Math.abs(current - profile.goalWeight) < 0.1 ? "Meta atingida!" : `faltam ${fmtKg(Math.abs(current - profile.goalWeight))} kg`}
          </div>
        </Link>
      </div>

      {doneToday.length > 0 ? (
        <Link to="/treinos" search={{ aba: "historico" }} className="flex items-center gap-4 rounded-3xl border border-accent bg-accent/5 p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><CheckCheck className="h-6 w-6" /></span>
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-accent">Treino de hoje</div>
            <h2 className="text-2xl font-bold">{doneToday.join(" e ")} concluído</h2>
          </div>
        </Link>
      ) : next && restToday ? (
        <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Moon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold uppercase tracking-widest text-accent">Hoje é descanso</div>
            <h2 className="text-xl font-bold leading-tight">Próximo treino</h2>
            <p className="mt-0.5 text-sm font-semibold">
              {nextDay && <span className="whitespace-nowrap">{nextDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</span>}
              {nextDay && " · "}<span className="whitespace-nowrap">{next.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">{musclesOf(next.items.map((it) => it.exId))}</p>
          </div>
          <Link to="/treinos" className="hidden shrink-0 rounded-full border border-input px-4 py-2 text-sm font-semibold sm:inline-flex">Ver semana</Link>
        </section>
      ) : next && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-accent">Treino de hoje</div>
              <h2 className="text-2xl font-bold">{next.name} · {musclesOf(next.items.map((it) => it.exId))}</h2>
            </div>
            <Link to="/treinos" className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground">Ver treino</Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {next.items.map((it, i) => {
              const ex = byId(it.exId);
              return (
                <div key={i} className="w-32 shrink-0">
                  <ExerciseMedia exercise={ex} compact className="aspect-square w-full rounded-2xl border border-border" />
                  <div className="mt-1 text-xs font-semibold leading-tight">{ex.name}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <DayClose profile={profile} date={today()} />
    </div>
  );
}
