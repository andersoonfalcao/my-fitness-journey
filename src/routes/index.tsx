import { createFileRoute, Link } from "@tanstack/react-router";
import { KEYS, targets, today, useLocal, type FoodEntry, type Profile, type WeightEntry } from "@/lib/store";
import type { Plan } from "@/lib/plan";
import { MacroBar, NeedProfile, Ring } from "@/components/AppShell";
import { byId } from "@/lib/exercises";

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
  const [foods] = useLocal<FoodEntry[]>(KEYS.foods, []);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [plan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog] = useLocal<string[]>(KEYS.done, []);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;

  const t = targets(profile);
  const day = foods.filter((f) => f.date === today());
  const sum = day.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const current = weights.length ? [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.kg : profile.weight;
  const next = plan ? plan.days[doneLog.length % plan.days.length] : null;
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

        <Link to="/peso" className="rounded-3xl bg-primary p-6 text-primary-foreground">
          <div className="text-sm opacity-75">Peso atual</div>
          <div className="font-display text-5xl font-extrabold">{current.toFixed(1)}<span className="text-xl"> kg</span></div>
          <div className="mt-4 text-sm opacity-75">Meta: {profile.goalWeight} kg</div>
          <div className="font-display text-xl font-bold text-accent">
            {Math.abs(current - profile.goalWeight) < 0.1 ? "Meta atingida!" : `faltam ${Math.abs(current - profile.goalWeight).toFixed(1)} kg`}
          </div>
        </Link>
      </div>

      {next && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-accent">Próximo treino</div>
              <h2 className="text-2xl font-bold">{next.name} · {next.focus}</h2>
            </div>
            <Link to="/treinos" className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground">Ver treino</Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {next.items.map((it, i) => {
              const ex = byId(it.exId);
              return (
                <div key={i} className="w-32 shrink-0">
                  <img src={ex.img} alt={ex.name} loading="lazy" className="aspect-square w-full rounded-2xl border border-border object-cover" />
                  <div className="mt-1 text-xs font-semibold leading-tight">{ex.name}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
