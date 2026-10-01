import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight, Check, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KEYS, today, useLocal, type Profile } from "@/lib/store";
import { generatePlan, type Plan } from "@/lib/plan";
import { alternatives, byId, GROUP_LABEL, type Exercise } from "@/lib/exercises";
import { NeedProfile } from "@/components/AppShell";

export const Route = createFileRoute("/treinos")({
  head: () => ({
    meta: [
      { title: "Plano de treino — forma" },
      { name: "description", content: "Plano de treino gerado pelo seu objetivo, com ilustrações, instruções de postura e troca de exercícios." },
      { property: "og:title", content: "Plano de treino — forma" },
      { property: "og:description", content: "Treinos personalizados com ilustração de cada exercício." },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [plan, setPlan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog, setDone] = useLocal<string[]>(KEYS.done, []);
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
          return (
            <article key={i} className="flex gap-4 rounded-3xl border border-border bg-card p-3 sm:p-4">
              <button onClick={() => setDetail(ex)} className="shrink-0">
                <img src={ex.img} alt={ex.name} loading="lazy" width={816} height={816} className="h-24 w-24 rounded-2xl border border-border object-cover sm:h-28 sm:w-28" />
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
                  <button onClick={() => setDetail(ex)} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold"><Info className="h-3.5 w-3.5" />Como fazer</button>
                  <button onClick={() => setSwap({ d: active, i })} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold"><ArrowLeftRight className="h-3.5 w-3.5" />Trocar</button>
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
              <img src={detail.img} alt={detail.name} className="w-full rounded-2xl border border-border" />
              <div>
                <h4 className="font-bold">Execução</h4>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{detail.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </div>
              <div className="rounded-2xl bg-accent/10 p-4">
                <h4 className="font-bold">Postura</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{detail.posture.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!swap} onOpenChange={(o) => !o && setSwap(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {swap && (() => {
            const cur = byId(plan.days[swap.d]!.items[swap.i]!.exId);
            return (
              <>
                <DialogHeader><DialogTitle className="font-display text-xl">Trocar {cur.name}</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Alternativas que trabalham {GROUP_LABEL[cur.group].toLowerCase()}:</p>
                <div className="space-y-2">
                  {alternatives(cur.id).map((a) => (
                    <button key={a.id} onClick={() => doSwap(a.id)} className="flex w-full items-center gap-3 rounded-2xl border border-border p-2 text-left hover:border-accent">
                      <img src={a.img} alt={a.name} loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
                      <div><div className="font-bold">{a.name}</div><div className="text-xs text-muted-foreground">{a.equipment}</div></div>
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
