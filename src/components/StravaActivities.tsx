import { useEffect, useState } from "react";
import { StravaActivityDialog } from "@/components/StravaActivityDialog";
import { Activity, Flame, HeartPulse } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { duration, km, sportLabel, stravaKey, syncStrava, type StravaActivity } from "@/lib/strava";
import { today, useLocal } from "@/lib/store";

const previousMonth = (date: string) => {
  const d = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

/** Treinos: the user's recent Strava activities (synced in the background, at most every 15 minutes). */
export function StravaActivities() {
  const uid = useAuth().user?.uid;
  const [open, setOpen] = useState<StravaActivity | null>(null);
  const [thisMonth] = useLocal<StravaActivity[]>(stravaKey(today()), []);
  const [lastMonth] = useLocal<StravaActivity[]>(stravaKey(previousMonth(today())), []);

  useEffect(() => {
    if (uid) void syncStrava(uid).catch(() => undefined);
  }, [uid]);

  const recent = [...thisMonth, ...lastMonth].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 10);
  if (recent.length === 0) return null;

  return (
    <section className="space-y-3 border-t border-border pt-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><Activity className="h-6 w-6 text-[#fc4c02]" />Atividades do Strava</h2>
      <ul className="space-y-2">
        {recent.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => setOpen(a)} className="w-full rounded-3xl border border-border bg-card px-4 py-3 text-left transition hover:border-[#fc4c02]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {sportLabel(a.sport)} · {new Date(`${a.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
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
            </button>
          </li>
        ))}
      </ul>
      <StravaActivityDialog activity={open} onClose={() => setOpen(null)} />
    </section>
  );
}
