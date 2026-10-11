import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fmtKg, KEYS, roundKg, targets, today, useLocal, type Focus, type Level, type Profile, type WeightEntry } from "@/lib/store";
import { generatePlan, type Plan } from "@/lib/plan";
import { Activity, ArrowRight, CalendarDays, Clock, Dumbbell, Eye, Pencil, RefreshCw, Target, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MethodPicker } from "@/components/MethodPicker";
import { CalibrationCard } from "@/components/CalibrationCard";
import { RegenerateDialog } from "@/components/RegenerateDialog";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Seu perfil e objetivo — forma" },
      { name: "description", content: "Defina sua meta de peso, foco e rotina para gerar metas de calorias e um plano de treino." },
      { property: "og:title", content: "Seu perfil e objetivo — forma" },
      { property: "og:description", content: "Questionário estruturado para personalizar dieta e treinos." },
    ],
  }),
  component: PerfilPage,
});

const DEFAULT: Profile = { name: "", sex: "m", age: 30, height: 175, weight: 80, goalWeight: 75, activity: 1.55, focus: "perder", days: 4, level: "intermediario", minutes: 60 };

const FOCUS: { v: Focus; t: string; d: string }[] = [
  { v: "perder", t: "Perder gordura", d: "Déficit calórico + musculação para manter músculo" },
  { v: "massa", t: "Ganhar massa", d: "Superávit leve + volume de hipertrofia" },
  { v: "forca", t: "Ficar mais forte", d: "Cargas altas, poucas repetições" },
  { v: "condicionamento", t: "Condicionamento", d: "Mais repetições, menos descanso" },
];
const ACT = [
  { v: 1.2, t: "Sedentário (trabalho sentado)" },
  { v: 1.375, t: "Levemente ativo" },
  { v: 1.55, t: "Moderadamente ativo" },
  { v: 1.725, t: "Muito ativo" },
];
const LEVELS: { v: Level; t: string }[] = [
  { v: "iniciante", t: "Iniciante (< 6 meses)" },
  { v: "intermediario", t: "Intermediário (6 meses a 3 anos)" },
  { v: "avancado", t: "Avançado (> 3 anos)" },
];

function PerfilPage() {
  const [saved, setProfile, ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [plan, setPlan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog] = useLocal<string[]>(KEYS.done, []);
  const [, setCycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [regen, setRegen] = useState(false);
  const [weights, setWeights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [p, setP] = useState<Profile>(DEFAULT);
  // A saved profile opens read-only, so entering the tab can't change anything by accident.
  const [editing, setEditing] = useState(false);
  const nav = useNavigate();

  const { user } = useAuth();
  useEffect(() => {
    if (ready && saved) setP(saved);
    else if (ready && user?.displayName) setP((o) => (o.name ? o : { ...o, name: user.displayName!.split(" ")[0]! }));
  }, [ready, saved, user]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((o) => ({ ...o, [k]: v }));
  // The current weight is the last weighing from Corpo; the profile keeps the one the goals were calculated with.
  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sortedWeights.at(-1);
  const updateGoalsWeight = () => {
    if (!saved || !latest) return;
    setProfile({ ...saved, weight: latest.kg });
    toast.success("Metas recalculadas com o peso da última pesagem");
  };
  const showForm = editing || !saved;
  const t = targets(showForm ? p : saved);
  const dirty = !!saved && JSON.stringify(p) !== JSON.stringify(saved);

  const view = () => {
    if (dirty && !confirm("Descartar as alterações que você não salvou?")) return;
    if (saved) setP(saved);
    setEditing(false);
  };

  const save = () => {
    // Picking another activity level means the person wants the estimate again, not the measured energy.
    setProfile(saved && p.activity !== saved.activity ? { ...p, calibratedTdee: undefined } : p);
    setPlan(generatePlan(p, { variation: plan?.variation }));
    setCycleStart(doneLog.length);
    setWeights((w) => (w.length ? w : [{ date: today(), kg: p.weight }]));
    setEditing(false);
    toast.success("Perfil salvo e plano de treino gerado!");
    nav({ to: "/treinos" });
  };

  // Weights take two decimals (78,45 kg); the other numbers are whole.
  const num = (k: keyof Profile, label: string, suffix: string, decimals = false) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-input bg-card px-3">
        <input type="number" step={decimals ? 0.01 : 1} inputMode={decimals ? "decimal" : "numeric"} value={p[k] as number}
          onChange={(e) => set(k, (decimals ? roundKg(Number(e.target.value)) : Number(e.target.value)) as never)}
          className="w-full bg-transparent py-2.5 outline-none" />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">{showForm ? "Questionário" : "Perfil"}</p>
          <h1 className="mt-1 text-4xl font-extrabold">{showForm ? "Seu objetivo" : "Seu perfil"}</h1>
          {showForm && <p className="mt-2 max-w-xl text-muted-foreground">Usamos a fórmula Mifflin-St Jeor para calorias e um método de divisão de treino adequado aos seus dias disponíveis.</p>}
        </div>
        {saved && (
          <div className="inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="Modo do perfil">
            {([[false, "Visualizar", Eye], [true, "Editar", Pencil]] as const).map(([mode, label, Icon]) => (
              <button key={label} type="button" role="tab" aria-selected={editing === mode}
                onClick={() => (mode ? setEditing(true) : view())}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${editing === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!showForm && saved ? <>
        {latest && Math.abs(latest.kg - saved.weight) >= 0.5 && (
          <section className="flex flex-col gap-3 rounded-3xl border-2 border-accent bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 flex-1 text-sm">
              Sua última pesagem foi <b>{fmtKg(latest.kg)} kg</b> em {new Date(`${latest.date}T12:00:00`).toLocaleDateString("pt-BR")}. As metas de calorias e macros ainda usam <b>{fmtKg(saved.weight)} kg</b>.
            </p>
            <button type="button" onClick={updateGoalsWeight} className="min-h-11 shrink-0 self-start rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Atualizar metas</button>
          </section>
        )}
        <ProfileSummary p={saved} current={latest?.kg ?? saved.weight} start={sortedWeights[0]} />
        <CalibrationCard profile={saved} />
      </> : <>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">1. Sobre você</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold">Sexo</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["m", "f"] as const).map((s) => (
                <button key={s} onClick={() => set("sex", s)}
                  className={`rounded-xl border py-2.5 font-semibold ${p.sex === s ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                  {s === "m" ? "Masculino" : "Feminino"}
                </button>
              ))}
            </div>
          </label>
          {num("age", "Idade", "anos")}
          {num("height", "Altura", "cm")}
          {num("weight", "Peso atual", "kg", true)}
          {num("goalWeight", "Meta de peso", "kg", true)}
          <label className="block">
            <span className="text-sm font-semibold">Nível de atividade</span>
            <select value={p.activity} onChange={(e) => set("activity", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5">
              {ACT.map((a) => <option key={a.v} value={a.v}>{a.t}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">2. Foco principal</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FOCUS.map((f) => (
            <button key={f.v} onClick={() => set("focus", f.v)}
              className={`rounded-2xl border-2 p-4 text-left transition ${p.focus === f.v ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground"}`}>
              <div className="font-display text-lg font-bold">{f.t}</div>
              <div className="text-sm text-muted-foreground">{f.d}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">3. Rotina de treino</h2>
        <div className="mt-4 space-y-5">
          <div>
            <span className="text-sm font-semibold">Dias por semana</span>
            <div className="mt-2 flex gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button key={d} onClick={() => set("days", d)}
                  className={`h-12 w-12 rounded-full border font-display text-lg font-bold ${p.days === d ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold">Tempo por treino</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {[45, 60, 75].map((m) => (
                <button key={m} onClick={() => set("minutes", m)}
                  className={`rounded-full border px-4 py-2 font-semibold ${p.minutes === m ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{m} min</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold">Experiência</span>
            <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap">
              {LEVELS.map((l) => (
                <button key={l.v} onClick={() => set("level", l.v)}
                  className={`rounded-full border px-4 py-2 font-semibold ${p.level === l.v ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{l.t}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div>
          <h2 className="text-xl font-bold">4. Método de treino</h2>
          <p className="text-sm text-muted-foreground">Sugerido pelo seu foco, nível e dias por semana. Toque em outro para mudar.</p>
        </div>
        <MethodPicker profile={p} value={p.method} onChange={(method) => set("method", method)} />
      </section>
      </>}

      <section className="rounded-3xl bg-primary p-6 text-primary-foreground">
        <h2 className="text-xl font-bold">Suas metas diárias</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[["Calorias", `${t.kcal}`, "kcal"], ["Proteína", `${t.protein}`, "g"], ["Carboidratos", `${t.carbs}`, "g"], ["Gorduras", `${t.fat}`, "g"]].map(([a, b, c]) => (
            <div key={a}><div className="text-sm opacity-75">{a}</div><div className="font-display text-3xl font-extrabold">{b}<span className="ml-1 text-base opacity-75">{c}</span></div></div>
          ))}
        </div>
        <p className="mt-3 text-sm opacity-75">{(showForm ? p : saved).calibratedTdee ? "Gasto medido" : "Gasto estimado"}: {t.tdee.toLocaleString("pt-BR")} kcal/dia. Como calculamos: {t.notes.join(" · ")}.</p>
      </section>

      {showForm && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={save} className="w-full rounded-full bg-accent py-4 font-display text-lg font-bold text-accent-foreground">
            Salvar e gerar meu plano de treino
          </button>
          {saved && (
            <button type="button" onClick={view} className="rounded-full border border-input px-8 py-4 font-semibold sm:shrink-0">
              Cancelar
            </button>
          )}
        </div>
      )}
      {!showForm && plan && (
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Dumbbell className="h-4 w-4 shrink-0 text-accent" aria-hidden />Plano atual
          </div>
          <div className="mt-2 font-display text-2xl font-bold leading-tight">{plan.method}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {plan.days.length} treino{plan.days.length === 1 ? "" : "s"} na sequência · gerado em {new Date(plan.createdAt).toLocaleDateString("pt-BR")} · {doneLog.length} treino{doneLog.length === 1 ? "" : "s"} concluído{doneLog.length === 1 ? "" : "s"} até agora
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Os treinos e os exercícios de cada um estão em <Link to="/treinos" className="font-semibold text-primary underline-offset-4 hover:underline">Treinos</Link>.</p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Sobre o método</summary>
            <p className="mt-2 text-muted-foreground">{plan.summary}</p>
          </details>
          <button type="button" onClick={() => setRegen(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground">
            <RefreshCw className="h-4 w-4" />Regerar treino
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Troque os exercícios ou mude o método. Seu histórico não muda.</p>
        </section>
      )}
      <RegenerateDialog open={regen} onOpenChange={setRegen} onDone={() => nav({ to: "/treinos" })} />
    </div>
  );
}

/** One weight of the profile summary: label, big number with a smaller "kg", optional line below. */
function WeightFigure({ label, value, sub, className = "" }: { label: string; value: number | undefined; sub?: string | undefined; className?: string }) {
  return (
    <div className={`shrink-0 text-center ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="whitespace-nowrap font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        {value !== undefined ? <>{fmtKg(value)}<span className="text-base sm:text-xl"> kg</span></> : "—"}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Read-only view of the saved answers; editing happens only after tapping Editar. */
function ProfileSummary({ p, current, start }: { p: Profile; current: number; start: WeightEntry | undefined }) {
  const focus = FOCUS.find((f) => f.v === p.focus);
  const kg = (n: number) => `${fmtKg(n)} kg`;
  const diff = roundKg(p.goalWeight - current);
  const about = [p.sex === "m" ? "Masculino" : "Feminino", `${p.age} anos`, `${p.height} cm`];
  const cards: { icon: LucideIcon; label: string; value: string; sub?: string | undefined }[] = [
    { icon: Target, label: "Foco", value: focus?.t ?? "—", sub: focus?.d },
    { icon: CalendarDays, label: "Frequência", value: `${p.days}×`, sub: "por semana" },
    { icon: Clock, label: "Duração", value: `${p.minutes} min`, sub: "por treino" },
    { icon: Dumbbell, label: "Experiência", value: LEVELS.find((l) => l.v === p.level)?.t.replace(/ \(.*\)$/, "") ?? "—" },
    { icon: Activity, label: "Atividade", value: ACT.find((a) => a.v === p.activity)?.t ?? "—", sub: "no dia a dia" },
  ];
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border bg-card p-6">
        {/* Phone: start on its own line, then current → what is left → goal. Wider screens: one line. */}
        <div className="flex flex-wrap items-start justify-center gap-y-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] sm:gap-6">
          <WeightFigure label="Início" value={start?.kg} sub={start ? new Date(`${start.date}T12:00:00`).toLocaleDateString("pt-BR") : undefined} className="w-full sm:w-auto" />
          <div className="flex w-full min-w-0 items-start justify-center gap-2 sm:contents">
            <WeightFigure label="Peso atual" value={current} />
            <div className="flex min-w-[5.5rem] flex-1 flex-col items-center gap-1 pt-5">
              <span className={`rounded-full px-2.5 py-1 text-center text-xs font-bold leading-tight sm:text-sm ${diff === 0 ? "bg-[#3f9d6b]/10 text-[#3f9d6b]" : "bg-destructive/10 text-destructive"}`}>
                {diff === 0 ? "Na meta" : <>{diff > 0 ? "Ganhar" : "Perder"} <span className="whitespace-nowrap">{kg(Math.abs(diff))}</span></>}
              </span>
              <span className={`flex w-full items-center ${diff === 0 ? "text-[#3f9d6b]" : "text-destructive"}`} aria-hidden>
                <span className="h-px flex-1 bg-current opacity-50" />
                <ArrowRight className="-ml-1 h-4 w-4" />
              </span>
            </div>
            <WeightFigure label="Meta" value={p.goalWeight} className="text-[#3f9d6b]" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-border pt-4">
          {about.map((a) => <span key={a} className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">{a}</span>)}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className={`rounded-2xl border border-border bg-card p-4 ${label === "Foco" ? "col-span-2" : ""}`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />{label}
            </div>
            <div className="mt-2 text-balance font-display text-base font-bold leading-tight sm:text-lg">{value}</div>
            {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
