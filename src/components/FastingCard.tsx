import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { toast } from "sonner";
import { KEYS, useLocal } from "@/lib/store";
import { FAST_GOALS, hoursLabel, startFromClock, type Fast, type FastRecord } from "@/lib/fasting";
import { cancelFastPush, scheduleFastPush } from "@/lib/push";

const clock = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const nowHHMM = () => clock(Date.now());

/**
 * Intermittent fasting: start now or at the time of the last meal, pick the goal, and the app counts the hours.
 * With notifications on, the server sends "Jejum completo" at the goal even with the app closed.
 */
export function FastingCard() {
  const [fast, setFast] = useLocal<Fast | null>(KEYS.fast, null);
  const [, setFasts] = useLocal<FastRecord[]>(KEYS.fasts, []);
  const [goal, setGoal] = useState<number>(16);
  const [from, setFrom] = useState(nowHHMM);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!fast) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [fast]);

  if (fast) {
    const elapsed = now - fast.startedAt;
    const goalMs = fast.goalH * 3_600_000;
    const done = elapsed >= goalMs;
    const pct = Math.min(100, (elapsed / goalMs) * 100);
    return (
      <section className={`rounded-3xl border-2 p-4 ${done ? "border-[#3f9d6b] bg-[#3f9d6b]/10" : "border-primary bg-card"}`}>
        <div className="flex items-center gap-3">
          <Hourglass className={`h-6 w-6 shrink-0 ${done ? "text-[#3f9d6b]" : "text-accent"}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{done ? "Jejum completo" : `Jejum · meta de ${fast.goalH} h`}</div>
            <div className="font-display text-3xl font-extrabold leading-tight tabular-nums">{hoursLabel(elapsed)}</div>
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progresso do jejum">
          <div className={`h-full rounded-full ${done ? "bg-[#3f9d6b]" : "bg-accent"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Começou às {clock(fast.startedAt)}{new Date(fast.startedAt).toDateString() !== new Date(now).toDateString() ? " de ontem" : ""}.{" "}
          {done ? <>Passou {hoursLabel(elapsed - goalMs)} da meta.</> : <>Completa às <b className="text-foreground">{clock(fast.startedAt + goalMs)}</b>, faltam {hoursLabel(goalMs - elapsed)}.</>}
        </p>
        <button type="button" onClick={() => {
          setFasts((list) => [...list, { startedAt: fast.startedAt, endedAt: Date.now(), goalH: fast.goalH }].slice(-200));
          cancelFastPush();
          setFast(null);
          toast.success(`Jejum encerrado com ${hoursLabel(Date.now() - fast.startedAt)}`);
        }} className={`mt-3 min-h-11 w-full rounded-full font-bold ${done ? "bg-[#3f9d6b] text-white" : "border border-input bg-card"}`}>
          {done ? "Encerrar jejum" : "Encerrar antes da meta"}
        </button>
      </section>
    );
  }

  return (
    <details className="group rounded-3xl border border-border bg-card px-4 py-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <Hourglass className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <span className="flex-1 font-bold">Jejum intermitente</span>
        <span className="text-sm font-semibold text-primary group-open:hidden">Iniciar</span>
      </summary>
      <div className="mt-2 space-y-3 border-t border-border pt-3">
        <fieldset>
          <legend className="text-sm font-bold">Meta</legend>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {FAST_GOALS.map((h) => (
              <button key={h} type="button" aria-pressed={goal === h} onClick={() => setGoal(h)}
                className={`min-h-11 rounded-full border text-sm font-bold ${goal === h ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{h} h</button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col justify-between">
          <label htmlFor="jejum-inicio" className="text-sm font-bold">Última refeição às</label>
          <input id="jejum-inicio" type="time" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base" />
        </div>
        <button type="button" onClick={() => {
          const startedAt = from ? startFromClock(from) : Date.now();
          setFast({ startedAt, goalH: goal });
          const endsAt = startedAt + goal * 3_600_000;
          if (endsAt > Date.now()) scheduleFastPush(endsAt, goal);
          toast.success(`Jejum de ${goal} h iniciado`, { description: `Completa às ${clock(endsAt)}.` });
        }} className="min-h-11 w-full rounded-full bg-accent font-bold text-accent-foreground">Iniciar jejum</button>
        <p className="text-xs text-muted-foreground">Com as notificações ligadas, o aviso chega na hora da meta mesmo com o app fechado.</p>
      </div>
    </details>
  );
}
