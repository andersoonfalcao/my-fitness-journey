import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftRight, Check, CheckCheck, ChevronDown, ChevronRight, Info, ListChecks, Play, RotateCcw, Share2, Timer, Trash2, TrendingDown, TrendingUp, Youtube } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KEYS, today, uid, useHistory, useLocal, type LoadEntry, type Profile, type WorkoutRecord, type WorkoutSession } from "@/lib/store";
import { generatePlan, nextWorkoutIndex, normalizePlan, repsCount, repsFor, type Plan } from "@/lib/plan";
import { alternatives, byId, GROUP_LABEL, youtubeSearchUrl, type Exercise, type Group } from "@/lib/exercises";
import { NeedProfile } from "@/components/AppShell";
import { defaultTrainingDays, musclesOf, WeekPlan } from "@/components/WeekPlan";
import { BodyMap } from "@/components/BodyMap";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { photosFor } from "@/lib/exercise-photos";
import { StravaActivities } from "@/components/StravaActivities";
import { ShareDialog, type ShareRequest } from "@/components/ShareDialog";
import { workoutCard } from "@/lib/share-card";
import { lastRecordBefore, loadAdvice, personalRecords, recordTotal, repsOfSet, setsByGroup, sumKg, volume, weekStart, type SetValues } from "@/lib/workout-stats";
import { askRestNotifications, notifyRestOver, useWakeLock } from "@/lib/workout-device";
import { cancelRestPush, deviceId, scheduleRestPush, useSettings } from "@/lib/push";

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
  // ?aba=historico opens the history tab (used by the "Fechar o dia" shortcuts).
  validateSearch: (search: Record<string, unknown>): { aba?: "historico" } => (search["aba"] === "historico" ? { aba: "historico" } : {}),
  component: TreinosPage,
});

function TreinosPage() {
  const tab = Route.useSearch().aba ?? "treino";
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [plan, setPlan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog, setDone] = useLocal<string[]>(KEYS.done, []);
  const [cycleStart, setCycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [loads, setLoads] = useLocal<LoadEntry[]>(KEYS.loads, []);
  const [session, setSession] = useLocal<WorkoutSession | null>(KEYS.session, null);
  const [history, setHistory] = useHistory();
  const [share, setShare] = useState<ShareRequest | null>(null);
  const [loadInputs, setLoadInputs] = useState<Record<string, string>>({});
  const [repsInputs, setRepsInputs] = useState<Record<string, string>>({});
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  // Exercises are collapsed cards; one opens at a time to show its sets, reps and loads.
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [viewRecords, setViewRecords] = useState<WorkoutRecord[] | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [swap, setSwap] = useState<{ d: number; i: number } | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmAll, setConfirmAll] = useState<{ name: string; count: number; detail: string; run: () => void } | null>(null);
  const [settings] = useSettings();
  const [schedule, setSchedule] = useLocal<number[] | null>(KEYS.schedule, null);

  useWakeLock(!!session);

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

  const trainingDays = schedule?.length ? schedule : defaultTrainingDays(profile.days);
  const nextIdx = nextWorkoutIndex(doneLog.length, cycleStart, plan.days.length);
  const sessionIdx = session ? plan.days.findIndex((d) => d.name === session.dayName) : -1;
  const active = dayIdx ?? (sessionIdx >= 0 ? sessionIdx : nextIdx);
  const day = plan.days[active] ?? plan.days[0]!;
  const finishDay = plan.days[sessionIdx] ?? day;
  // Set tracking belongs to the day being trained; other tabs are view-only while a session runs.
  // The sequence decides which workout is trained: earlier ones of this round are done and later ones wait their turn,
  // so only the next one can be started (going back takes "Recomeçar"). Other tabs are view-only.
  const tracksSets = session ? sessionIdx === active || sessionIdx < 0 : active === nextIdx;

  /**
   * The load history (evolution chart, "Última") fills itself: each session keeps one entry per exercise with its
   * heaviest set, so raising the weight in a set updates it, and undoing sets brings it back down.
   */
  const syncLoad = (exerciseId: string, startedAt: number, setKgs: (number | null)[]) => {
    const top = Math.max(0, ...setKgs.map((kg) => kg ?? 0));
    setLoads((entries) => {
      const current = entries.find((l) => l.exerciseId === exerciseId && (l.createdAt ?? 0) >= startedAt);
      if (!top) return current ? entries.filter((l) => l !== current) : entries;
      if (current) return current.kg === top ? entries : entries.map((l) => (l === current ? { ...l, kg: top } : l));
      return [...entries, { id: uid(), exerciseId, date: today(), kg: top, createdAt: Date.now() }];
    });
  };

  /** Marks `count` sets of item `i` with the same weight and reps; rests only between sets of the same exercise. */
  const completeSets = (i: number, kg: number | null, reps: number | null, count: number) => {
    const item = day.items[i]!;
    unlockAudio();
    const base = session ?? { dayName: day.name, startedAt: Date.now() };
    const before = base.sets?.[i] ?? 0;
    const done = Math.min(item.sets, before + count);
    if (done === before) return;
    const added = done - before;
    const sets = { ...base.sets, [i]: done };
    const kgs = { ...base.kgs, [i]: [...(base.kgs?.[i] ?? []), ...Array<number | null>(added).fill(kg)] };
    const repsDone = { ...base.repsDone, [i]: [...(base.repsDone?.[i] ?? []), ...Array<number | null>(added).fill(reps)] };
    syncLoad(item.exId, base.startedAt, kgs[i]!);
    cancelRestPush();
    const pending = day.items.map((it, j) => j).filter((j) => (sets[j] ?? 0) < day.items[j]!.sets);
    if (pending.length === 0) {
      setSession({ ...base, sets, kgs, repsDone, rest: undefined });
      setOpenItem(null);
      toast.success("Todas as séries feitas! Agora é só concluir o treino.");
      return;
    }
    // Circuit: straight on to the next exercise of the round; the rest comes only when the round wraps around.
    if (plan.circuit && count === 1) {
      const nextJ = pending.find((j) => j > i) ?? pending[0]!;
      const nextItem = day.items[nextJ]!;
      const next = `Série ${(sets[nextJ] ?? 0) + 1} de ${nextItem.sets} · ${byId(nextItem.exId).name}`;
      if (nextJ > i) {
        setSession({ ...base, sets, kgs, repsDone, rest: undefined });
        setOpenItem(nextJ);
        toast(`Próximo: ${byId(nextItem.exId).name}`);
        document.getElementById(`exercicio-${nextJ}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const endsAt = Date.now() + settings.restSeconds * 1000;
      setSession({ ...base, sets, kgs, repsDone, rest: { item: i, endsAt, next: `Fim da volta · ${next}` } });
      scheduleRestPush(endsAt, next);
      return;
    }
    // After the exercise's last set there is no countdown: moving to the next machine is the rest,
    // so its card closes and the next pending one opens.
    if (done >= item.sets) {
      setSession({ ...base, sets, kgs, repsDone, rest: undefined });
      const nextJ = pending.find((j) => j > i) ?? pending[0]!;
      setOpenItem(nextJ);
      setTimeout(() => document.getElementById(`exercicio-${nextJ}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }
    const next = `Série ${done + 1} de ${item.sets} · ${byId(item.exId).name}`;
    const endsAt = Date.now() + settings.restSeconds * 1000;
    setSession({ ...base, sets, kgs, repsDone, rest: { item: i, endsAt, next } });
    scheduleRestPush(endsAt, next);
  };

  // Comparison baseline: the last time this same workout (by name) was finished.
  const lastRecordOf = (dayName: string) => lastRecordBefore(history, dayName);
  const adviceFor = (ex: Exercise) => loadAdvice(history, ex);
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

  // The class being trained is numbered after every workout finished so far; other days are just for reference.
  const isCurrentClass = tracksSets;
  const classesDone = Math.max(doneLog.length, history.length);
  const classNumber = classesDone + 1;

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
    const records = personalRecords(history, record);
    if (records.length > 0) {
      toast(`🏆 ${records.length === 1 ? "Novo recorde!" : `${records.length} novos recordes!`}`, {
        description: records.map((r) => `${r.name}: ${formatKg(r.kg)} (antes ${formatKg(r.previousKg)})`).join(" · "),
        duration: 8000,
      });
    }
    setSession(null);
  };

  const undoSet = (i: number) => {
    if (!session) return;
    cancelRestPush();
    syncLoad(day.items[i]!.exId, session.startedAt, (session.kgs?.[i] ?? []).slice(0, -1));
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
    const days = plan.days.map((d, di) => di !== swap.d ? d : { ...d, items: d.items.map((it, ii) => ii === swap.i ? { ...it, exId: newId, reps: repsFor(profile, byId(newId), plan) } : it) });
    setPlan({ ...plan, days });
    toast.success(`Trocado por ${byId(newId).name}`);
    setSwap(null);
  };

  const historyFor = (exerciseId: string) =>
    loads
      .filter((entry) => entry.exerciseId === exerciseId)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? 0) - (b.createdAt ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Treinos</h1>

      {/* The gym screen stays short: what was done (history, Strava, weekly sets) lives in its own tab. */}
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Treinos">
        {([["treino", "Treino", {}], ["historico", `Histórico (${history.length})`, { aba: "historico" }]] as const).map(([value, label, search]) => (
          <Link key={value} to="/treinos" search={search} replace role="tab" aria-selected={tab === value}
            className={`rounded-full py-2 text-center text-sm font-bold ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {label}
          </Link>
        ))}
      </div>

      {tab === "treino" && (<>
      <WeekPlan
        plan={plan}
        history={history}
        nextIdx={nextIdx}
        trainingDays={trainingDays}
        activeIdx={active}
        profileDays={profile.days}
        onSelect={(i) => { setDayIdx(i); setOpenItem(null); }}
        onChangeDays={setSchedule}
        onOpenDone={setViewRecords}
      />
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

      <section className="flex items-center gap-3 rounded-3xl bg-primary p-4 text-primary-foreground sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">
            {isCurrentClass ? `Aula ${classNumber}` : active < nextIdx ? "Já feito nesta sequência" : "Próximos treinos"} · {day.name}
          </div>
          <h2 className="mt-1 font-display text-xl font-extrabold leading-tight sm:text-3xl">{musclesOf(day.items.map((it) => it.exId))}</h2>
          <p className="mt-1 text-sm opacity-75">{day.items.length} exercícios · {plan.method}</p>
          {openItem !== null && day.items[openItem] && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />agora: {byId(day.items[openItem]!.exId).name}
            </p>
          )}
        </div>
        <BodyMap exIds={day.items.map((it) => it.exId)} focus={openItem !== null ? day.items[openItem]?.exId : null} className="shrink-0 rounded-2xl bg-card/95 px-2 py-2 text-foreground" />
      </section>

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
            <button onClick={() => { if (confirm("Cancelar o treino? O tempo não será salvo.")) { cancelRestPush(); setSession(null); setLoadInputs({}); setRepsInputs({}); } }}
              className="text-sm font-semibold underline-offset-4 opacity-75 hover:underline">Cancelar</button>
          </div>
        </div>
      ) : active === nextIdx ? (
        <button onClick={() => { askRestNotifications(); setSession({ dayName: day.name, startedAt: Date.now() }); }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-display text-lg font-bold text-primary-foreground">
          <Play className="h-5 w-5" />Iniciar {day.name}
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-muted/60 px-5 py-4">
          <p className="text-sm">
            {active < nextIdx
              ? <><b>{day.name} já foi feito nesta sequência.</b> Aqui é só para consulta.</>
              : <><b>{day.name} vem depois.</b> A sequência segue pelo {plan.days[nextIdx]!.name}.</>}
          </p>
          <button onClick={() => setDayIdx(nextIdx)} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            <Play className="h-4 w-4" />Ir para o {plan.days[nextIdx]!.name}
          </button>
        </div>
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
          // The fields come filled with the last weight and reps used (this session, else the same set last time),
          // and what is typed stays for the next sets. The progression advice is a tap away on its badge.
          const advice = adviceFor(ex);
          const showAdvice = advice && advice.kind !== "manter" && kgsToday.length === 0;
          const advisedKg = showAdvice ? advice.kgFor(setsDone) : undefined;
          const lastKg = kgsToday.at(-1) ?? prev?.setKgs?.[setsDone] ?? latest?.kg;
          const kgText = (loadInputs[ex.id] ?? (lastKg != null ? kgInput(lastKg) : "")).trim();
          const setKg = kgText ? Number(kgText.replace(",", ".")) : null;
          // Empty reps means the plan target. Time-based work (plank) has no reps.
          const targetReps = repsCount(it.reps);
          const repsToday = tracksSets ? session?.repsDone?.[i] ?? [] : [];
          const lastReps = repsToday.at(-1) ?? prev?.setReps?.[setsDone] ?? targetReps;
          const repsText = (repsInputs[ex.id] ?? (lastReps != null ? String(lastReps) : "")).trim();
          const typedReps = repsText ? Number(repsText) : undefined;
          const setReps = typedReps ?? targetReps;
          const onComplete = (count: number) => {
            if (setKg !== null && (!Number.isFinite(setKg) || setKg < 0)) {
              toast.error("Digite um peso válido em kg");
              return;
            }
            if (typedReps !== undefined && (!Number.isInteger(typedReps) || typedReps < 1 || typedReps > 100)) {
              toast.error("Digite um número de repetições entre 1 e 100");
              return;
            }
            const reps = targetReps === null ? null : setReps;
            if (count === 1) return completeSets(i, setKg, reps, 1);
            // Marking several sets at once is easy to tap by mistake, so it asks first.
            const detail = [setKg !== null ? formatKg(setKg) : "sem peso", reps !== null && reps !== undefined ? `${reps} repetições` : it.reps].join(" × ");
            setConfirmAll({ name: ex.name, count, detail, run: () => completeSets(i, setKg, reps, count) });
          };
          const setsLeft = it.sets - setsDone;
          const finished = tracksSets && setsDone >= it.sets;
          const open = openItem === i;
          const exTotal = volume(kgsToday, repsToday, it.reps);
          return (
            <article key={i} id={`exercicio-${i}`} className={`scroll-mt-28 overflow-hidden rounded-3xl border-2 ${finished ? "border-[#3f9d6b] bg-[#3f9d6b]/5" : open ? "border-primary bg-card" : "border-border bg-card"}`}>
              <button type="button" onClick={() => setOpenItem(open ? null : i)} aria-expanded={open} aria-controls={`exercicio-${i}-corpo`}
                className="flex w-full items-center gap-3 p-3 text-left sm:p-4">
                <img src={photosFor(ex.id)?.[1] ?? ex.img} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{GROUP_LABEL[ex.group]} · {ex.equipment}</span>
                  <span className="block font-display text-base font-bold leading-tight">{ex.name}</span>
                  <span className="mt-0.5 block text-sm">
                    {finished ? (
                      <b className="text-[#3f9d6b]">Peso total: {exTotal > 0 ? formatKg(exTotal) : "sem carga"}</b>
                    ) : (
                      <span className="text-muted-foreground">
                        <b className="font-display text-foreground">{it.sets}x{it.reps}</b>{repsCount(it.reps) ? "" : " por série"}
                        {setsDone > 0 && ` · ${setsDone} de ${it.sets} feitas`}
                      </span>
                    )}
                  </span>
                </span>
                {finished ? (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#3f9d6b] text-white"><Check className="h-5 w-5" aria-label="Exercício concluído" /></span>
                ) : (
                  <ChevronRight className={`h-6 w-6 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
                )}
              </button>
              {open && (
              <div id={`exercicio-${i}-corpo`} className="border-t border-border p-3 sm:p-4">
                <div className="flex gap-3">
                  <ExerciseMedia exercise={ex} compact onOpen={() => setDetail(ex)} className="h-24 w-24 shrink-0 rounded-2xl border border-border sm:h-28 sm:w-28" />
                  <div className="flex min-w-0 flex-1 flex-wrap content-start gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setDetail(ex)} className="rounded-full"><Info />Detalhes</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSwap({ d: active, i })} className="rounded-full"><ArrowLeftRight />Trocar</Button>
                    <Button asChild variant="secondary" size="sm" className="rounded-full">
                      <a href={youtubeSearchUrl(ex)} target="_blank" rel="noopener noreferrer" aria-label={`Ver execução de ${ex.name} no YouTube (abre em nova aba)`}>
                        <Youtube />YouTube
                      </a>
                    </Button>
                  </div>
                  <BodyMap exIds={[ex.id]} size="sm" className="shrink-0" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  <b className="font-display text-foreground">{it.sets}x{it.reps}</b>{repsCount(it.reps) ? "" : " por série"} · descanso <b className="text-foreground">{formatRest(settings.restSeconds)}</b> entre séries
                </p>
                <SetTable sets={it.sets} reps={it.reps} done={tracksSets ? setsDone : 0} kgs={kgsToday} repsDone={repsToday} prevKgs={prev?.setKgs} prevReps={prev?.setReps} prevPlanReps={prev?.reps} />
                {tracksSets && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex gap-1" role="img" aria-label={`${setsDone} de ${it.sets} séries feitas`}>
                      {Array.from({ length: it.sets }, (_, s) => (
                        <span key={s} className={`h-2.5 w-5 rounded-full ${s < setsDone ? "bg-[#3f9d6b]" : "bg-muted"}`} />
                      ))}
                    </div>
                    {setsDone < it.sets ? (
                      <span className="text-sm font-semibold text-muted-foreground">Série {setsDone + 1} de {it.sets}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-[#3f9d6b]"><CheckCheck className="h-4 w-4" />Exercício concluído</span>
                    )}
                    {setsDone > 0 && (
                      <button type="button" onClick={() => undoSet(i)} className="px-1 py-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Desfazer</button>
                    )}
                  </div>
                )}
                <div className="mt-3 border-t border-border pt-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="inline-flex items-center gap-2 font-bold text-muted-foreground">
                      Carga usada
                      {showAdvice && (
                        <button
                          type="button"
                          disabled={advisedKg == null}
                          onClick={() => advisedKg != null && setLoadInputs((inputs) => ({ ...inputs, [ex.id]: kgInput(advisedKg) }))}
                          aria-label={advisedKg != null ? `Usar ${formatKg(advisedKg)} sugeridos` : undefined}
                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${advice.kind === "subir" ? "bg-accent/15 text-accent" : "bg-destructive/10 text-destructive"}`}
                        >
                          {advice.kind === "subir" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {advice.kind === "subir" ? "subir carga" : "reduzir carga"}
                          {advisedKg != null && ` → ${formatKg(advisedKg)}`}
                        </button>
                      )}
                    </span>
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
                        placeholder="Ex: 40"
                        value={loadInputs[ex.id] ?? (lastKg != null ? kgInput(lastKg) : "")}
                        onChange={(event) => setLoadInputs((inputs) => ({ ...inputs, [ex.id]: event.target.value }))}
                        onKeyDown={(event) => event.key === "Enter" && tracksSets && setsLeft > 0 && onComplete(1)}
                        onFocus={(event) => event.target.select()}
                        className="pr-9"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                    </div>
                    {tracksSets && setsLeft > 0 && targetReps !== null && (
                      <div className="relative w-[calc(50%-0.25rem)] sm:w-24">
                        <Input
                          aria-label={`Repetições na série ${setsDone + 1} de ${ex.name}`}
                          inputMode="numeric"
                          placeholder={String(targetReps)}
                          value={repsInputs[ex.id] ?? (lastReps != null ? String(lastReps) : "")}
                          onChange={(event) => setRepsInputs((inputs) => ({ ...inputs, [ex.id]: event.target.value }))}
                          onKeyDown={(event) => event.key === "Enter" && onComplete(1)}
                          onFocus={(event) => event.target.select()}
                          className="pr-11"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">reps</span>
                      </div>
                    )}
                  </div>
                  {showAdvice && <p className="mt-1.5 text-xs text-muted-foreground">{advice.reason}</p>}
                  {tracksSets && setsLeft > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => onComplete(1)} className="h-auto min-h-9 flex-1 basis-40 whitespace-normal rounded-full py-2">
                        <Check />Concluir série {setsDone + 1}
                        {setKg !== null && Number.isFinite(setKg) ? ` · ${formatKg(setKg)}` : ""}
                        {targetReps !== null && setReps !== undefined && Number.isFinite(setReps) ? ` × ${setReps}` : ""}
                      </Button>
                      {setsLeft > 1 && (
                        <Button type="button" variant="secondary" onClick={() => onComplete(setsLeft)} className="h-auto min-h-9 flex-1 basis-40 whitespace-normal rounded-full py-2">
                          <ListChecks />{setsDone === 0 ? `Concluir as ${setsLeft} séries` : `Concluir as ${setsLeft} restantes`}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {tracksSets && session?.rest?.item === i && (
                  <RestCountdown
                    key={session.rest.endsAt}
                    endsAt={session.rest.endsAt}
                    next={session.rest.next}
                    onAdd={(seconds) => {
                      const rest = session.rest!;
                      scheduleRestPush(rest.endsAt + seconds * 1000, rest.next);
                      setSession((s) => s?.rest ? { ...s, rest: { ...s.rest, endsAt: s.rest.endsAt + seconds * 1000 } } : s);
                    }}
                    onSkip={() => { cancelRestPush(); setSession((s) => s && { ...s, rest: undefined }); }}
                    onDone={() => setSession((s) => s && { ...s, rest: undefined })}
                  />
                )}
              </div>
              )}
            </article>
          );
        })}
      </div>

      {(session || active === nextIdx) && (<>
        <SessionCompare previous={lastRecordOf(finishDay.name)} previousTotal={lastFinishTotal} currentTotal={todayTotal} dayName={finishDay.name} />
        <button onClick={() => (pendingItems.length > 0 ? setConfirmFinish(true) : finishWorkout())}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent py-4 font-display text-lg font-bold text-accent-foreground">
          <Check className="h-5 w-5" />Concluir {finishDay.name}
        </button>
      </>)}
      </>)}

      <AlertDialog open={!!confirmAll} onOpenChange={(open) => !open && setConfirmAll(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Concluir {confirmAll?.count} séries?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAll && <>Todas as {confirmAll.count} séries de <b>{confirmAll.name}</b> serão marcadas como feitas com <b>{confirmAll.detail}</b>, sem descanso entre elas. Se alguma foi diferente, use Desfazer e conclua uma a uma.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmAll?.run(); setConfirmAll(null); }} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {tab === "historico" && (<>
        {session && (
          <Link to="/treinos" search={{}} replace className="flex items-center justify-between gap-3 rounded-3xl bg-primary px-5 py-3 text-primary-foreground">
            <span className="flex items-center gap-2 text-sm font-bold"><Timer className="h-5 w-5 text-accent" />{session.dayName} em andamento</span>
            <span className="text-sm font-semibold underline underline-offset-4">Voltar ao treino</span>
          </Link>
        )}
        <WorkoutHistory records={history} onDelete={(id) => setHistory((records) => records.filter((r) => r.id !== id))} onShare={setShare} />
        <WeeklyVolume records={history} />
        <StravaActivities />
      </>)}
      <ShareDialog request={share} onClose={() => setShare(null)} />
      <RecordDialog records={viewRecords} all={history} onClose={() => setViewRecords(null)} />

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

/** End of the class: total weight (load × reps) of the previous session of this workout next to the current one. */
function SessionCompare({ previous, previousTotal, currentTotal, dayName }: { previous: WorkoutRecord | undefined; previousTotal: number; currentTotal: number; dayName: string }) {
  const diff = currentTotal - previousTotal;
  const pct = previousTotal > 0 ? Math.round((diff / previousTotal) * 100) : null;
  return (
    <section className="rounded-3xl border-2 border-primary bg-card p-4">
      <h2 className="font-display text-lg font-bold">Peso total da sessão</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/60 p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sessão anterior</div>
          <div className="mt-1 font-display text-2xl font-extrabold leading-none tabular-nums">{previousTotal > 0 ? formatKg(previousTotal) : "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{previous ? `${dayName} · ${formatDate(previous.date)}` : `primeira vez do ${dayName}`}</div>
        </div>
        <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
          <div className="text-xs font-bold uppercase tracking-wider opacity-75">Sessão atual</div>
          <div className="mt-1 font-display text-2xl font-extrabold leading-none tabular-nums">{formatKg(currentTotal)}</div>
          <div className="mt-1 text-xs opacity-75">até agora</div>
        </div>
      </div>
      {previousTotal > 0 && currentTotal > 0 && (
        <p className={`mt-3 text-center text-sm font-bold ${diff >= 0 ? "text-[#3f9d6b]" : "text-muted-foreground"}`}>
          {diff === 0 ? "Igual à sessão anterior" : diff > 0 ? `${formatDiff(diff)}${pct ? ` (+${pct}%)` : ""} em relação à sessão anterior` : `Faltam ${kgNumber(-diff)} kg para igualar a sessão anterior`}
        </p>
      )}
    </section>
  );
}

/** Sets of an exercise: reps and load done today, else the target, next to last time's load. */
function SetTable({ sets, reps, done, kgs, repsDone, prevKgs, prevReps, prevPlanReps }: {
  sets: number; reps: string; done: number; kgs: SetValues; repsDone: SetValues; prevKgs: SetValues; prevReps: SetValues; prevPlanReps: string | undefined;
}) {
  const timed = repsCount(reps) === null;
  const kgText = (kg: number | null | undefined) => (kg == null ? "—" : formatKg(kg));
  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          <th className="py-1 font-bold">Série</th>
          <th className="py-1 font-bold">{timed ? "Tempo" : "Reps"}</th>
          <th className="py-1 font-bold">Carga</th>
          <th className="py-1 text-right font-bold">Última vez</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {Array.from({ length: sets }, (_, s) => {
          const isDone = s < done;
          const prevKg = prevKgs?.[s];
          const last = prevKg != null ? `${kgText(prevKg)}${timed ? "" : ` × ${repsOfSet(prevReps, s, prevPlanReps ?? reps)}`}` : "—";
          return (
            <tr key={s} className={isDone ? "font-semibold" : "text-muted-foreground"}>
              <td className="py-2">
                <span className="inline-flex items-center gap-1.5">
                  {isDone ? <Check className="h-4 w-4 text-[#3f9d6b]" aria-label="feita" /> : <span className="inline-block h-4 w-4" />}{s + 1}
                </span>
              </td>
              <td className="py-2 tabular-nums">{timed ? reps : isDone ? repsOfSet(repsDone, s, reps) : reps}</td>
              <td className="py-2 tabular-nums">{isDone ? kgText(kgs?.[s]) : "—"}</td>
              <td className="py-2 text-right tabular-nums">{last}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
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

function RestCountdown({ endsAt, next, onAdd, onSkip, onDone }: { endsAt: number; next: string; onAdd: (seconds: number) => void; onSkip: () => void; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, endsAt - now);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // With the app on screen the beep does the job, so the server push is called off just before it fires.
  // With the screen off this never runs (the page is asleep) and the push arrives.
  const closeToEnd = left <= 3000;
  useEffect(() => {
    if (closeToEnd && left > 0 && document.visibilityState === "visible") cancelRestPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeToEnd]);

  useEffect(() => {
    if (left > 0) return;
    navigator.vibrate?.([300, 150, 300]);
    beep();
    // Devices with push on get the server's notification instead (it also works with the screen off).
    if (!deviceId()) void notifyRestOver(next);
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
          <button type="button" onClick={onSkip} className="rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground">Pular</button>
        </div>
      </div>
      <div className="mt-2 text-xs opacity-75">Próxima: {next}</div>
    </div>
  );
}

const kgNumber = (kg: number) => kg.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Weight as typed in the field: decimal comma, no thousands separator. */
const kgInput = (kg: number) => String(kg).replace(".", ",");

const formatRest = (seconds: number) => (seconds % 60 === 0 ? `${seconds / 60} min` : seconds > 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60}s` : `${seconds}s`);

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

/** Time, sets and total weight of a finished workout. */
function RecordStats({ r, done, planned, total, diff }: { r: WorkoutRecord; done: number; planned: number; total: number; diff: number | null }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      <HistoryStat label="tempo" value={r.durationMs !== undefined ? formatDuration(r.durationMs) : "—"} />
      <HistoryStat label="séries" value={`${done}/${planned}`} />
      <HistoryStat label="peso total" value={total > 0 ? formatKg(total) : "—"}
        extra={diff !== null ? <span className={diff >= 0 ? "text-accent" : "text-destructive"}>{formatDiff(diff)}</span> : undefined} />
    </div>
  );
}

/** Each exercise of a finished workout with its sets, loads and reps. */
function RecordExercises({ r, prs }: { r: WorkoutRecord; prs: Set<string> }) {
  return (
    <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
      {r.exercises.map((e, i) => (
        <li key={i} className="py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">{e.name}{prs.has(e.exId) && <span className="ml-1" role="img" aria-label="recorde pessoal">🏆</span>}</span>
            <span className={`shrink-0 font-semibold tabular-nums ${e.setsDone >= e.setsPlanned ? "text-accent" : ""}`}>{e.setsDone}/{e.setsPlanned} séries</span>
          </div>
          <div className="text-xs tabular-nums text-muted-foreground">
            {e.setKgs && sumKg(e.setKgs) > 0 ? formatSetKgs(e.setKgs, e.setReps, e.reps) : `${e.reps}${repsCount(e.reps) ? " reps" : ""}${e.kg !== undefined ? ` · carga ${formatKg(e.kg)}` : ""}`}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A finished day opened from the week, read-only, with the same numbers as the history. */
function RecordDialog({ records, all, onClose }: { records: WorkoutRecord[] | null; all: WorkoutRecord[]; onClose: () => void }) {
  return (
    <Dialog open={!!records} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {records && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {new Date(`${records[0]!.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
              </DialogTitle>
            </DialogHeader>
            {records.map((r) => {
              const index = all.findIndex((x) => x.id === r.id);
              const earlier = all.slice(0, Math.max(0, index));
              const total = recordTotal(r);
              const beforeTotal = recordTotal(lastRecordBefore(earlier, r.dayName));
              return (
                <section key={r.id}>
                  <h3 className="font-display text-lg font-bold">{r.dayName}</h3>
                  <p className="text-sm text-muted-foreground">{musclesOf(r.exercises.map((e) => e.exId))}</p>
                  <RecordStats r={r} done={r.exercises.reduce((n, e) => n + e.setsDone, 0)} planned={r.exercises.reduce((n, e) => n + e.setsPlanned, 0)}
                    total={total} diff={total > 0 && beforeTotal > 0 ? total - beforeTotal : null} />
                  <RecordExercises r={r} prs={new Set(personalRecords(earlier, r).map((p) => p.exId))} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.startedAt !== undefined ? `Início ${formatClock(r.startedAt)} · fim ${formatClock(r.finishedAt)}` : `Concluído às ${formatClock(r.finishedAt)}`}
                  </p>
                </section>
              );
            })}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
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
    <section id="historico" className="scroll-mt-24 space-y-3">
      <h2 className="text-2xl font-bold">Histórico de treinos</h2>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">Conclua um treino para ver aqui a data, o tempo e as séries de cada exercício.</p>
      ) : (
        records.map((r, index) => {
          const done = r.exercises.reduce((sum, e) => sum + e.setsDone, 0);
          const planned = r.exercises.reduce((sum, e) => sum + e.setsPlanned, 0);
          const total = recordTotal(r);
          const beforeTotal = recordTotal(lastRecordBefore(records.slice(0, index), r.dayName));
          const prs = new Set(personalRecords(records.slice(0, index), r).map((p) => p.exId));
          return { r, index, done, planned, total, prs, diff: total > 0 && beforeTotal > 0 ? total - beforeTotal : null };
        }).reverse().map(({ r, index, done, planned, total, prs, diff }) => {
          return (
            <details key={r.id} className="group rounded-3xl border border-border bg-card px-4 py-3">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {new Date(`${r.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                    </div>
                    <div className="font-display text-lg font-bold leading-tight">
                      {r.dayName}
                      {prs.size > 0 && <span className="ml-2 align-middle text-xs font-bold text-accent">🏆 {prs.size === 1 ? "recorde" : `${prs.size} recordes`}</span>}
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </div>
                <RecordStats r={r} done={done} planned={planned} total={total} diff={diff} />
              </summary>
              <RecordExercises r={r} prs={prs} />
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

// Weekly hard sets per muscle that most hypertrophy studies land on (e.g. Schoenfeld et al. 2017, Baz-Valle et al. 2022).
const WEEK_SETS = { min: 10, max: 20 };
const SCALE_SETS = 25;

function WeeklyVolume({ records }: { records: WorkoutRecord[] }) {
  const from = weekStart(today());
  const sets = setsByGroup(records, from);
  // Conditioning work is not hypertrophy volume, so it stays out of the weekly sets.
  const groups = (Object.keys(GROUP_LABEL) as Group[]).filter((g) => g !== "cardio");
  const pct = (n: number) => `${(Math.min(n, SCALE_SETS) / SCALE_SETS) * 100}%`;
  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-4">
      <div>
        <h2 className="text-xl font-bold">Séries da semana por músculo</h2>
        <p className="text-xs text-muted-foreground">
          Desde segunda ({formatDate(from)}). A faixa marcada ({WEEK_SETS.min} a {WEEK_SETS.max} séries) é a referência para ganho de massa; abdômen e
          braços também recebem estímulo dos exercícios compostos.
        </p>
      </div>
      <ul className="space-y-2">
        {groups.map((g) => {
          const n = sets[g] ?? 0;
          const tone = n > WEEK_SETS.max ? "bg-destructive" : n >= WEEK_SETS.min ? "bg-accent" : "bg-primary/40";
          return (
            <li key={g} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-sm">
              <span className="truncate">{GROUP_LABEL[g]}</span>
              <span className="relative h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${GROUP_LABEL[g]}: ${n} séries`}>
                <span className="absolute inset-y-0 border-x border-accent/60 bg-accent/10" style={{ left: pct(WEEK_SETS.min), width: `calc(${pct(WEEK_SETS.max)} - ${pct(WEEK_SETS.min)})` }} />
                <span className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: pct(n) }} />
              </span>
              <span className="text-right font-display font-bold tabular-nums">{n}</span>
            </li>
          );
        })}
      </ul>
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
        <p className="mt-3 text-sm text-muted-foreground">A carga entra aqui sozinha quando você conclui as séries com peso: fica a mais alta de cada treino.</p>
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
