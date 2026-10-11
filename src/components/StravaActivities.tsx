import { useEffect, useState } from "react";
import { StravaActivityDialog } from "@/components/StravaActivityDialog";
import { TreadmillLines, treadmillSummary, WaitingCardio } from "@/components/Cardio";
import { Activity, Dumbbell, Flame, Gauge, HeartPulse } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cardioKey, cardioLabel, cardioSeconds, isCardio, type CardioRecord } from "@/lib/cardio";
import { duration, km, sportLabel, stravaKey, syncStrava, type StravaActivity } from "@/lib/strava";
import { today, useLocal } from "@/lib/store";

const previousMonth = (date: string) => {
  const d = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Treinos: the user's recent Strava activities (synced in the background, at most every 15 minutes) and the cardio
 * started in the app that is still waiting for its Strava activity. A cardio already joined shows as the activity.
 */
export function StravaActivities({ waitingOnly = false }: { waitingOnly?: boolean }) {
  const uid = useAuth().user?.uid;
  const [open, setOpen] = useState<StravaActivity | null>(null);
  const [thisMonth] = useLocal<StravaActivity[]>(stravaKey(today()), []);
  const [lastMonth] = useLocal<StravaActivity[]>(stravaKey(previousMonth(today())), []);
  const [cardioNow, setCardioNow] = useLocal<CardioRecord[]>(cardioKey(today()), []);
  const [cardioBefore, setCardioBefore] = useLocal<CardioRecord[]>(cardioKey(previousMonth(today())), []);
  // A cardio from the last day may still be on its way from the band, so the 15 minutes between syncs don't apply.
  const expecting = [...cardioNow, ...cardioBefore].some((c) => Date.now() - c.finishedAt < 24 * 3600 * 1000);

  useEffect(() => {
    if (uid) void syncStrava(uid, expecting).catch(() => undefined);
  }, [uid, expecting]);

  const recent = [
    ...(waitingOnly ? [] : [...thisMonth, ...lastMonth]).map((a) => ({ start: new Date(a.start).getTime(), activity: a, cardio: null })),
    ...[...cardioNow, ...cardioBefore].map((c) => ({ start: c.startedAt, activity: null, cardio: c })),
  ].sort((a, b) => b.start - a.start);
  if (recent.length === 0) return null;
  // Weight training recorded by the band is not cardio: it gets its own list, below.
  const groups = [
    { id: waitingOnly ? undefined : "strava", title: waitingOnly ? "Aguardando o Strava" : "Cardio", Icon: Activity, items: recent.filter((r) => r.cardio || (r.activity && isCardio(r.activity))).slice(0, 10) },
    { id: "musculacao-pulseira", title: "Musculação pela pulseira", Icon: Dumbbell, items: recent.filter((r) => r.activity && !isCardio(r.activity)).slice(0, 10) },
  ].filter((g) => g.items.length > 0);
  const remove = (c: CardioRecord) => (c.date.slice(0, 7) === today().slice(0, 7) ? setCardioNow : setCardioBefore)((list) => list.filter((x) => x.id !== c.id));

  return (
    <>
    {groups.map(({ id, title, Icon, items }) => (
    <section key={title} id={id} className="scroll-mt-24 space-y-3 border-t border-border pt-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><Icon className="h-6 w-6 shrink-0 text-[#fc4c02]" />{title}</h2>
      <ul className="space-y-2">
        {items.map(({ activity: a, cardio }) => cardio ? (
          <li key={cardio.id}><WaitingCardio record={cardio} onDelete={() => remove(cardio)} /></li>
        ) : a && (
          <li key={a.id}>
            <button type="button" onClick={() => setOpen(a)} className="w-full rounded-3xl border border-border bg-card px-4 py-3 text-left transition hover:border-[#fc4c02]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {a.app ? cardioLabel(a.app) : sportLabel(a.sport)} · {new Date(`${a.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </div>
                <div className="truncate font-display text-lg font-bold">{a.name}</div>
              </div>
              <div className="shrink-0 text-right font-display font-bold tabular-nums">
                {a.distanceM > 0 && <div>{km(a.distanceM)} km</div>}
                <div className="text-sm text-muted-foreground">{duration(a.movingS)}</div>
              </div>
            </div>
            {(!!a.avgHr || !!a.kcal) && (
              <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                {!!a.avgHr && <span className="inline-flex items-center gap-1"><HeartPulse className="h-3.5 w-3.5" />{a.avgHr} bpm médio</span>}
                {!!a.kcal && <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{a.kcal} kcal</span>}
              </div>
            )}
            {a.app && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5 shrink-0" />{treadmillSummary(a.app.steps, cardioSeconds(a.app)) ?? "iniciado no forma, junto com o Strava"}
              </div>
            )}
            {a.app?.steps?.length ? <TreadmillLines steps={a.app.steps} totalS={cardioSeconds(a.app)} /> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
    ))}
    <StravaActivityDialog activity={open} onClose={() => setOpen(null)} />
    </>
  );
}
