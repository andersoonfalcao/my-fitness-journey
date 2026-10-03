import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight, Check, Info, RefreshCw, Save, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KEYS, today, uid, useLocal, type LoadEntry, type Profile } from "@/lib/store";
import { generatePlan, type Plan } from "@/lib/plan";
import { alternatives, byId, GROUP_LABEL, type Exercise } from "@/lib/exercises";
import { NeedProfile } from "@/components/AppShell";
import { ExerciseMedia } from "@/components/ExerciseMedia";

export const Route = createFileRoute("/treinos")({
  head: () => ({
    meta: [
      { title: "Plano de treino — forma" },
      { name: "description", content: "Plano de treino gerado pelo seu objetivo, com ilustrações, instruções de postura e troca de exercícios." },
      { property: "og:title", content: "Plano de treino — forma" },
      { property: "og:description", content: "Treinos personalizados com ilustração, registro e evolução de carga por exercício." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [plan, setPlan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog, setDone] = useLocal<string[]>(KEYS.done, []);
  const [loads, setLoads] = useLocal<LoadEntry[]>(KEYS.loads, []);
  const [loadInputs, setLoadInputs] = useState<Record<string, string>>({});
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [swap, setSwap] = useState<{ d: number; i: number } | null>(null);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;
  if (!plan) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-bold">Nenhum plano ainda</h2>
        <button onClick={() => setPlan(generatePlan(profile))} className="mt-4 rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground">Gerar plano</button>
      </div>
    );
  }

  const nextIdx = doneLog.length % plan.days.length;
  const active = dayIdx ?? nextIdx;
  const day = plan.days[active] ?? plan.days[0]!;

  const doSwap = (newId: string) => {
    if (!swap) return;
    const days = plan.days.map((d, di) => di !== swap.d ? d : { ...d, items: d.items.map((it, ii) => ii === swap.i ? { ...it, exId: newId } : it) });
    setPlan({ ...plan, days });
    toast.success(`Trocado por ${byId(newId).name}`);
    setSwap(null);
  };

  const historyFor = (exerciseId: string) =>
    loads
      .filter((entry) => entry.exerciseId === exerciseId)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? 0) - (b.createdAt ?? 0));

  const saveLoad = (exerciseId: string) => {
    const value = Number((loadInputs[exerciseId] ?? "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Digite uma carga válida em kg");
      return;
    }
    setLoads((entries) => [...entries, { id: uid(), exerciseId, date: today(), kg: value, createdAt: Date.now() }]);
    setLoadInputs((inputs) => ({ ...inputs, [exerciseId]: "" }));
    toast.success("Carga registrada");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">{plan.method}</p>
          <h1 className="mt-1 text-4xl font-extrabold">Seu plano de treino</h1>
        </div>
        <button onClick={() => { if (confirm("Gerar um novo plano? Suas trocas serão perdidas.")) { setPlan(generatePlan(profile)); toast.success("Novo plano gerado"); } }}
          className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" />Regerar</button>
      </div>
      <p className="max-w-3xl text-muted-foreground">{plan.summary}</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {plan.days.map((d, i) => (
          <button key={i} onClick={() => setDayIdx(i)}
            className={`shrink-0 rounded-2xl border-2 px-4 py-3 text-left ${i === active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            <div className="font-display font-bold">{d.name}</div>
            <div className="text-xs opacity-75">{d.focus}</div>
            {i === nextIdx && <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-accent">próximo</div>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {day.items.map((it, i) => {
          const ex = byId(it.exId);
          const history = historyFor(ex.id);
          const latest = history.at(-1);
          const previous = history.at(-2);
          const variation = latest && previous ? latest.kg - previous.kg : null;
          return (
            <article key={i} className="flex gap-4 rounded-3xl border border-border bg-card p-3 sm:p-4">
              <button onClick={() => setDetail(ex)} className="shrink-0" aria-label={`Ver detalhes de ${ex.name}`}>
                <ExerciseMedia exercise={ex} compact className="h-24 w-24 rounded-2xl border border-border sm:h-28 sm:w-28" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{GROUP_LABEL[ex.group]} · {ex.equipment}</div>
                <h3 className="font-display text-lg font-bold leading-tight">{ex.name}</h3>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                  <span><b className="font-display text-accent">{it.sets}</b> séries</span>
                  <span><b className="font-display text-accent">{it.reps}</b> reps</span>
                  <span>descanso <b>{it.rest}s</b></span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setDetail(ex)} className="rounded-full"><Info />Detalhes</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setSwap({ d: active, i })} className="rounded-full"><ArrowLeftRight />Trocar</Button>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-muted-foreground">Carga usada</span>
                    {latest && (
                      <button type="button" onClick={() => setDetail(ex)} className="inline-flex items-center gap-1 font-semibold text-primary">
                        Última: {formatKg(latest.kg)}
                        {variation !== null && variation !== 0 && (
                          <span className={variation > 0 ? "text-accent" : "text-destructive"}>
                            {variation > 0 ? <TrendingUp className="inline h-3.5 w-3.5" /> : <TrendingDown className="inline h-3.5 w-3.5" />} {variation > 0 ? "+" : ""}{variation.toLocaleString("pt-BR")} kg
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative max-w-36 flex-1">
                      <Input
                        aria-label={`Carga de ${ex.name} em kg`}
                        inputMode="decimal"
                        placeholder={latest ? String(latest.kg).replace(".", ",") : "Ex: 40"}
                        value={loadInputs[ex.id] ?? ""}
                        onChange={(event) => setLoadInputs((inputs) => ({ ...inputs, [ex.id]: event.target.value }))}
                        onKeyDown={(event) => event.key === "Enter" && saveLoad(ex.id)}
                        className="pr-9"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                    </div>
                    <Button type="button" size="sm" onClick={() => saveLoad(ex.id)} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                      <Save />Registrar
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button onClick={() => { setDone((d) => [...d, `${today()}|${day.name}`]); setDayIdx(null); toast.success("Treino concluído! 💪"); }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent py-4 font-display text-lg font-bold text-accent-foreground">
        <Check className="h-5 w-5" />Concluir {day.name}
      </button>
      <p className="text-center text-sm text-muted-foreground">{doneLog.length} treino(s) concluído(s) até agora.</p>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader><DialogTitle className="font-display text-2xl">{detail.name}</DialogTitle></DialogHeader>
              <ExerciseMedia exercise={detail} className="aspect-square w-full rounded-2xl border border-border" />
              <div>
                <h4 className="font-bold">Execução</h4>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{detail.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </div>
              <div className="rounded-2xl bg-accent/10 p-4">
                <h4 className="font-bold">Postura</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{detail.posture.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <LoadHistory
                entries={historyFor(detail.id)}
                onDelete={(id) => setLoads((entries) => entries.filter((entry) => entry.id !== id))}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!swap} onOpenChange={(o) => !o && setSwap(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {swap && (() => {
            const planDay = plan.days[swap.d];
            const planItem = planDay?.items[swap.i];
            if (!planItem) return null;
            const cur = byId(planItem.exId);
            return (
              <>
                <DialogHeader><DialogTitle className="font-display text-xl">Trocar {cur.name}</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Alternativas para {GROUP_LABEL[cur.group].toLowerCase()}, priorizando movimentos mais parecidos:</p>
                <div className="space-y-2">
                  {alternatives(cur.id).map((a, index) => (
                    <button key={a.id} onClick={() => doSwap(a.id)} className="flex w-full items-center gap-3 rounded-2xl border border-border p-2 text-left hover:border-accent">
                      <img src={a.img} alt={a.name} loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.equipment}</div>
                        {index === 0 && a.pattern === cur.pattern && <div className="mt-1 text-xs font-bold text-accent">Movimento mais próximo</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatKg(kg: number) {
  return `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function LoadHistory({ entries, onDelete }: { entries: LoadEntry[]; onDelete: (id: string) => void }) {
  const chartData = entries.map((entry) => ({ ...entry, label: formatDate(entry.date) }));

  return (
    <section className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-bold">Evolução de carga</h4>
        <span className="text-xs text-muted-foreground">{entries.length} registro(s)</span>
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Registre uma carga no treino para começar o histórico.</p>
      ) : (
        <>
          <div className="mt-3 h-52 w-full" aria-label="Gráfico de evolução de carga">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="load-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} stroke="var(--muted-foreground)" fontSize={11} unit=" kg" width={62} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString("pt-BR")} kg`, "Carga"]}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="kg" stroke="var(--accent)" strokeWidth={3} fill="url(#load-gradient)" dot={{ r: 4, fill: "var(--accent)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 max-h-40 divide-y divide-border overflow-y-auto">
            {[...entries].reverse().map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                <span className="flex items-center gap-3 font-display font-bold">
                  {formatKg(entry.kg)}
                  <Button type="button" variant="ghost" size="icon" aria-label={`Excluir carga de ${formatDate(entry.date)}`} onClick={() => onDelete(entry.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
