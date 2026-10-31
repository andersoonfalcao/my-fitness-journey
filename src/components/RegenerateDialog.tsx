import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { suggestPlans } from "@/lib/ai-plan";
import { byId } from "@/lib/exercises";
import { planOptions, recommendMethod } from "@/lib/methods";
import { type Plan } from "@/lib/plan";
import { KEYS, useLocal, type Focus, type Level, type Profile, type WorkoutSession } from "@/lib/store";

const GOALS: { v: Focus; t: string }[] = [
  { v: "perder", t: "Perder gordura" },
  { v: "massa", t: "Ganhar massa" },
  { v: "forca", t: "Ficar mais forte" },
  { v: "condicionamento", t: "Condicionamento" },
];

const LEVELS: { v: Level; t: string }[] = [
  { v: "iniciante", t: "Iniciante" },
  { v: "intermediario", t: "Intermediário" },
  { v: "avancado", t: "Avançado" },
];

/** What the new plan is built for; approving saves it to the profile, since the week and the workouts follow it. */
type Routine = Pick<Profile, "days" | "level" | "minutes">;

type Options = { source: "ai" | "catalog"; analysis?: string; plans: Plan[] };

/**
 * "Novo treino" (Treinos and Perfil): the person chooses a goal, or writes one for the AI, and sees variations of
 * plans for it. Nothing is saved until one is approved; until then the current plan stays as it is. Approving
 * restarts the sequence from the first workout, since the workouts' names and order change; history stays.
 */
export function RegenerateDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone?: () => void }) {
  const [profile, setProfile] = useLocal<Profile | null>(KEYS.profile, null);
  const [plan, setPlan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog] = useLocal<string[]>(KEYS.done, []);
  const [, setCycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [session] = useLocal<WorkoutSession | null>(KEYS.session, null);
  const [focus, setFocus] = useState<Focus>(profile?.focus ?? "perder");
  const [routine, setRoutine] = useState<Routine>({ days: profile?.days ?? 4, level: profile?.level ?? "intermediario", minutes: profile?.minutes ?? 60 });
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Options | null>(null);
  const [picked, setPicked] = useState(0);
  const [variation, setVariation] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFocus(profile?.focus ?? "perder");
      if (profile) setRoutine({ days: profile.days, level: profile.level, minutes: profile.minutes });
      setOptions(null);
      setVariation(plan?.variation ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!profile) return null;
  const draft: Profile = { ...profile, ...routine };
  const chip = (on: boolean) => `rounded-full border px-3 py-2 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`;

  const showCatalog = (v: number) => {
    setVariation(v);
    setOptions({ source: "catalog", plans: planOptions({ ...draft, focus }, v) });
    setPicked(0);
  };

  const askAi = async () => {
    setBusy(true);
    try {
      const { analysis, plans } = await suggestPlans(text, draft, plan);
      setOptions({ source: "ai", analysis, plans });
      setPicked(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível montar o treino.");
    } finally {
      setBusy(false);
    }
  };

  const approve = () => {
    const chosen = options?.plans[picked];
    if (!chosen) return;
    const goal = options.source === "ai" ? chosen.goal : GOALS.find((g) => g.v === focus)!.t;
    setPlan({ ...chosen, createdAt: new Date().toISOString(), goal });
    // A plan from the catalog keeps its method in the profile, so editing the profile later generates the same kind.
    setProfile(options.source === "catalog" ? { ...draft, method: chosen.methodId === recommendMethod(draft).id ? undefined : chosen.methodId } : draft);
    setCycleStart(doneLog.length);
    toast.success("Novo treino aprovado");
    onOpenChange(false);
    onDone?.();
  };

  const chosen = options?.plans[picked];

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Novo treino</DialogTitle>
          <DialogDescription>
            {options ? "Compare as variações e aprove a que preferir. Seu treino atual só muda quando você aprovar." : "Escolha um objetivo ou descreva o seu. Nada muda no seu treino atual até você aprovar uma das variações."}
          </DialogDescription>
        </DialogHeader>

        {!options ? (
          <div className="space-y-5">
            <section className="space-y-3">
              <span className="block font-semibold">Sua rotina</span>
              <div>
                <span className="text-sm text-muted-foreground">Dias por semana</span>
                <div className="mt-1 flex gap-2">
                  {[2, 3, 4, 5, 6].map((d) => (
                    <button key={d} type="button" onClick={() => setRoutine((r) => ({ ...r, days: d }))} aria-pressed={routine.days === d} disabled={busy}
                      className={`h-11 w-11 rounded-full border font-display text-lg font-bold ${routine.days === d ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Nível</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <button key={l.v} type="button" onClick={() => setRoutine((r) => ({ ...r, level: l.v }))} aria-pressed={routine.level === l.v} disabled={busy} className={chip(routine.level === l.v)}>{l.t}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Tempo por treino</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[...new Set([45, 60, 75, routine.minutes])].sort((a, b) => a - b).map((m) => (
                    <button key={m} type="button" onClick={() => setRoutine((r) => ({ ...r, minutes: m }))} aria-pressed={routine.minutes === m} disabled={busy} className={chip(routine.minutes === m)}>{m} min</button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <label htmlFor="goal-text" className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-accent" aria-hidden />Descreva o objetivo para a IA</label>
              <Textarea id="goal-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} disabled={busy} className="field-sizing-content max-h-[50vh] min-h-28"
                placeholder="Ex.: quero ganhar glúteos e pernas mantendo a parte de cima, treino em academia, tenho dor no joelho direito ao agachar fundo." />
              <p className="text-xs text-muted-foreground">A IA lê o objetivo com a rotina acima e o seu perfil e monta três variações com exercícios da biblioteca.</p>
              <Button type="button" onClick={askAi} disabled={busy || text.trim().length < 5} className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                {busy ? <><Loader2 className="animate-spin" />A IA está montando o treino…</> : <><Sparkles />Montar com a IA</>}
              </Button>
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <span className="block font-semibold">Ou escolha um objetivo</span>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button key={g.v} type="button" onClick={() => setFocus(g.v)} aria-pressed={focus === g.v} disabled={busy}
                    className={chip(focus === g.v)}>{g.t}</button>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={() => showCatalog(variation)} disabled={busy} className="w-full rounded-full">Ver variações</Button>
              {focus !== profile.focus && <p className="text-xs text-muted-foreground">Muda só o treino. As metas de calorias seguem o objetivo do perfil.</p>}
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            {options.analysis && <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm">{options.analysis}</p>}
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Variações de treino">
              {options.plans.map((pl, i) => (
                <button key={i} type="button" role="radio" aria-checked={picked === i} onClick={() => setPicked(i)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${picked === i ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                  {i + 1}. {pl.method}
                </button>
              ))}
            </div>
            {chosen && <PlanPreview plan={chosen} />}
            {session ? (
              <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Há um treino em andamento. Conclua ou cancele antes de trocar o plano.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Ao aprovar, dias por semana, nível e tempo por treino passam a ser os do seu perfil, e a sequência recomeça do primeiro treino do novo plano e as trocas feitas à mão no plano atual se perdem. O histórico e as cargas continuam.</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOptions(null)} disabled={busy} className="rounded-full"><ArrowLeft />Objetivo</Button>
              <Button type="button" variant="secondary" disabled={busy} className="rounded-full"
                onClick={() => (options.source === "ai" ? askAi() : showCatalog(variation + 1))}>
                {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Outras opções
              </Button>
              <Button type="button" onClick={approve} disabled={!!session || busy} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><Check />Aprovar este treino</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The workouts of a proposed plan, read-only. */
function PlanPreview({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{plan.summary}</p>
      {plan.days.map((d) => (
        <section key={d.name} className="rounded-2xl border border-border p-3">
          <div className="font-bold">{d.name}</div>
          {d.focus && <div className="text-xs text-muted-foreground">{d.focus}</div>}
          <ol className="mt-2 space-y-1 text-sm">
            {d.items.map((it) => (
              <li key={it.exId} className="flex justify-between gap-3">
                <span className="min-w-0">{byId(it.exId).name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{it.sets}×{it.reps}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
