import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { byId } from "@/lib/exercises";
import type { Plan } from "@/lib/plan";
import type { WorkoutSession } from "@/lib/store";
import { WorkoutClock } from "@/components/WorkoutClock";

/** Hoje, while a workout runs: its name, clock, progress and the exercise of the moment; a tap goes back to it. */
export function WorkoutNow({ session, plan }: { session: WorkoutSession; plan: Plan | null }) {
  // A session of a workout that left the plan (regenerated meanwhile) still shows its name and clock.
  const items = plan?.days.find((d) => d.name === session.dayName)?.items ?? [];
  const done = (i: number) => session.sets?.[i] ?? 0;
  const pending = items.map((_, i) => i).filter((i) => done(i) < items[i]!.sets);
  const finished = items.length - pending.length;
  // The exercise resting between sets, else the one already started, else the first one still to do; the ones left
  // for later (machine busy) only once nothing else is left.
  const inOrder = pending.filter((i) => !session.later?.includes(i));
  const current = session.rest && pending.includes(session.rest.item) ? session.rest.item : inOrder.find((i) => done(i) > 0) ?? inOrder[0] ?? pending[0];
  const item = current === undefined ? undefined : items[current];

  return (
    <Link to="/treinos" className="block rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-accent">
            <span className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden />Treino em andamento
          </div>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{session.dayName}</h2>
        </div>
        <ChevronRight className="mt-1 h-6 w-6 shrink-0 opacity-75" aria-hidden />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-bold uppercase tracking-wider opacity-75">Tempo</span>
          <WorkoutClock startedAt={session.startedAt} className="font-display text-3xl font-extrabold leading-tight tabular-nums" />
        </div>
        {items.length > 0 && (
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-bold uppercase tracking-wider opacity-75">Exercícios</span>
            <span className="font-display text-3xl font-extrabold leading-tight tabular-nums">{finished}<span className="text-lg font-bold opacity-75"> de {items.length}</span></span>
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-foreground/20" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={finished} aria-label={`${finished} de ${items.length} exercícios concluídos`}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${(finished / items.length) * 100}%` }} />
        </div>
      )}
      {item && (
        <div className="mt-4 border-t border-primary-foreground/20 pt-3">
          <span className="block text-xs font-bold uppercase tracking-wider opacity-75">Agora</span>
          <span className="block font-bold leading-tight">{byId(item.exId).name}</span>
          <span className="block text-sm opacity-75">Série {done(current!) + 1} de {item.sets}</span>
        </div>
      )}
    </Link>
  );
}
