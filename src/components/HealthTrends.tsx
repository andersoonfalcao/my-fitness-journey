import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocal } from "@/lib/store";
import { healthKey, sleepLabel, type HealthMonth } from "@/lib/health";

const monthsBack = (n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (n - 1 - i));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
});
const label = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const tooltip = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };

/** Corpo → Evolução: nights of sleep, resting heart rate and VO2 max sent from the iPhone's Health app. */
export function HealthTrends() {
  const [m0, m1, m2] = monthsBack(3);
  const [a] = useLocal<HealthMonth>(healthKey(m0!), {});
  const [b] = useLocal<HealthMonth>(healthKey(m1!), {});
  const [c] = useLocal<HealthMonth>(healthKey(m2!), {});
  const days = Object.entries({ ...a, ...b, ...c }).sort(([x], [y]) => x.localeCompare(y));
  if (!days.length) return null;

  const sleep = days.filter(([, d]) => d.sleepMin !== undefined).slice(-14).map(([date, d]) => ({ label: label(date), horas: Math.round((d.sleepMin! / 60) * 10) / 10, min: d.sleepMin! }));
  const resting = days.filter(([, d]) => d.restingHr !== undefined).slice(-30).map(([date, d]) => ({ label: label(date), bpm: d.restingHr! }));
  const vo2 = days.filter(([, d]) => d.vo2max !== undefined).map(([date, d]) => ({ label: label(date), vo2: d.vo2max! }));
  const avgSleep = sleep.length ? Math.round(sleep.reduce((s, d) => s + d.min, 0) / sleep.length) : null;

  return (
    <section id="saude" className="scroll-mt-24 space-y-6 rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="px-2 sm:px-0">
        <h2 className="text-2xl font-bold">Recuperação</h2>
        <p className="text-sm text-muted-foreground">Da sua Mi Band, pelo app Saúde do iPhone.</p>
      </div>

      {sleep.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2 px-2 sm:px-0">
            <h3 className="font-bold">Sono</h3>
            {avgSleep !== null && <span className="text-sm text-muted-foreground">média {sleepLabel(avgSleep)}</span>}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleep}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} interval="preserveStartEnd" />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} width={28} domain={[0, (max: number) => Math.max(9, Math.ceil(max))]} />
                <Tooltip formatter={(_v, _n, item) => [sleepLabel((item.payload as { min: number }).min), "sono"]} contentStyle={tooltip} />
                <Bar dataKey="horas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {resting.length > 0 && (
        <TrendLine title="Batimento em repouso" unit="bpm" data={resting} dataKey="bpm" hint="Caindo com o tempo é sinal de melhor condicionamento; um salto de um dia para o outro pode ser cansaço ou noite mal dormida." />
      )}
      {vo2.length > 0 && (
        <TrendLine title="VO2 máx" unit="mL/kg/min" data={vo2} dataKey="vo2" hint="Estimativa do condicionamento aeróbico; muda devagar, ao longo de semanas." />
      )}
    </section>
  );
}

function TrendLine({ title, unit, data, dataKey, hint }: { title: string; unit: string; data: Record<string, string | number>[]; dataKey: string; hint: string }) {
  const last = data.at(-1)![dataKey] as number;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 px-2 sm:px-0">
        <h3 className="font-bold">{title}</h3>
        <span className="whitespace-nowrap font-display text-lg font-extrabold tabular-nums">{last.toLocaleString("pt-BR")} <span className="text-sm font-semibold text-muted-foreground">{unit}</span></span>
      </div>
      {data.length > 1 && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} interval="preserveStartEnd" />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} width={32} allowDecimals={false}
                domain={[(min: number) => Math.floor(min - 3), (max: number) => Math.ceil(max + 3)]} tickFormatter={(v: number) => v.toLocaleString("pt-BR")} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString("pt-BR")} ${unit}`, title]} contentStyle={tooltip} />
              <Line type="monotone" dataKey={dataKey} stroke="var(--accent)" strokeWidth={3} dot={{ r: 3, fill: "var(--accent)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-1 px-2 text-xs text-muted-foreground sm:px-0">{hint}</p>
    </div>
  );
}
