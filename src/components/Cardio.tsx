import { useEffect, useRef, useState } from "react";
import { Bike, Check, ChevronDown, Footprints, Gauge, HeartPulse, Minus, Play, Plus, Timer, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  CARDIO_KINDS, CARDIO_SESSION_KEY, OTHER_ACTIVITIES, cardioKey, cardioLabel, cardioSeconds, joinStoredCardio, treadmillStats,
  type CardioKind, type CardioRecord, type CardioSession, type TreadmillStep,
} from "@/lib/cardio";
import { KEYS, today, uid, useLocal, type Profile } from "@/lib/store";
import type { Plan } from "@/lib/plan";
import { healthKey, type HealthMonth } from "@/lib/health";
import { addDays } from "@/lib/insights";
import { PROGRAM_WEEKS, programAt } from "@/lib/program";
import { cardioZone, DEFAULT_RESTING_HR, hrMax, restingAverage } from "@/lib/heart";

const ICONS: Record<CardioKind, typeof Bike> = { caminhada: Footprints, corrida: Footprints, bicicleta: Bike, esteira: Gauge, eliptico: HeartPulse, outro: Timer };

const num = (v: number, digits = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export function clock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** "7,8 km/h em média · inclinação 2%" for a treadmill session, or null when nothing was typed. */
export function treadmillSummary(steps: TreadmillStep[] | undefined, totalS: number) {
  const t = treadmillStats(steps, totalS);
  const parts = [t.avgKmh !== null ? `${num(t.avgKmh)} km/h em média` : null, t.avgIncline !== null ? `inclinação ${num(t.avgIncline)}%` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** The phases of a treadmill session (a speed and an incline) with the time spent in each one. */
export function TreadmillSteps({ steps, totalS }: { steps: TreadmillStep[]; totalS: number }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead className="text-left text-xs text-muted-foreground">
        <tr><th className="py-1 font-semibold">Fase</th><th className="font-semibold">Velocidade</th><th className="font-semibold">Inclinação</th><th className="text-right font-semibold">Tempo</th></tr>
      </thead>
      <tbody className="divide-y divide-border">
        {steps.map((step, i) => (
          <tr key={step.atS}>
            <td className="py-1.5">{i + 1}</td>
            <td>{step.kmh !== null ? `${num(step.kmh)} km/h` : "—"}</td>
            <td>{step.incline !== null ? `${num(step.incline)}%` : "—"}</td>
            <td className="text-right font-semibold">{clock(phaseSeconds(steps, i, totalS))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const phaseSeconds = (steps: TreadmillStep[], i: number, totalS: number) => Math.max(0, (steps[i + 1]?.atS ?? totalS) - steps[i]!.atS);

/** The same phases as lines of text, for places where a table doesn't fit (inside a button). */
export function TreadmillLines({ steps, totalS }: { steps: TreadmillStep[]; totalS: number }) {
  return (
    <span className="mt-2 block space-y-0.5 border-t border-border pt-2 text-xs tabular-nums text-muted-foreground">
      {steps.map((step, i) => (
        <span key={step.atS} className="grid grid-cols-[3.25rem_1fr_1fr_3.25rem] gap-2">
          <span>Fase {i + 1}</span>
          <span>{step.kmh !== null ? `${num(step.kmh)} km/h` : "—"}</span>
          <span>{step.incline !== null ? `inclinação ${num(step.incline)}%` : "—"}</span>
          <span className="text-right font-semibold text-foreground">{clock(phaseSeconds(steps, i, totalS))}</span>
        </span>
      ))}
    </span>
  );
}

/** Treinos: starts a cardio session and shows it running, with a stopwatch that counts up. */
export function CardioPanel() {
  const userId = useAuth().user?.uid;
  const [session, setSession, ready] = useLocal<CardioSession | null>(CARDIO_SESSION_KEY, null);
  const [, setWaiting] = useLocal<CardioRecord[]>(cardioKey(today()), []);
  const [picking, setPicking] = useState(false);
  const [other, setOther] = useState<string | null>(null);
  // Treadmill chosen in the dialog: speed and incline of the first phase, set before the stopwatch starts.
  const [treadmill, setTreadmill] = useState<{ kmh: number | null; incline: number | null } | null>(null);

  if (!ready) return null;

  const start = (kind: CardioKind, name?: string) => {
    const first = kind === "esteira" && treadmill && (treadmill.kmh !== null || treadmill.incline !== null) ? [{ atS: 0, ...treadmill }] : undefined;
    setSession({ kind, name: name?.trim() || undefined, startedAt: Date.now(), steps: first });
    setPicking(false);
    setOther(null);
    setTreadmill(null);
  };
  const pick = (kind: CardioKind) => {
    setOther(kind === "outro" ? other ?? "" : null);
    setTreadmill(kind === "esteira" ? treadmill ?? { kmh: null, incline: null } : null);
    if (kind !== "outro" && kind !== "esteira") start(kind);
  };

  const finish = (steps: TreadmillStep[]) => {
    if (!session) return;
    const record: CardioRecord = { ...session, steps: steps.length ? steps : undefined, id: uid(), date: today(), finishedAt: Date.now() };
    setWaiting((list) => [...list, record]);
    setSession(null);
    toast.success(`Cardio concluído em ${clock(cardioSeconds(record))}`, {
      description: `${cardioLabel(record)}. Quando a atividade da pulseira chegar pelo Strava, os dois viram um registro só.`,
    });
    // The band's activity may already be here (Strava synced before this one was finished).
    if (userId) void joinStoredCardio(userId, record.date).catch(() => undefined);
  };

  if (session) {
    return <RunningCardio session={session} onChange={setSession} onFinish={finish}
      onCancel={() => { if (confirm("Cancelar o cardio? O tempo não será salvo.")) setSession(null); }} />;
  }

  return (
    <>
      <div className="mb-3"><CardioGoal /></div>
      <button type="button" onClick={() => setPicking(true)}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-display text-base font-bold text-primary">
        <HeartPulse className="h-5 w-5" />Iniciar cardio
      </button>
      <Dialog open={picking} onOpenChange={(open) => { setPicking(open); if (!open) { setOther(null); setTreadmill(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-xl">Iniciar cardio</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Grave também na pulseira. Quando a atividade chegar pelo Strava, ela se junta a este registro, sem duplicar.</p>
          <div className="grid grid-cols-2 gap-2">
            {CARDIO_KINDS.map(({ kind, label }) => {
              const Icon = ICONS[kind];
              const chosen = (kind === "outro" && other !== null) || (kind === "esteira" && treadmill !== null);
              return (
                <button key={kind} type="button" onClick={() => pick(kind)} aria-pressed={chosen}
                  className={`flex min-h-14 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left ${chosen ? "border-accent bg-accent/10" : "border-border"}`}>
                  <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 text-sm font-bold leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
          {treadmill !== null && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Stepper label="Velocidade" unit="km/h" value={treadmill.kmh} {...SPEED} onChange={(to) => setTreadmill((t) => t && { ...t, kmh: to(t.kmh) })} />
                <Stepper label="Inclinação" unit="%" value={treadmill.incline} {...INCLINE} onChange={(to) => setTreadmill((t) => t && { ...t, incline: to(t.incline) })} />
              </div>
              <p className="text-xs text-muted-foreground">O cronômetro só começa quando você tocar em Iniciar. Depois, cada mudança de velocidade ou inclinação vira uma fase com o tempo dela.</p>
              <Button type="button" onClick={() => start("esteira")} className="min-h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><Play />Iniciar esteira</Button>
            </div>
          )}
          {other !== null && (() => {
            const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
            const found = OTHER_ACTIVITIES.filter((a) => norm(a).includes(norm(other.trim())));
            const exact = found.some((a) => norm(a) === norm(other.trim()));
            return (
              <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); start("outro", found.length === 1 ? found[0] : other); }}>
                <Input aria-label="Buscar atividade" placeholder="Buscar: natação, jiu-jítsu, dança…" value={other} maxLength={30} onChange={(event) => setOther(event.target.value)} />
                <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-2xl border border-border">
                  {found.map((a) => (
                    <li key={a}>
                      <button type="button" onClick={() => start("outro", a)} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold">
                        {a}<Play className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                      </button>
                    </li>
                  ))}
                  {other.trim() && !exact && (
                    <li>
                      <button type="submit" className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold text-primary">
                        Iniciar “{other.trim()}”<Play className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    </li>
                  )}
                </ul>
                {!other.trim() && (
                  <Button type="submit" variant="secondary" className="min-h-11 w-full rounded-full"><Play />Iniciar sem nome</Button>
                )}
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

const SPEED = { step: 0.5, max: 25 };
const INCLINE = { step: 0.5, max: 20 };
const SAME_PHASE_S = 8;

function RunningCardio({ session, onChange, onFinish, onCancel }: {
  session: CardioSession; onChange: (next: (prev: CardioSession | null) => CardioSession | null) => void; onFinish: (steps: TreadmillStep[]) => void; onCancel: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsedS = Math.max(0, (now - session.startedAt) / 1000);
  // The phases started on this screen are the truth while it is open (the saved copy echoes back from the account).
  const [steps, setSteps] = useState(() => session.steps ?? []);
  const latest = useRef(steps);
  const current = steps.at(-1);

  /**
   * A change of speed or incline closes the running phase at this moment and starts the next one, with no button.
   * Taps in a row (8,0 → 8,5 → 9,0) are one change: a phase younger than SAME_PHASE_S is corrected, not closed.
   */
  const change = (field: "kmh" | "incline", to: (value: number | null) => number | null) => {
    const list = latest.current;
    const last = list.at(-1);
    const next = { kmh: last?.kmh ?? null, incline: last?.incline ?? null };
    next[field] = to(next[field]);
    if (next.kmh === (last?.kmh ?? null) && next.incline === (last?.incline ?? null)) return;
    const atS = Math.max(0, Math.round((Date.now() - session.startedAt) / 1000));
    const saved = last && atS - last.atS < SAME_PHASE_S ? [...list.slice(0, -1), { ...next, atS: last.atS }] : [...list, { ...next, atS }];
    latest.current = saved;
    setSteps(saved);
    setNow(Date.now());
    onChange((s) => s && { ...s, steps: saved });
  };
  const describe = (p: { kmh: number | null; incline: number | null }) =>
    [p.kmh !== null ? `${num(p.kmh)} km/h` : null, p.incline !== null ? `inclinação ${num(p.incline)}%` : null].filter(Boolean).join(" · ");
  const stats = treadmillStats(steps, elapsedS);
  const Icon = ICONS[session.kind];

  return (
    <section className="rounded-3xl border-2 border-primary bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-6 w-6 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">{cardioLabel(session)} em andamento</div>
            <div className="font-display text-5xl font-extrabold leading-tight tabular-nums" role="timer" aria-label="Tempo de cardio">{clock(elapsedS)}</div>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="-m-2 min-h-11 shrink-0 px-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Cancelar</button>
      </div>

      <div className="mt-3"><CardioGoal elapsedS={elapsedS} /></div>

      {session.kind === "esteira" && (
        <div className="mt-3 border-t border-border pt-3">
          {current && (
            <div className="mb-3 flex items-end justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-accent">Fase {steps.length} agora</div>
                <div className="text-sm font-semibold">{describe(current)}</div>
              </div>
              <div className="shrink-0 font-display text-3xl font-extrabold leading-none tabular-nums text-accent" role="timer" aria-label="Tempo nesta fase">{clock(elapsedS - current.atS)}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Velocidade" unit="km/h" value={current?.kmh ?? null} {...SPEED} onChange={(to) => change("kmh", to)} />
            <Stepper label="Inclinação" unit="%" value={current?.incline ?? null} {...INCLINE} onChange={(to) => change("incline", to)} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Mudou na esteira? Mude aqui: a fase atual fecha com o tempo dela e a nova começa a contar sozinha.</p>
          {steps.length > 0 && (
            <div className="mt-3">
              <TreadmillSteps steps={steps} totalS={elapsedS} />
              {stats.avgKmh !== null && <p className="mt-1 text-xs text-muted-foreground">Média {num(stats.avgKmh)} km/h · cerca de {num(stats.distanceM / 1000, 2)} km</p>}
            </div>
          )}
        </div>
      )}

      <Button type="button" onClick={() => onFinish(latest.current)} className="mt-3 min-h-12 w-full rounded-full bg-accent font-display text-base font-bold text-accent-foreground hover:bg-accent/90">
        <Check />Concluir cardio
      </Button>
    </section>
  );
}

/** A number changed by − and + or typed; the typed text is applied on leaving the field or Enter. `onChange` gets the change to apply to the value. */
function Stepper({ label, unit, value, step, max, onChange }: { label: string; unit: string; value: number | null; step: number; max: number; onChange: (change: (value: number | null) => number | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));
  const clamp = (v: number) => Math.min(max, Math.max(0, Math.round(v * 10) / 10));
  const commit = () => {
    if (draft === null) return;
    const typed = draft.trim() ? Number(draft.replace(",", ".")) : null;
    setDraft(null);
    if (typed !== null && !Number.isFinite(typed)) {
      toast.error(`Digite um número em ${label.toLowerCase()}`);
      return;
    }
    onChange(() => (typed === null ? null : clamp(typed)));
  };
  const bump = (delta: number) => { setDraft(null); onChange((saved) => clamp((saved ?? 0) + delta)); };
  const round = "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card disabled:opacity-40";
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label} ({unit})</div>
      <div className="mt-1 flex items-center gap-1">
        <button type="button" onClick={() => bump(-step)} disabled={!value} aria-label={`Diminuir ${label.toLowerCase()}`} className={round}><Minus className="h-5 w-5" /></button>
        <Input aria-label={`${label} em ${unit}`} inputMode="decimal" placeholder="—" value={draft ?? text(value)}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit} onFocus={(event) => event.target.select()}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className="h-11 min-w-0 flex-1 px-1 text-center font-display text-lg font-bold tabular-nums" />
        <button type="button" onClick={() => bump(step)} disabled={(value ?? 0) >= max} aria-label={`Aumentar ${label.toLowerCase()}`} className={round}><Plus className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

/** History: a cardio that only the app has so far (its Strava activity hasn't arrived, or was never recorded). */
export function WaitingCardio({ record, onDelete }: { record: CardioRecord; onDelete: () => void }) {
  const seconds = cardioSeconds(record);
  const stats = treadmillStats(record.steps, seconds);
  const summary = treadmillSummary(record.steps, seconds);
  const time = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <details open={!!record.steps?.length} className="group rounded-3xl border border-border bg-card px-4 py-3">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cardio · {new Date(`${record.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
            </div>
            <div className="truncate font-display text-lg font-bold">{cardioLabel(record)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right font-display font-bold tabular-nums">
              {stats.distanceM >= 100 && <div>{num(stats.distanceM / 1000)} km</div>}
              <div className="text-sm text-muted-foreground">{clock(seconds)}</div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
          </div>
        </div>
        {summary && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 shrink-0" />{summary}</div>}
      </summary>
      {record.steps?.length ? <div className="mt-3 border-t border-border pt-2"><TreadmillSteps steps={record.steps} totalS={seconds} /></div> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Início {time(record.startedAt)} · fim {time(record.finishedAt)}. Só no app por enquanto: quando a atividade da pulseira chegar pelo Strava, os dois viram um registro só.
      </p>
      <div className="mt-1 text-right">
        <button type="button" onClick={() => { if (confirm("Excluir este cardio?")) onDelete(); }} className="min-h-11 px-1 text-xs font-semibold text-muted-foreground hover:text-destructive">Excluir</button>
      </div>
    </details>
  );
}

/** Today's cardio target: minutes from the week of the training cycle and the heart rate band from the age and the band's resting rate. */
function useCardioGoal() {
  const date = today();
  const [profile] = useLocal<Profile | null>(KEYS.profile, null);
  const [plan] = useLocal<Plan | null>(KEYS.plan, null);
  const [thisMonth] = useLocal<HealthMonth>(healthKey(date), {});
  const [prevMonth] = useLocal<HealthMonth>(healthKey(addDays(date, -10)), {});
  if (!profile) return null;
  const week = plan ? programAt(plan, date) : null;
  const measured = restingAverage({ ...prevMonth, ...thisMonth }, date);
  const zone = cardioZone(measured ?? DEFAULT_RESTING_HR, hrMax(profile.age));
  return { minutes: week?.cardioMin ?? PROGRAM_WEEKS[0].cardioMin, week: week?.week ?? 1, zone, measured: measured !== null };
}

/** The target, before starting and while the stopwatch runs (with a bar up to the target time). */
function CardioGoal({ elapsedS }: { elapsedS?: number }) {
  const goal = useCardioGoal();
  if (!goal) return null;
  const pct = elapsedS === undefined ? 0 : Math.min(100, (elapsedS / (goal.minutes * 60)) * 100);
  const done = elapsedS !== undefined && pct >= 100;
  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Objetivo · semana {goal.week} do ciclo</div>
      <dl className="mt-1 grid grid-cols-2 gap-3">
        <div className="flex flex-col"><dt className="text-xs text-muted-foreground">Tempo</dt><dd className="font-display text-xl font-extrabold tabular-nums">{goal.minutes} min</dd></div>
        <div className="flex flex-col"><dt className="text-xs text-muted-foreground">Zona-alvo</dt><dd className="font-display text-xl font-extrabold tabular-nums">{goal.zone.low}–{goal.zone.high}<span className="text-sm font-semibold text-muted-foreground"> bpm</span></dd></div>
      </dl>
      {elapsedS !== undefined && (
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Tempo até o objetivo">
          <div className={`h-full rounded-full ${done ? "bg-[#3f9d6b]" : "bg-accent"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {done ? <b className="text-[#3f9d6b]">Tempo do objetivo cumprido. </b> : null}
        Mantenha o batimento na faixa (confira na Mi Band): dá para conversar, mas não cantar.{goal.measured ? "" : " A faixa usa um repouso estimado até a Mi Band mandar o seu."}
      </p>
    </div>
  );
}
