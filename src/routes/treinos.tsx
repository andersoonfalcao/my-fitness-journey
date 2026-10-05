import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftRight, Check, CheckCheck, ChevronDown, Info, Play, RefreshCw, RotateCcw, Save, Share2, Timer, Trash2, TrendingDown, TrendingUp, Youtube } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KEYS, today, uid, useLocal, type LoadEntry, type Profile, type WorkoutRecord, type WorkoutSession } from "@/lib/store";
import { generatePlan, nextWorkoutIndex, normalizePlan, repsCount, repsFor, type Plan } from "@/lib/plan";
import { alternatives, byId, GROUP_LABEL, youtubeSearchUrl, type Exercise } from "@/lib/exercises";
import { NeedProfile } from "@/components/AppShell";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { photosFor } from "@/lib/exercise-photos";
import { StravaActivities } from "@/components/StravaActivities";
import { ShareDialog, type ShareRequest } from "@/components/ShareDialog";
import { workoutCard } from "@/lib/share-card";
import { lastRecordBefore, recordTotal, repsOfSet, sumKg, volume, type SetValues } from "@/lib/workout-stats";

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
  const [cycleStart, setCycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [loads, setLoads] = useLocal<LoadEntry[]>(KEYS.loads, []);
  const [session, setSession] = useLocal<WorkoutSession | null>(KEYS.session, null);
  const [history, setHistory] = useLocal<WorkoutRecord[]>(KEYS.history, []);
  const [share, setShare] = useState<ShareRequest | null>(null);
  const [loadInputs, setLoadInputs] = useState<Record<string, string>>({});
  const [repsInputs, setRepsInputs] = useState<Record<string, string>>({});
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [swap, setSwap] = useState<{ d: number; i: number } | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);

  // Plans saved before single rep targets still carry ranges like "6–10"; convert them once.
  useEffect(() => {
    if (plan && normalizePlan(plan) !== plan) setPlan(normalizePlan(plan));
  }, [plan, setPlan]);

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

  const nextIdx = nextWorkoutIndex(doneLog.length, cycleStart, plan.days.length);
  const sessionIdx = session ? plan.days.findIndex((d) => d.name === session.dayName) : -1;
  const active = dayIdx ?? (sessionIdx >= 0 ? sessionIdx : nextIdx);
  const day = plan.days[active] ?? plan.days[0]!;
  const finishDay = plan.days[sessionIdx] ?? day;
  // Set tracking belongs to the day being trained; other tabs are view-only while a session runs.
  const tracksSets = !session || sessionIdx === active || sessionIdx < 0;

  const completeSet = (i: number, kg: number | null, reps: number | null) => {
    const item = day.items[i]!;
    unlockAudio();
    const base = session ?? { dayName: day.name, startedAt: Date.now() };
    const done = (base.sets?.[i] ?? 0) + 1;
    if (done > item.sets) return;
    const sets = { ...base.sets, [i]: done };
    const kgs = { ...base.kgs, [i]: [...(base.kgs?.[i] ?? []), kg] };
    const repsDone = { ...base.repsDone, [i]: [...(base.repsDone?.[i] ?? []), reps] };
    setRepsInputs((inputs) => ({ ...inputs, [item.exId]: "" }));
    const pending = day.items.map((it, j) => j).filter((j) => (sets[j] ?? 0) < day.items[j]!.sets);
    if (pending.length === 0) {
      setSession({ ...base, sets, kgs, repsDone, rest: undefined });
      toast.success("Todas as séries feitas! Agora é só concluir o treino.");
      return;
    }
    const nextJ = done < item.sets ? i : pending.find((j) => j > i) ?? pending[0]!;
    const nextItem = day.items[nextJ]!;
    const next = `Série ${(sets[nextJ] ?? 0) + 1} de ${nextItem.sets} · ${byId(nextItem.exId).name}`;
    setSession({ ...base, sets, kgs, repsDone, rest: { item: i, endsAt: Date.now() + item.rest * 1000, next } });
  };

  // Comparison baseline: the last time this same workout (by name) was finished.
  const lastRecordOf = (dayName: string) => lastRecordBefore(history, dayName);
  const previousOf = (record: WorkoutRecord | undefined, i: number, exId: string) =>
    record?.exercises[i]?.exId === exId ? record.exercises[i] : record?.exercises.find((e) => e.exId === exId);

  const finishSets = (session && sessionIdx >= 0 ? session.sets : undefined) ?? {};
  const finishKgs = (session && sessionIdx >= 0 ? session.kgs : undefined) ?? {};
  const finishReps = (session && sessionIdx >= 0 ? session.repsDone : undefined) ?? {};
  const todayTotal = finishDay.items.reduce((sum, it, i) => sum + volume(finishKgs[i], finishReps[i], it.reps), 0);
  const lastFinishTotal = recordTotal(lastRecordOf(finishDay.name));
  const pendingItems = finishDay.items
    .map((it, i) => ({ it, i, done: finishSets[i] ?? 0 }))
    .filter(({ it, done }) => done < it.sets);

  const finishWorkout = () => {
    const finishedAt = Date.now();
    const record: WorkoutRecord = {
      id: uid(),
      date: today(),
      dayName: finishDay.name,
      startedAt: session?.startedAt,
      finishedAt,
      durationMs: session ? finishedAt - session.startedAt : undefined,
      exercises: finishDay.items.map((it, i) => {
        const ex = byId(it.exId);
        // Only loads logged during this session belong to this workout.
        const kg = session ? loads.filter((l) => l.exerciseId === ex.id && (l.createdAt ?? 0) >= session.startedAt).at(-1)?.kg : undefined;
        return { exId: ex.id, name: ex.name, setsDone: finishSets[i] ?? 0, setsPlanned: it.sets, reps: it.reps, kg, setKgs: finishKgs[i] ?? [], setReps: finishReps[i] ?? [] };
      }),
    };
    setHistory((records) => [...records, record]);
    setShare(workoutShare(record, lastRecordBefore(history, record.dayName)));
    setDone((d) => [...d, `${today()}|${finishDay.name}`]);
    setDayIdx(null);
    setConfirmFinish(false);
    setLoadInputs({});
    setRepsInputs({});
    const weight = todayTotal > 0
      ? ` · ${formatKg(todayTotal)}${lastFinishTotal > 0 ? ` (${formatDiff(todayTotal - lastFinishTotal)} vs. última vez)` : ""}`
      : "";
    toast.success(session ? `Treino concluído em ${formatDuration(finishedAt - session.startedAt)}${weight}! 💪` : "Treino concluído! 💪");
    setSession(null);
  };

  const undoSet = (i: number) => {
    if (!session) return;
    setSession({
      ...session,
      sets: { ...session.sets, [i]: Math.max(0, (session.sets?.[i] ?? 0) - 1) },
      kgs: { ...session.kgs, [i]: (session.kgs?.[i] ?? []).slice(0, -1) },
      repsDone: { ...session.repsDone, [i]: (session.repsDone?.[i] ?? []).slice(0, -1) },
      rest: undefined,
    });
  };

  const doSwap = (newId: string) => {
    if (!swap) return;
    const days = plan.days.map((d, di) => di !== swap.d ? d : { ...d, items: d.items.map((it, ii) => ii === swap.i ? { ...it, exId: newId, reps: repsFor(profile, byId(newId)) } : it) });
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
      {nextIdx !== 0 && !session && (
        <button
          onClick={() => {
            if (!confirm(`Recomeçar a sequência? O próximo treino passa a ser o ${plan.days[0]!.name}. Seu histórico não muda.`)) return;
            setCycleStart(doneLog.length);
            setDayIdx(null);
            toast.success(`Sequência recomeçada: próximo é o ${plan.days[0]!.name}`);
          }}
          className="-mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          <RotateCcw className="h-4 w-4" />Recomeçar do {plan.days[0]!.name}
        </button>
      )}

      {session ? (
        <div className="sticky top-[4.25rem] z-20 rounded-3xl bg-primary px-5 py-3 text-primary-foreground shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Timer className="h-6 w-6 text-accent" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-75">{session.dayName} em andamento</div>
                <WorkoutClock startedAt={session.startedAt} className="font-display text-3xl font-extrabold tabular-nums" />
              </div>
            </div>
            <button onClick={() => { if (confirm("Cancelar o treino? O tempo não será salvo.")) { setSession(null); setLoadInputs({}); } }}
              className="text-sm font-semibold underline-offset-4 opacity-75 hover:underline">Cancelar</button>
          </div>
          {(todayTotal > 0 || lastFinishTotal > 0) && (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 border-t border-primary-foreground/20 pt-2 text-sm">
              <span className="opacity-75">Peso total</span>
              <b className="font-display tabular-nums">{formatKg(todayTotal)}</b>
              {lastFinishTotal > 0 && <span className="opacity-75">de {formatKg(lastFinishTotal)} da última vez</span>}
              {lastFinishTotal > 0 && todayTotal > lastFinishTotal && <b className="text-accent">{formatDiff(todayTotal - lastFinishTotal)}</b>}
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setSession({ dayName: day.name, startedAt: Date.now() })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-display text-lg font-bold text-primary-foreground">
          <Play className="h-5 w-5" />Iniciar {day.name}
        </button>
      )}

      <div className="space-y-3">
        {day.items.map((it, i) => {
          const ex = byId(it.exId);
          const history = historyFor(ex.id);
          const latest = history.at(-1);
          const previous = history.at(-2);
          const variation = latest && previous ? latest.kg - previous.kg : null;
          const setsDone = tracksSets ? session?.sets?.[i] ?? 0 : 0;
          const kgsToday = tracksSets ? session?.kgs?.[i] ?? [] : [];
          const prev = previousOf(lastRecordOf(day.name), i, ex.id);
          const suggested = kgsToday.at(-1) ?? prev?.setKgs?.[setsDone] ?? latest?.kg;
          const typed = (loadInputs[ex.id] ?? "").trim();
          const typedKg = typed ? Number(typed.replace(",", ".")) : undefined;
          const setKg = typed ? typedKg : suggested;
          // Reps are optional: empty means the plan target. Time-based work (plank) has no reps.
          const targetReps = repsCount(it.reps);
          const repsToday = tracksSets ? session?.repsDone?.[i] ?? [] : [];
          const typedRepsText = (repsInputs[ex.id] ?? "").trim();
          const typedReps = typedRepsText ? Number(typedRepsText) : undefined;
          const setReps = typedReps ?? targetReps;
          const onCompleteSet = () => {
            if (typedKg !== undefined && (!Number.isFinite(typedKg) || typedKg < 0)) {
              toast.error("Digite um peso válido em kg");
              return;
            }
            if (typedReps !== undefined && (!Number.isInteger(typedReps) || typedReps < 1 || typedReps > 100)) {
              toast.error("Digite um número de repetições entre 1 e 100");
              return;
            }
            completeSet(i, setKg ?? null, targetReps === null ? null : setReps);
          };
          return (
            <article key={i} className={`flex gap-4 rounded-3xl border p-3 sm:p-4 ${setsDone >= it.sets ? "border-accent bg-accent/5" : "border-border bg-card"}`}>
              <ExerciseMedia exercise={ex} compact onOpen={() => setDetail(ex)} className="h-24 w-24 shrink-0 rounded-2xl border border-border sm:h-28 sm:w-28" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{GROUP_LABEL[ex.group]} · {ex.equipment}</div>
                <h3 className="font-display text-lg font-bold leading-tight">{ex.name}</h3>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                  <span><b className="font-display text-accent">{it.sets}</b> séries</span>
                  <span><b className="font-display text-accent">{it.reps}</b> {repsCount(it.reps) ? "reps" : "por série"}</span>
                  <span>descanso <b>{it.rest}s</b></span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setDetail(ex)} className="rounded-full"><Info />Detalhes</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setSwap({ d: active, i })} className="rounded-full"><ArrowLeftRight />Trocar</Button>
                  <Button asChild variant="secondary" size="sm" className="rounded-full">
                    <a href={youtubeSearchUrl(ex)} target="_blank" rel="noopener noreferrer" aria-label={`Ver execução de ${ex.name} no YouTube (abre em nova aba)`}>
                      <Youtube />YouTube
                    </a>
                  </Button>
                </div>
                {tracksSets && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex gap-1" role="img" aria-label={`${setsDone} de ${it.sets} séries feitas`}>
                      {Array.from({ length: it.sets }, (_, s) => (
                        <span key={s} className={`h-2.5 w-5 rounded-full ${s < setsDone ? "bg-accent" : "bg-muted"}`} />
                      ))}
                    </div>
                    {setsDone < it.sets ? (
                      <span className="text-sm font-semibold text-muted-foreground">Série {setsDone + 1} de {it.sets}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-accent"><CheckCheck className="h-4 w-4" />Exercício concluído</span>
                    )}
                    {setsDone > 0 && (
                      <button type="button" onClick={() => undoSet(i)} className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline">Desfazer</button>
                    )}
                  </div>
                )}
                {tracksSets && (kgsToday.length > 0 || sumKg(prev?.setKgs) > 0) && (
                  <dl className="mt-2 space-y-0.5 text-xs">
                    {kgsToday.length > 0 && (
                      <div className="flex flex-wrap gap-x-1">
                        <dt className="font-bold">Hoje:</dt>
                        <dd className="tabular-nums">{formatSetKgs(kgsToday, repsToday, it.reps)}</dd>
                      </div>
                    )}
                    {sumKg(prev?.setKgs) > 0 && (
                      <div className="flex flex-wrap gap-x-1 text-muted-foreground">
                        <dt className="font-bold">Última vez:</dt>
                        <dd className="tabular-nums">{formatSetKgs(prev!.setKgs!, prev!.setReps, prev!.reps)}</dd>
                        {kgsToday.length > 0 && setsDone >= it.sets && (() => {
                          const diff = volume(kgsToday, repsToday, it.reps) - volume(prev!.setKgs, prev!.setReps, prev!.reps);
                          return <dd className={`font-bold ${diff >= 0 ? "text-accent" : "text-destructive"}`}>{formatDiff(diff)}</dd>;
                        })()}
                      </div>
                    )}
                  </dl>
                )}
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
                  <div className="flex flex-wrap gap-2">
                    <div className="relative w-[calc(50%-0.25rem)] sm:w-28">
                      <Input
                        aria-label={`Carga de ${ex.name} em kg`}
                        inputMode="decimal"
                        placeholder={suggested !== undefined ? String(suggested).replace(".", ",") : "Ex: 40"}
                        value={loadInputs[ex.id] ?? ""}
                        onChange={(event) => setLoadInputs((inputs) => ({ ...inputs, [ex.id]: event.target.value }))}
                        onKeyDown={(event) => event.key === "Enter" && saveLoad(ex.id)}
                        className="pr-9"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                    </div>
                    {tracksSets && setsDone < it.sets && targetReps !== null && (
                      <div className="relative w-[calc(50%-0.25rem)] sm:w-24">
                        <Input
                          aria-label={`Repetições feitas na série ${setsDone + 1} de ${ex.name} (opcional)`}
                          inputMode="numeric"
                          placeholder={String(targetReps)}
                          value={repsInputs[ex.id] ?? ""}
                          onChange={(event) => setRepsInputs((inputs) => ({ ...inputs, [ex.id]: event.target.value }))}
                          onKeyDown={(event) => event.key === "Enter" && onCompleteSet()}
                          className="pr-11"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">reps</span>
                      </div>
                    )}
                    <Button type="button" size="sm" onClick={() => saveLoad(ex.id)} className="shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                      <Save />Registrar
                    </Button>
                  </div>
                  {tracksSets && setsDone < it.sets && (
                    <Button type="button" onClick={onCompleteSet} className="mt-2 h-auto min-h-9 w-full whitespace-normal rounded-full py-2">
                      <Check />Concluir série {setsDone + 1}
                      {setKg !== undefined && Number.isFinite(setKg) ? ` · ${formatKg(setKg)}` : ""}
                      {targetReps !== null && setReps !== undefined && Number.isFinite(setReps) ? ` × ${setReps}` : ""}
                    </Button>
                  )}
                </div>
                {tracksSets && session?.rest?.item === i && (
                  <RestCountdown
                    key={session.rest.endsAt}
                    endsAt={session.rest.endsAt}
                    next={session.rest.next}
                    onAdd={(seconds) => setSession((s) => s?.rest ? { ...s, rest: { ...s.rest, endsAt: s.rest.endsAt + seconds * 1000 } } : s)}
                    onDone={() => setSession((s) => s && { ...s, rest: undefined })}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <button onClick={() => (pendingItems.length > 0 ? setConfirmFinish(true) : finishWorkout())}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent py-4 font-display text-lg font-bold text-accent-foreground">
        <Check className="h-5 w-5" />Concluir {finishDay.name}
      </button>
      <p className="text-center text-sm text-muted-foreground">{doneLog.length} treino(s) concluído(s) até agora.</p>

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Ainda falta exercício</AlertDialogTitle>
            <AlertDialogDescription>
              {finishDay.items.every((_, i) => !finishSets[i])
                ? `Nenhuma série do ${finishDay.name} foi marcada. Quer concluir mesmo assim?`
                : `Você ainda não terminou ${pendingItems.length} exercício(s) do ${finishDay.name}:`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
            {pendingItems.map(({ it, i, done }) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">{byId(it.exId).name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-accent">faltam {it.sets - done} de {it.sets}</span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">Voltar ao treino</AlertDialogCancel>
            <AlertDialogAction onClick={finishWorkout} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">Concluir mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StravaActivities />

      <WorkoutHistory records={history} onDelete={(id) => setHistory((records) => records.filter((r) => r.id !== id))} onShare={setShare} />
      <ShareDialog request={share} onClose={() => setShare(null)} />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {/* Flex column + shrink-0: in the default grid the max height squeezed the square media over the text below. */}
        <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader><DialogTitle className="font-display text-2xl">{detail.name}</DialogTitle></DialogHeader>
              <ExerciseMedia exercise={detail} className="aspect-[3/2] w-full shrink-0 rounded-2xl border border-border" />
              <p className="-mt-2 text-xs text-muted-foreground">
                {GROUP_LABEL[detail.group]} · {detail.equipment}
                {detail.mediaId && !photosFor(detail.id) && <> · Ilustração de referência: {byId(detail.mediaId).name}</>}
              </p>
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
            const { same, similar } = alternatives(cur.id);
            const inDay = new Set(planDay.items.map((it) => it.exId));
            const section = (title: string, hint: string, options: Exercise[]) => options.length > 0 && (
              <section className="space-y-2">
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                {options.map((a) => (
                  <button key={a.id} onClick={() => doSwap(a.id)} disabled={inDay.has(a.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border p-2 text-left hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border">
                    <img src={photosFor(a.id)?.[1] ?? a.img} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <div className="font-bold leading-tight">{a.name}</div>
                      <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{a.equipment}</span>
                      {inDay.has(a.id) && <span className="ml-2 text-xs text-muted-foreground">já está neste treino</span>}
                    </div>
                  </button>
                ))}
              </section>
            );
            return (
              <>
                <DialogHeader><DialogTitle className="font-display text-xl">Trocar {cur.name}</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Opções para {GROUP_LABEL[cur.group].toLowerCase()}. O histórico de carga de cada exercício continua separado.
                </p>
                {section("Mesmo movimento", "Mesmo estímulo, muda o equipamento ou a posição.", same)}
                {section("Movimento parecido", "Mesma região e mesmos músculos, com outra forma de trabalhar.", similar)}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${String(m).padStart(2, "0")}:${s}`;
}

function WorkoutClock({ startedAt, className }: { startedAt: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className={className} role="timer" aria-label="Tempo de treino">{formatDuration(now - startedAt)}</div>;
}

// Browsers only allow sound after a tap, so the context is opened on "Concluir série" and reused when the rest ends.
let audio: AudioContext | null = null;

function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }
}

function beep() {
  if (!audio) return;
  for (const at of [0, 0.35]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(audio.destination);
    osc.start(audio.currentTime + at);
    osc.stop(audio.currentTime + at + 0.2);
  }
}

function RestCountdown({ endsAt, next, onAdd, onDone }: { endsAt: number; next: string; onAdd: (seconds: number) => void; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, endsAt - now);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left > 0) return;
    navigator.vibrate?.([300, 150, 300]);
    beep();
    toast("Descanso acabou! Hora da próxima série", { description: next });
    onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left > 0]);

  return (
    <div className="mt-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-accent">Descanso</div>
          <div className="font-display text-3xl font-extrabold leading-none tabular-nums text-accent" role="timer" aria-label="Descanso restante">{formatDuration(left + 999)}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onAdd(15)} className="rounded-full border border-primary-foreground/30 px-3 py-1.5 text-sm font-semibold">+15s</button>
          <button type="button" onClick={onDone} className="rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground">Pular</button>
        </div>
      </div>
      <div className="mt-2 text-xs opacity-75">Próxima: {next}</div>
    </div>
  );
}

const kgNumber = (kg: number) => kg.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function formatDiff(kg: number) {
  return kg === 0 ? "igual" : `${kg > 0 ? "+" : "−"}${kgNumber(Math.abs(kg))} kg`;
}

function formatSetKgs(kgs: (number | null)[], setReps: SetValues, reps: string) {
  if (sumKg(kgs) === 0) return `${kgs.length} série(s) sem peso`;
  if (repsCount(reps) === null) return `${kgs.map((kg) => (kg === null ? "—" : kgNumber(kg))).join(" · ")} kg`;
  const sets = kgs.map((kg, j) => `${kg === null ? "—" : kgNumber(kg)}×${repsOfSet(setReps, j, reps)}`);
  return `${sets.join(" · ")} = ${formatKg(volume(kgs, setReps, reps))}`;
}

function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function HistoryStat({ label, value, extra }: { label: string; value: string; extra?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-3 py-2">
      <div className="font-display text-base font-bold leading-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}{extra && <> · <b>{extra}</b></>}</div>
    </div>
  );
}

const workoutShare = (record: WorkoutRecord, previous: WorkoutRecord | undefined): ShareRequest => ({
  heading: `${record.dayName} concluído! 💪`,
  title: `${record.dayName} concluído no forma.`,
  fileName: `forma-treino-${record.date}.png`,
  make: (bg) => workoutCard(record, previous, bg),
});

function WorkoutHistory({ records, onDelete, onShare }: { records: WorkoutRecord[]; onDelete: (id: string) => void; onShare: (request: ShareRequest) => void }) {
  return (
    <section className="space-y-3 border-t border-border pt-6">
      <h2 className="text-2xl font-bold">Histórico de treinos</h2>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">Conclua um treino para ver aqui a data, o tempo e as séries de cada exercício.</p>
      ) : (
        records.map((r, index) => {
          const done = r.exercises.reduce((sum, e) => sum + e.setsDone, 0);
          const planned = r.exercises.reduce((sum, e) => sum + e.setsPlanned, 0);
          const total = recordTotal(r);
          const beforeTotal = recordTotal(lastRecordBefore(records.slice(0, index), r.dayName));
          return { r, index, done, planned, total, diff: total > 0 && beforeTotal > 0 ? total - beforeTotal : null };
        }).reverse().map(({ r, index, done, planned, total, diff }) => {
          return (
            <details key={r.id} className="group rounded-3xl border border-border bg-card px-4 py-3">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {new Date(`${r.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                    </div>
                    <div className="font-display text-lg font-bold leading-tight">{r.dayName}</div>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <HistoryStat label="tempo" value={r.durationMs !== undefined ? formatDuration(r.durationMs) : "—"} />
                  <HistoryStat label="séries" value={`${done}/${planned}`} />
                  <HistoryStat label="peso total" value={total > 0 ? formatKg(total) : "—"}
                    extra={diff !== null ? <span className={diff >= 0 ? "text-accent" : "text-destructive"}>{formatDiff(diff)}</span> : undefined} />
                </div>
              </summary>
              <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
                {r.exercises.map((e, i) => (
                  <li key={i} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">{e.name}</span>
                      <span className={`shrink-0 font-semibold tabular-nums ${e.setsDone >= e.setsPlanned ? "text-accent" : ""}`}>{e.setsDone}/{e.setsPlanned} séries</span>
                    </div>
                    <div className="text-xs tabular-nums text-muted-foreground">
                      {e.setKgs && sumKg(e.setKgs) > 0 ? formatSetKgs(e.setKgs, e.setReps, e.reps) : `${e.reps}${repsCount(e.reps) ? " reps" : ""}${e.kg !== undefined ? ` · carga ${formatKg(e.kg)}` : ""}`}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{r.startedAt !== undefined ? `Início ${formatClock(r.startedAt)} · fim ${formatClock(r.finishedAt)}` : `Concluído às ${formatClock(r.finishedAt)}, sem cronômetro`}</span>
                <span className="flex shrink-0 gap-4">
                  <button type="button" onClick={() => onShare(workoutShare(r, lastRecordBefore(records.slice(0, index), r.dayName)))} className="inline-flex items-center gap-1 font-semibold text-accent"><Share2 className="h-3.5 w-3.5" />Compartilhar</button>
                  <button type="button" onClick={() => { if (confirm("Excluir este registro de treino?")) onDelete(r.id); }} className="font-semibold hover:text-destructive">Excluir</button>
                </span>
              </div>
            </details>
          );
        })
      )}
    </section>
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
