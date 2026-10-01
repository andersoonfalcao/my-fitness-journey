import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KEYS, today, useLocal, type Profile, type WeightEntry } from "@/lib/store";
import { NeedProfile } from "@/components/AppShell";

export const Route = createFileRoute("/peso")({
  head: () => ({
    meta: [
      { title: "Evolução do peso — forma" },
      { name: "description", content: "Registre seu peso e acompanhe a evolução em direção à sua meta." },
      { property: "og:title", content: "Evolução do peso — forma" },
      { property: "og:description", content: "Gráfico de evolução do peso com linha de meta." },
    ],
  }),
  component: PesoPage,
});

const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

function PesoPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [weights, setWeights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(today());

  if (!ready) return null;
  if (!profile) return <NeedProfile />;

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]?.kg ?? profile.weight;
  const last = sorted.at(-1)?.kg ?? profile.weight;
  const total = Math.abs(profile.goalWeight - first) || 1;
  const progress = Math.max(0, Math.min(100, (Math.abs(first - last) / total) * 100 * (Math.sign(profile.goalWeight - first) === Math.sign(last - first) ? 1 : 0)));

  const add = () => {
    const v = Number(kg.replace(",", "."));
    if (!v) return;
    setWeights((w) => [...w.filter((x) => x.date !== date), { date, kg: v }]);
    setKg("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Evolução do peso</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Inicial" value={`${first.toFixed(1)} kg`} />
        <Stat label="Atual" value={`${last.toFixed(1)} kg`} sub={`${last - first >= 0 ? "+" : ""}${(last - first).toFixed(1)} kg`} />
        <Stat label="Meta" value={`${profile.goalWeight} kg`} sub={`${Math.round(progress)}% concluído`} />
      </div>

      <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
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
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} stroke="var(--muted-foreground)" fontSize={12} width={40} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <ReferenceLine y={profile.goalWeight} stroke="var(--primary)" strokeDasharray="6 4" label={{ value: "meta", fill: "var(--primary)", fontSize: 12 }} />
              <Area type="monotone" dataKey="kg" stroke="var(--accent)" strokeWidth={3} fill="url(#wg)" dot={{ r: 4, fill: "var(--accent)" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Registrar pesagem</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-input bg-card px-3 py-2.5" />
          <input inputMode="decimal" placeholder="Ex: 78,4" value={kg} onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} className="w-32 rounded-xl border border-input bg-card px-3 py-2.5" />
          <button onClick={add} className="rounded-full bg-accent px-6 font-bold text-accent-foreground">Salvar</button>
        </div>
        <ul className="mt-5 divide-y divide-border">
          {[...sorted].reverse().map((w) => (
            <li key={w.date} className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">{new Date(w.date + "T12:00").toLocaleDateString("pt-BR")}</span>
              <span className="flex items-center gap-4 font-display font-bold">{w.kg.toFixed(1)} kg
                <button aria-label="Excluir" onClick={() => setWeights((ws) => ws.filter((x) => x.date !== w.date))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </span>
            </li>
          ))}
        </ul>
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
