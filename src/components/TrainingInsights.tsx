import { Activity, Flame } from "lucide-react";
import { today, useLocal } from "@/lib/store";
import { healthKey, type HealthMonth } from "@/lib/health";
import { addDays, overreach, weekStreak } from "@/lib/insights";
import { useTrainedDays } from "@/lib/trained";

const streakText = (weeks: number) => `${weeks} semanas seguidas cumprindo o plano`;

/** Semana: how many weeks in a row had the planned training days. */
export function StreakLine({ planned }: { planned: number }) {
  const streak = weekStreak(useTrainedDays(), planned, today());
  if (streak < 2) return null;
  return <p className="flex items-center gap-1.5"><Flame className="h-4 w-4 shrink-0 text-accent" aria-hidden /><b>{streakText(streak)}</b></p>;
}

/** Hoje: the streak of weeks on plan and, when the last days add up to fatigue, a suggestion to ease off. */
export function TrainingInsights({ planned }: { planned: number }) {
  const date = today();
  const trained = useTrainedDays();
  const [thisMonth] = useLocal<HealthMonth>(healthKey(date), {});
  const [prevMonth] = useLocal<HealthMonth>(healthKey(addDays(date, -17)), {});
  const streak = weekStreak(trained, planned, date);
  const tired = overreach({ ...prevMonth, ...thisMonth }, trained, date);
  if (streak < 2 && !tired) return null;
  return (
    <>
      {streak >= 2 && (
        <p className="flex items-center gap-2 rounded-3xl border border-border bg-card px-5 py-3 text-sm">
          <Flame className="h-5 w-5 shrink-0 text-accent" aria-hidden /><b>{streakText(streak)}</b>
        </p>
      )}
      {tired && (
        <section className="flex items-start gap-3 rounded-3xl border-2 border-accent bg-accent/10 p-4">
          <Activity className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            {tired.kind === "batimento"
              ? <><b>Batimento em repouso {tired.above} acima do seu normal há três dias.</b> É sinal de cansaço acumulado: vale um dia de descanso ou uma semana com menos carga.</>
              : <><b>{tired.days} dias seguidos de treino, sem descanso.</b> O corpo evolui na recuperação: inclua um dia livre antes do próximo treino pesado.</>}
          </p>
        </section>
      )}
    </>
  );
}
