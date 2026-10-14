import { HeartPulse } from "lucide-react";
import { today, useLocal, type Profile } from "@/lib/store";
import { healthKey, type HealthMonth } from "@/lib/health";
import { stravaKey, type StravaActivity } from "@/lib/strava";
import { addDays } from "@/lib/insights";
import { DEFAULT_RESTING_HR, hrMax, karvonen, restingAverage, vo2Estimate, ZONES } from "@/lib/heart";

/**
 * Corpo → Evolução: the heart numbers of a fitness assessment, from the age and the band's resting heart rate:
 * maximum and reserve, the five training zones, an estimated VO2 max and the calories burned in workouts this week.
 */
export function FitnessCard({ profile }: { profile: Profile }) {
  const date = today();
  const [thisMonth] = useLocal<HealthMonth>(healthKey(date), {});
  const [prevMonth] = useLocal<HealthMonth>(healthKey(addDays(date, -10)), {});
  const [stravaNow] = useLocal<StravaActivity[]>(stravaKey(date), []);
  const [stravaBefore] = useLocal<StravaActivity[]>(stravaKey(addDays(date, -6)), []);
  const health = { ...prevMonth, ...thisMonth };
  const measured = restingAverage(health, date);
  const rest = measured ?? DEFAULT_RESTING_HR;
  const max = hrMax(profile.age);
  const band = Object.entries(health).filter(([, d]) => d.vo2max).sort(([a], [b]) => a.localeCompare(b)).at(-1)?.[1].vo2max;
  const vo2 = band ?? vo2Estimate(max, rest);
  const from = addDays(date, -6);
  const activities = stravaKey(from) === stravaKey(date) ? stravaNow : [...stravaBefore, ...stravaNow];
  const week = activities.filter((a) => a.date >= from && a.date <= date);
  const kcal = week.reduce((s, a) => s + (a.kcal ?? 0), 0);

  const stat = (label: string, value: string, unit: string, note?: string) => (
    <div className="flex flex-col rounded-2xl bg-muted/60 p-3">
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl font-extrabold tabular-nums">{value}<span className="text-sm font-semibold text-muted-foreground"> {unit}</span></dd>
      {note && <dd className="text-xs text-muted-foreground">{note}</dd>}
    </div>
  );
  return (
    <section id="condicionamento" className="scroll-mt-24 space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="px-2 sm:px-0">
        <h2 className="flex items-center gap-2 text-2xl font-bold"><HeartPulse className="h-6 w-6 text-accent" aria-hidden />Condicionamento</h2>
        <p className="text-sm text-muted-foreground">Pela sua idade ({profile.age} anos) e pelo batimento em repouso {measured ? "da Mi Band (média de 7 dias)" : "estimado: a Mi Band ainda não mandou"}.</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {stat("FC em repouso", String(rest), "bpm", measured ? undefined : "estimado")}
        {stat("FC máxima", String(max), "bpm", "208 − 0,7 × idade")}
        {stat("FC de reserva", String(max - rest), "bpm", "máxima − repouso")}
        {stat("VO2 máx", vo2.toLocaleString("pt-BR"), "ml/kg/min", band ? "da Mi Band" : "estimado pelos batimentos")}
      </dl>
      <div>
        <h3 className="px-2 font-bold sm:px-0">Zonas de treino</h3>
        <ul className="mt-1 divide-y divide-border text-sm">
          {ZONES.map((z) => (
            <li key={z.n} className="flex items-center justify-between gap-3 px-2 py-2 sm:px-0">
              <span className="inline-flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-display text-xs font-bold" style={{ background: `color-mix(in oklch, var(--accent) ${20 + z.n * 16}%, var(--card))` }}>{z.n}</span>
                <span className="font-semibold">{z.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground"><b className="text-foreground">{karvonen(rest, max, z.from)}–{karvonen(rest, max, z.to)}</b> bpm</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 px-2 text-xs text-muted-foreground sm:px-0">Faixas pela reserva cardíaca (Karvonen). O cardio do dia a dia rende mais nas zonas 2 e 3.</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {stat("Gasto em treinos", kcal.toLocaleString("pt-BR"), "kcal", "últimos 7 dias, pela pulseira")}
        {stat("Por treino", week.length ? Math.round(kcal / week.length).toLocaleString("pt-BR") : "—", "kcal", `${week.length} ${week.length === 1 ? "atividade" : "atividades"}`)}
      </dl>
    </section>
  );
}
