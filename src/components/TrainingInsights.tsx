import { Activity, Flame } from "lucide-react";
import { today, useLocal } from "@/lib/store";
import { healthKey, type HealthMonth } from "@/lib/health";
import { addDays, overreach, weekStreak } from "@/lib/insights";
import { useTrainedDays } from "@/lib/trained";

const streakText = (weeks: number) => `${weeks} semanas seguidas cumprindo o plano`;

/** Weeks in a row with the planned training days (0 or 1 = no streak yet). */
export function useWeekStreak(planned: number) {
  return weekStreak(useTrainedDays(), planned, today());
}

/** Hoje, in the greeting: the streak as an amber chip (amber is kept for the streak and alerts). */
export function StreakBadge({ planned }: { planned: number }) {
  const streak = useWeekStreak(planned);
  if (streak < 1) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-sm font-semibold text-warning-text" title={streakText(streak)}>
      <Flame className="h-4 w-4 fill-warning text-warning" aria-hidden />
      <span className="tabular-nums">{streak}</span> {streak === 1 ? "semana" : "semanas"}
      <span className="sr-only">seguidas cumprindo o plano</span>
    </span>
  );
}

/** Semana: how many weeks in a row had the planned training days. */
export function StreakLine({ planned }: { planned: number }) {
  const streak = weekStreak(useTrainedDays(), planned, today());
  if (streak < 2) return null;
  return <p className="flex items-center gap-1.5"><Flame className="h-4 w-4 shrink-0 text-warning" aria-hidden /><b>{streakText(streak)}</b></p>;
}

/** Hoje: the streak of weeks on plan and, when the last days add up to fatigue, a suggestion to ease off. */
export function TrainingInsights({ planned, streakRow = true }: { planned: number; streakRow?: boolean }) {
  const date = today();
  const trained = useTrainedDays();
  const [thisMonth] = useLocal<HealthMonth>(healthKey(date), {});
  const [prevMonth] = useLocal<HealthMonth>(healthKey(addDays(date, -17)), {});
  const streak = weekStreak(trained, planned, date);
  // A resting heart rate high for days is told in the Mi Band card (with today's numbers), not twice on the screen.
  const found = overreach({ ...prevMonth, ...thisMonth }, trained, date);
  const tired = found?.kind === "sem-descanso" ? found : null;
  if ((!streakRow || streak < 2) && !tired) return null;
  return (
    <>
      {streakRow && streak >= 2 && (
        <p className="flex items-center gap-2 rounded-3xl surface-card px-5 py-3 text-sm">
          <Flame className="h-5 w-5 shrink-0 text-warning" aria-hidden /><b>{streakText(streak)}</b>
        </p>
      )}
      {tired && (
        <section className="flex items-start gap-3 rounded-3xl border border-warning/40 bg-warning/10 p-4">
          <Activity className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            <b>{tired.days} dias seguidos de treino, sem descanso.</b> O corpo evolui na recuperação: inclua um dia livre antes do próximo treino pesado.
          </p>
        </section>
      )}
    </>
  );
}
