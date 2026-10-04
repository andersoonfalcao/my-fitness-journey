import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KEYS, targets, today, useLocal, type Focus, type Level, type Profile, type WeightEntry } from "@/lib/store";
import { generatePlan, type Plan } from "@/lib/plan";

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

const DEFAULT: Profile = { name: "Anderson", sex: "m", age: 30, height: 175, weight: 80, goalWeight: 75, activity: 1.55, focus: "perder", days: 4, level: "intermediario", minutes: 60 };

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
  { v: "intermediario", t: "Intermediário" },
  { v: "avancado", t: "Avançado (> 3 anos)" },
];

function PerfilPage() {
  const [saved, setProfile, ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [, setPlan] = useLocal<Plan | null>(KEYS.plan, null);
  const [, setWeights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [p, setP] = useState<Profile>(DEFAULT);
  const nav = useNavigate();

  useEffect(() => { if (ready && saved) setP(saved); }, [ready, saved]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((o) => ({ ...o, [k]: v }));
  const t = targets(p);

  const save = () => {
    setProfile(p);
    setPlan(generatePlan(p));
    setWeights((w) => (w.length ? w : [{ date: today(), kg: p.weight }]));
    toast.success("Perfil salvo e plano de treino gerado!");
    nav({ to: "/treinos" });
  };

  const num = (k: keyof Profile, label: string, suffix: string) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-input bg-card px-3">
        <input type="number" value={p[k] as number} onChange={(e) => set(k, Number(e.target.value) as never)}
          className="w-full bg-transparent py-2.5 outline-none" />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-accent">Questionário</p>
        <h1 className="mt-1 text-4xl font-extrabold">Seu objetivo</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Usamos a fórmula Mifflin-St Jeor para calorias e um método de divisão de treino adequado aos seus dias disponíveis.</p>
      </div>

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
          {num("weight", "Peso atual", "kg")}
          {num("goalWeight", "Meta de peso", "kg")}
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
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button key={l.v} onClick={() => set("level", l.v)}
                  className={`rounded-full border px-4 py-2 font-semibold ${p.level === l.v ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{l.t}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-primary p-6 text-primary-foreground">
        <h2 className="text-xl font-bold">Suas metas diárias</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[["Calorias", `${t.kcal}`, "kcal"], ["Proteína", `${t.protein}`, "g"], ["Carboidratos", `${t.carbs}`, "g"], ["Gorduras", `${t.fat}`, "g"]].map(([a, b, c]) => (
            <div key={a}><div className="text-sm opacity-75">{a}</div><div className="font-display text-3xl font-extrabold">{b}<span className="ml-1 text-base opacity-75">{c}</span></div></div>
          ))}
        </div>
        <p className="mt-3 text-sm opacity-75">Gasto estimado: {t.tdee} kcal/dia. Como calculamos: {t.notes.join(" · ")}.</p>
      </section>

      <button onClick={save} className="w-full rounded-full bg-accent py-4 font-display text-lg font-bold text-accent-foreground">
        Salvar e gerar meu plano de treino
      </button>
    </div>
  );
}
