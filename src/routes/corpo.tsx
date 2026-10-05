import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KEYS, today, useLocal, type BodyEntry, type Profile, type WeightEntry } from "@/lib/store";
import { NeedProfile } from "@/components/AppShell";

export const Route = createFileRoute("/corpo")({
  head: () => ({
    meta: [
      { title: "Corpo — forma" },
      { name: "description", content: "Peso, IMC e bioimpedância: registre e acompanhe a evolução do seu corpo." },
      { property: "og:title", content: "Corpo — forma" },
      { property: "og:description", content: "Evolução do peso, IMC e composição corporal por bioimpedância." },
    ],
  }),
  component: CorpoPage,
});

const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const num = (v: number, digits = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const tick = (v: number) => num(v, 0);
const parse = (s: string) => {
  const v = Number(s.replace(",", "."));
  return s.trim() && Number.isFinite(v) && v > 0 ? v : undefined;
};

/** WHO BMI ranges for adults. */
const BMI_RANGES = [
  { max: 18.5, label: "Abaixo do peso", color: "#4fb3c9" },
  { max: 25, label: "Peso normal", color: "#3f9d6b" },
  { max: 30, label: "Sobrepeso", color: "#f2b84b" },
  { max: 35, label: "Obesidade grau I", color: "#ee7b2c" },
  { max: 40, label: "Obesidade grau II", color: "#e0582a" },
  { max: Infinity, label: "Obesidade grau III", color: "#c43d2b" },
];

/** Bioimpedance fields: key, label, unit, whether a lower value is the better direction (null = neutral). */
const FIELDS: { key: Exclude<keyof BodyEntry, "date">; label: string; unit: string; lowerIsBetter: boolean | null; placeholder: string }[] = [
  { key: "weightKg", label: "Peso", unit: "kg", lowerIsBetter: null, placeholder: "78,4" },
  { key: "fatPct", label: "Gordura corporal", unit: "%", lowerIsBetter: true, placeholder: "22,5" },
  { key: "muscleKg", label: "Massa muscular", unit: "kg", lowerIsBetter: false, placeholder: "34,1" },
  { key: "leanKg", label: "Massa magra", unit: "kg", lowerIsBetter: false, placeholder: "60,2" },
  { key: "waterPct", label: "Água corporal", unit: "%", lowerIsBetter: false, placeholder: "55" },
  { key: "visceral", label: "Gordura visceral", unit: "nível", lowerIsBetter: true, placeholder: "9" },
  { key: "boneKg", label: "Massa óssea", unit: "kg", lowerIsBetter: null, placeholder: "3,2" },
  { key: "bmrKcal", label: "Taxa metabólica basal", unit: "kcal", lowerIsBetter: null, placeholder: "1750" },
  { key: "metabolicAge", label: "Idade metabólica", unit: "anos", lowerIsBetter: true, placeholder: "32" },
];

function CorpoPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [weights, setWeights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [body, setBody] = useLocal<BodyEntry[]>(KEYS.body, []);
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(today());
  const [bioDate, setBioDate] = useState(today());
  const [bio, setBio] = useState<Record<string, string>>({});

  if (!ready) return null;
  if (!profile) return <NeedProfile />;

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]?.kg ?? profile.weight;
  const last = sorted.at(-1)?.kg ?? profile.weight;
  const total = Math.abs(profile.goalWeight - first) || 1;
  const progress = Math.max(0, Math.min(100, (Math.abs(first - last) / total) * 100 * (Math.sign(profile.goalWeight - first) === Math.sign(last - first) ? 1 : 0)));

  const add = () => {
    const v = parse(kg);
    if (!v) return;
    setWeights((w) => [...w.filter((x) => x.date !== date), { date, kg: v }]);
    setKg("");
  };

  const addBio = () => {
    const entry: BodyEntry = { date: bioDate };
    for (const f of FIELDS) {
      const v = parse(bio[f.key] ?? "");
      if (v !== undefined) entry[f.key] = v;
    }
    if (Object.keys(entry).length === 1) {
      toast.error("Preencha pelo menos uma medida da bioimpedância");
      return;
    }
    setBody((list) => [...list.filter((b) => b.date !== bioDate), entry]);
    // The scale's weight also feeds the weight chart.
    if (entry.weightKg) setWeights((w) => [...w.filter((x) => x.date !== bioDate), { date: bioDate, kg: entry.weightKg! }]);
    setBio({});
    toast.success("Bioimpedância registrada");
  };

  const heightM = profile.height / 100;
  const bmi = last / (heightM * heightM);
  const range = BMI_RANGES.find((r) => bmi < r.max)!;
  const healthy = [18.5 * heightM * heightM, 24.9 * heightM * heightM];
  // Scale from 15 to 42 for the bar position.
  const pos = Math.max(0, Math.min(100, ((bmi - 15) / 27) * 100));

  const readings = [...body].sort((a, b) => a.date.localeCompare(b.date));
  const latest = readings.at(-1);
  const firstReading = readings[0];

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Corpo</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Peso inicial" value={`${num(first)} kg`} />
        <Stat label="Peso atual" value={`${num(last)} kg`} sub={`${last - first >= 0 ? "+" : ""}${num(last - first)} kg`} />
        <Stat label="Meta" value={`${num(profile.goalWeight)} kg`} sub={`${Math.round(progress)}% concluído`} />
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">IMC atual</div>
            <div className="font-display text-4xl font-extrabold tabular-nums">{num(bmi)}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-bold" style={{ color: range.color }}>{range.label}</div>
            <div className="text-xs text-muted-foreground">altura {num(profile.height, 0)} cm · peso {num(last)} kg</div>
          </div>
        </div>
        <div className="relative mt-4">
          <div className="flex h-3 overflow-hidden rounded-full">
            {/* Segment widths follow the 15–42 scale: 3.5, 6.5, 5, 5, 5, 2 units. */}
            {[3.5, 6.5, 5, 5, 5, 2].map((w, i) => <div key={i} style={{ flex: w, background: BMI_RANGES[i]!.color }} />)}
          </div>
          <div className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-card shadow" style={{ left: `${pos}%`, background: range.color }} />
        </div>
        <div className="relative mt-1 h-4 text-[11px] text-muted-foreground tabular-nums">
          {[18.5, 25, 30, 35, 40].map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: `${((v - 15) / 27) * 100}%` }}>{num(v)}</span>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Para a sua altura, o peso na faixa normal (IMC 18,5 a 24,9) vai de <b className="text-foreground">{num(healthy[0]!)} a {num(healthy[1]!)} kg</b>.
          O IMC não separa músculo de gordura; a bioimpedância abaixo mostra a composição.
        </p>
      </section>

      <section id="evolucao" className="scroll-mt-24 rounded-3xl border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-3 px-2 text-lg font-bold sm:px-0">Evolução do peso</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sorted.map((w) => ({ ...w, label: fmt(w.date) }))}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} tickFormatter={tick} stroke="var(--muted-foreground)" fontSize={12} width={40} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <ReferenceLine y={profile.goalWeight} stroke="var(--primary)" strokeDasharray="6 4" label={{ value: "meta", fill: "var(--primary)", fontSize: 12 }} />
              <Area type="monotone" dataKey="kg" stroke="var(--accent)" strokeWidth={3} fill="url(#wg)" dot={{ r: 4, fill: "var(--accent)" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section id="pesagem" className="scroll-mt-24 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Registrar pesagem</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="date" aria-label="Data da pesagem" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-input bg-card px-3 py-2.5" />
          <input inputMode="decimal" aria-label="Peso em kg" placeholder="Ex: 78,4" value={kg} onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} className="w-32 rounded-xl border border-input bg-card px-3 py-2.5" />
          <button onClick={add} className="rounded-full bg-accent px-6 font-bold text-accent-foreground">Salvar</button>
        </div>
        <ul className="mt-5 divide-y divide-border">
          {[...sorted].reverse().map((w) => (
            <li key={w.date} className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">{new Date(w.date + "T12:00").toLocaleDateString("pt-BR")}</span>
              <span className="flex items-center gap-4 font-display font-bold">{num(w.kg)} kg
                <button aria-label="Excluir" onClick={() => setWeights((ws) => ws.filter((x) => x.date !== w.date))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-5 rounded-3xl border border-border bg-card p-6">
        <div>
          <h2 className="text-2xl font-bold">Bioimpedância</h2>
          <p className="text-sm text-muted-foreground">Copie os números da balança ou do laudo. Preencha só o que ela mostrar.</p>
        </div>

        {latest && (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Última medição · {new Date(latest.date + "T12:00").toLocaleDateString("pt-BR")}
              {firstReading && firstReading !== latest && ` · comparada a ${new Date(firstReading.date + "T12:00").toLocaleDateString("pt-BR")}`}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FIELDS.filter((f) => latest[f.key] !== undefined).map((f) => {
                const now = latest[f.key]!;
                const before = firstReading !== latest ? firstReading?.[f.key] : undefined;
                const diff = before !== undefined ? now - before : null;
                const good = diff === null || diff === 0 || f.lowerIsBetter === null ? null : (diff < 0) === f.lowerIsBetter;
                return (
                  <div key={f.key} className="rounded-2xl bg-muted/60 px-3 py-2">
                    <div className="font-display text-lg font-bold leading-tight tabular-nums">{num(now)} <span className="text-sm">{f.unit}</span></div>
                    <div className="text-xs text-muted-foreground">
                      {f.label}
                      {diff !== null && diff !== 0 && (
                        <b className={good === null ? "" : good ? "text-[#3f9d6b]" : "text-destructive"}> · {diff > 0 ? "+" : ""}{num(diff)}</b>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {readings.filter((r) => r.fatPct !== undefined || r.muscleKg !== undefined).length > 1 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings.map((r) => ({ label: fmt(r.date), gordura: r.fatPct, musculo: r.muscleKg }))}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis yAxisId="pct" tickFormatter={tick} stroke="var(--muted-foreground)" fontSize={12} width={36} domain={["dataMin - 2", "dataMax + 2"]} />
                <YAxis yAxisId="kg" orientation="right" tickFormatter={tick} stroke="var(--muted-foreground)" fontSize={12} width={36} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="pct" type="monotone" dataKey="gordura" name="Gordura (%)" stroke="var(--accent)" strokeWidth={3} connectNulls dot={{ r: 4 }} />
                <Line yAxisId="kg" type="monotone" dataKey="musculo" name="Massa muscular (kg)" stroke="var(--primary)" strokeWidth={3} connectNulls dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-2xl border border-border p-4">
          <h3 className="font-bold">Registrar bioimpedância</h3>
          <label className="mt-3 block text-sm font-semibold">
            Data
            <input type="date" value={bioDate} onChange={(e) => setBioDate(e.target.value)} className="mt-1 block rounded-xl border border-input bg-card px-3 py-2.5 font-normal" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="text-sm font-semibold">
                {f.label} <span className="font-normal text-muted-foreground">({f.unit})</span>
                <input inputMode="decimal" placeholder={f.placeholder} value={bio[f.key] ?? ""} onChange={(e) => setBio((b) => ({ ...b, [f.key]: e.target.value }))}
                  className="mt-1 block w-full rounded-xl border border-input bg-card px-3 py-2.5 font-normal" />
              </label>
            ))}
          </div>
          <button onClick={addBio} className="mt-4 rounded-full bg-accent px-6 py-2.5 font-bold text-accent-foreground">Salvar medição</button>
        </div>

        {readings.length > 0 && (
          <ul className="divide-y divide-border">
            {[...readings].reverse().map((r) => (
              <li key={r.date} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold">{new Date(r.date + "T12:00").toLocaleDateString("pt-BR")}</span>
                  <span className="block text-muted-foreground">
                    {FIELDS.filter((f) => r[f.key] !== undefined).map((f) => `${f.label.toLowerCase()} ${num(r[f.key]!)}${f.unit === "%" ? "%" : ` ${f.unit}`}`).join(" · ")}
                  </span>
                </span>
                <button aria-label="Excluir medição" onClick={() => { if (confirm("Excluir esta medição de bioimpedância?")) setBody((list) => list.filter((x) => x.date !== r.date)); }}
                  className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-extrabold">{value}</div>
      {sub && <div className="text-sm font-semibold text-accent">{sub}</div>}
    </div>
  );
}
