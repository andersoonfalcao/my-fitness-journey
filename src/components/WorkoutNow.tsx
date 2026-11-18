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
    <Link to="/treinos" className="pressable block rounded-3xl border border-brand-line bg-card p-5 shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="type-overline flex items-center gap-2 text-accent">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
            </span>Treino em andamento
          </div>
          <h2 className="type-h2 mt-1">{session.dayName}</h2>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ChevronRight className="h-6 w-6" aria-hidden /></span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col rounded-2xl bg-muted px-4 py-3">
          <span className="type-overline text-muted-foreground">Tempo</span>
          <WorkoutClock startedAt={session.startedAt} className="type-number text-3xl leading-tight" />
        </div>
        {items.length > 0 && (
          <div className="flex min-w-0 flex-col rounded-2xl bg-muted px-4 py-3">
            <span className="type-overline text-muted-foreground">Exercícios</span>
            <span className="type-number text-3xl leading-tight">{finished}<span className="text-lg font-semibold text-muted-foreground"> de {items.length}</span></span>
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={finished} aria-label={`${finished} de ${items.length} exercícios concluídos`}>
          <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${(finished / items.length) * 100}%` }} />
        </div>
      )}
      {item && (
        <div className="mt-4 border-t border-border pt-3">
          <span className="type-overline block text-muted-foreground">Agora</span>
          <span className="block font-semibold leading-tight">{byId(item.exId).name}</span>
          <span className="block text-sm text-muted-foreground">Série {done(current!) + 1} de {item.sets}</span>
        </div>
      )}
    </Link>
  );
}
