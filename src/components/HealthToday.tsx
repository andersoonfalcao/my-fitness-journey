import { Link } from "@tanstack/react-router";
import { BedDouble, Flame, Footprints, HeartPulse } from "lucide-react";
import { clock, sleepLabel, useHealthDay } from "@/lib/health";

/** Hoje: last night's sleep and the day's steps, active energy and resting heart rate from the band. */
export function HealthToday({ date }: { date: string }) {
  const day = useHealthDay(date);
  if (!day) return null;
  const tiles: [typeof BedDouble, string, string, string | null][] = [];
  if (day.sleepMin !== undefined) tiles.push([BedDouble, "Sono", sleepLabel(day.sleepMin), day.sleepStart && day.sleepEnd ? `${clock(day.sleepStart)}–${clock(day.sleepEnd)}` : null]);
  if (day.steps !== undefined) tiles.push([Footprints, "Passos", day.steps.toLocaleString("pt-BR"), null]);
  if (day.activeKcal !== undefined) tiles.push([Flame, "Energia ativa", `${day.activeKcal.toLocaleString("pt-BR")} kcal`, null]);
  if (day.restingHr !== undefined) tiles.push([HeartPulse, "Repouso", `${day.restingHr} bpm`, null]);
  if (!tiles.length) return null;
  return (
    <Link to="/corpo" search={{ aba: "evolucao" }} hash="saude" className="block rounded-3xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">Sua Mi Band hoje</h2>
        <span className="shrink-0 text-xs text-muted-foreground">atualizado {clock(new Date(day.at).toISOString())}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([Icon, label, value, sub]) => (
          <div key={label} className="rounded-2xl bg-muted/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Icon className="h-3.5 w-3.5 text-accent" aria-hidden />{label}</div>
            <div className="mt-1 whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{value}</div>
            {sub && <div className="text-xs tabular-nums text-muted-foreground">{sub}</div>}
          </div>
        ))}
      </div>
    </Link>
  );
}
