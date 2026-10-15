import { Link } from "@tanstack/react-router";
import { Ruler, X } from "lucide-react";
import { useState } from "react";
import { KEYS, today, useLocal, type MeasureEntry } from "@/lib/store";
import { useTrainedDays } from "@/lib/trained";
import { addDays, weekStart } from "@/lib/week";

/**
 * Hoje: the week's goal as numbered arrows, one per planned training day; days trained this week (gym or cardio)
 * fill them in order.
 */
export function WeekGoal({ planned }: { planned: number }) {
  const trained = useTrainedDays();
  const from = weekStart(today());
  const to = addDays(from, 6);
  const done = trained.filter((d) => d >= from && d <= to).length;
  const n = Math.max(1, planned);
  return (
    <section aria-label={`Meta semanal: ${Math.min(done, n)} de ${n} treinos`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Meta semanal</h2>
        <span className="text-sm tabular-nums text-muted-foreground">{done >= n ? (done > n ? `${done} treinos, ${done - n} além da meta` : "meta cumprida") : `${done} de ${n} treinos`}</span>
      </div>
      <ol className="flex">
        {Array.from({ length: n }, (_, i) => {
          const on = i < done;
          // Arrow shapes that fit into each other; the first has a flat start.
          const clip = i === 0 ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)" : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
          return (
            <li key={i} style={{ clipPath: clip }} className={`-ml-1 flex h-10 flex-1 items-center justify-center font-display text-base font-bold first:ml-0 ${on ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
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
    <section role="status" className="flex items-center gap-3 rounded-3xl border border-border bg-card py-1 pl-4 pr-2">
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
