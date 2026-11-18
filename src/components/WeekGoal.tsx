import { Link } from "@tanstack/react-router";
import { Check, Ruler, X } from "lucide-react";
import { useState } from "react";
import { KEYS, today, useLocal, type MeasureEntry } from "@/lib/store";
import { useTrainedDays } from "@/lib/trained";
import { addDays, weekStart } from "@/lib/week";

/**
 * Hoje: the week's goal as numbered arrows, one per planned training day; days trained this week (gym or cardio)
 * fill them in order.
 */
export function WeekGoal({ planned, compact = false }: { planned: number; compact?: boolean }) {
  const trained = useTrainedDays();
  const from = weekStart(today());
  const to = addDays(from, 6);
  const done = trained.filter((d) => d >= from && d <= to).length;
  const n = Math.max(1, planned);
  if (compact) {
    // Hoje: a tile beside the weight, the week as a row of small segments.
    return (
      <Link to="/semana" aria-label={`Meta semanal: ${Math.min(done, n)} de ${n} treinos. Ver a semana`} className="pressable flex flex-col justify-between rounded-3xl surface-card p-4 hover:border-line-strong">
        <span className="type-overline text-muted-foreground">Semana</span>
        <span className="type-number mt-1 text-3xl leading-none">{Math.min(done, n)}<span className="text-sm font-semibold text-muted-foreground"> de {n} treinos</span></span>
        <span className="mt-2 flex gap-1" aria-hidden>
          {Array.from({ length: n }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < done ? "bg-brand" : "bg-muted"}`} />)}
        </span>
      </Link>
    );
  }
  return (
    <section aria-label={`Meta semanal: ${Math.min(done, n)} de ${n} treinos`} className="rounded-3xl surface-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="type-h3">Meta semanal</h2>
        <span className={`text-sm font-medium tabular-nums ${done >= n ? "text-success-text" : "text-muted-foreground"}`}>{done >= n ? (done > n ? `${done} treinos, ${done - n} além da meta` : "meta cumprida") : `${done} de ${n} treinos`}</span>
      </div>
      <ol className="flex gap-1.5">
        {Array.from({ length: n }, (_, i) => {
          const on = i < done;
          return (
            <li key={i} className={`flex h-10 flex-1 items-center justify-center rounded-xl font-display text-base font-bold transition-colors duration-300 ${on ? "bg-brand text-on-brand" : "bg-muted text-muted-foreground"}`}>
              {on ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> : i + 1}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const MEASURES_EVERY_DAYS = 30;
const DISMISS_KEY = "forma.measures.notice";

/** Hoje: a reminder to take the tape measurements when none were ever logged or the last ones are 30+ days old. */
export function MeasuresNotice() {
  const [measures, , ready] = useLocal<MeasureEntry[]>(KEYS.measures, []);
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) ?? ""; } catch { return ""; } });
  if (!ready) return null;
  const last = [...measures].map((m) => m.date).sort().at(-1);
  const due = !last || last <= addDays(today(), -MEASURES_EVERY_DAYS);
  // Closing it hides it for 30 days.
  if (!due || (dismissed && dismissed > addDays(today(), -MEASURES_EVERY_DAYS))) return null;
  const days = last ? Math.round((new Date(`${today()}T12:00:00`).getTime() - new Date(`${last}T12:00:00`).getTime()) / 86_400_000) : null;
  return (
    // A reminder that can wait: a quiet row instead of an orange alert.
    <section role="status" className="flex items-center gap-3 rounded-3xl surface-card py-1 pl-4 pr-2">
      <Ruler className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      <Link to="/corpo" hash="medidas" className="flex min-h-12 min-w-0 flex-1 flex-col justify-center py-1.5">
        <span className="text-sm font-bold">{days === null ? "Tirar as medidas" : `Medidas: faz ${days} dias`}</span>
        <span className="text-xs text-muted-foreground">Cintura e braço mostram se o que sai é gordura</span>
      </Link>
      <button type="button" aria-label="Fechar o aviso por 30 dias" onClick={() => { const d = today(); setDismissed(d); try { localStorage.setItem(DISMISS_KEY, d); } catch { /* private mode */ } }}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground"><X className="h-5 w-5" /></button>
    </section>
  );
}
