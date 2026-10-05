import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Share2 } from "lucide-react";
import { NeedProfile } from "@/components/AppShell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DaySummary, dayShare } from "@/components/DayClose";
import { ShareDialog, type ShareRequest } from "@/components/ShareDialog";
import { StravaActivityDialog } from "@/components/StravaActivityDialog";
import { workoutCard } from "@/lib/share-card";
import { duration, km, sportLabel, stravaKey, type StravaActivity } from "@/lib/strava";
import {
  daysKey,
  foodsKey,
  KEYS,
  targets,
  today,
  useHistory,
  useLocal,
  waterKey,
  type BodyEntry,
  type DayRecord,
  type FoodEntry,
  type MealType,
  type Profile,
  type WaterLog,
  type WeightEntry,
  type WorkoutRecord,
} from "@/lib/store";
import { lastRecordBefore, recordTotal } from "@/lib/workout-stats";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — forma" },
      { name: "description", content: "Os números de cada dia: calorias, água, treinos, Strava e peso." },
    ],
  }),
  component: CalendarPage,
});

const WEEK = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MEAL_LABEL: Record<MealType, string> = { cafe: "Café da manhã", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar" };
const num = (n: number, digits = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Dates of the month grid, Monday first, padded with nulls before day 1. */
function monthGrid(month: string) {
  const first = new Date(`${month}-01T12:00:00`);
  const pad = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return [...Array<null>(pad).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
}

function CalendarPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [selected, setSelected] = useState<string | null>(null);
  const first = `${month}-01`;
  const [foods] = useLocal<FoodEntry[]>(foodsKey(first), []);
  const [water] = useLocal<WaterLog>(waterKey(first), {});
  const [closedDays] = useLocal<DayRecord[]>(daysKey(first), []);
  const [strava] = useLocal<StravaActivity[]>(stravaKey(first), []);
  const [history] = useHistory();
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [body] = useLocal<BodyEntry[]>(KEYS.body, []);
  const [share, setShare] = useState<ShareRequest | null>(null);
  const [activity, setActivity] = useState<StravaActivity | null>(null);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;

  const t = targets(profile);
  const now = today();
  const dayData = (date: string) => {
    const eaten = foods.filter((f) => f.date === date);
    const closed = closedDays.find((d) => d.date === date);
    const goal = closed?.day.targets ?? t;
    const kcal = Math.round(eaten.reduce((s, f) => s + f.kcal, 0));
    return {
      date,
      eaten,
      kcal,
      protein: Math.round(eaten.reduce((s, f) => s + f.p, 0)),
      carbs: Math.round(eaten.reduce((s, f) => s + f.c, 0)),
      fat: Math.round(eaten.reduce((s, f) => s + f.f, 0)),
      waterMl: water[date] ?? 0,
      goal,
      onCalories: eaten.length > 0 && Math.abs(kcal - goal.kcal) <= goal.kcal * 0.1,
      workouts: history.filter((r) => r.date === date),
      strava: strava.filter((a) => a.date === date),
      weight: weights.find((w) => w.date === date)?.kg ?? null,
      bio: body.find((b) => b.date === date),
      closed,
    };
  };

  const dates = monthGrid(month).filter((d): d is string => !!d && d <= now);
  const all = dates.map(dayData);
  const logged = all.filter((d) => d.eaten.length > 0);
  const monthWeights = weights.filter((w) => w.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const weightChange = monthWeights.length > 1 ? monthWeights.at(-1)!.kg - monthWeights[0]!.kg : null;
  const summary: [string, string][] = [
    ["dias com treino", String(all.filter((d) => d.workouts.length > 0).length)],
    ["dias com refeições", String(logged.length)],
    ["média de calorias", logged.length ? `${Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length)} kcal` : "—"],
    ["dias na meta de calorias", String(all.filter((d) => d.onCalories).length)],
    ["dias na meta de água", String(all.filter((d) => d.waterMl >= d.goal.waterMl).length)],
    ["Strava", strava.length ? `${strava.length} ativ.${strava.some((a) => a.distanceM) ? ` · ${km(strava.reduce((s, a) => s + a.distanceM, 0))} km` : ""}` : "—"],
    ["peso no mês", weightChange === null ? "—" : `${weightChange > 0 ? "+" : ""}${num(weightChange)} kg`],
    ["dias fechados", String(closedDays.length)],
  ];

  const shift = (delta: number) => {
    const d = new Date(`${month}-01T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    const next = iso(d).slice(0, 7);
    setMonth(next);
    setSelected(null);
  };
  const sel = selected ? dayData(selected) : null;
  const monthName = cap(new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Calendário</h1>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior" className="rounded-full p-2 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-36 text-center font-display text-lg font-bold">{monthName}</span>
          <button type="button" onClick={() => shift(1)} disabled={month >= now.slice(0, 7)} aria-label="Próximo mês" className="rounded-full p-2 hover:bg-muted disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-card p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-muted-foreground">
          {WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {monthGrid(month).map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const future = date > now;
            const d = future ? null : dayData(date);
            const isSel = date === selected;
            return (
              <button
                key={date}
                type="button"
                disabled={future}
                onClick={() => setSelected(date)}
                aria-label={new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
                aria-pressed={isSel}
                className={`flex aspect-square flex-col items-center justify-between rounded-2xl p-1 text-sm transition sm:p-2 ${
                  isSel ? "bg-primary text-primary-foreground" : future ? "opacity-30" : "hover:bg-muted"
                } ${date === now && !isSel ? "ring-2 ring-accent" : ""}`}
              >
                <span className={`font-display font-bold ${d?.closed && !isSel ? "text-accent" : ""}`}>{Number(date.slice(8))}</span>
                {d && (
                  <span className="flex flex-wrap justify-center gap-0.5 sm:gap-1">
                    {d.workouts.length > 0 && <Dot color="var(--accent)" />}
                    {d.eaten.length > 0 && <Dot color={d.onCalories ? "var(--chart-2)" : "var(--muted-foreground)"} />}
                    {d.waterMl >= d.goal.waterMl && <Dot color="#4fb3c9" />}
                    {d.strava.length > 0 && <Dot color="#fc4c02" ring />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <Legend color="var(--accent)" label="treino" />
          <Legend color="var(--chart-2)" label="calorias na meta" />
          <Legend color="var(--muted-foreground)" label="refeições fora da meta" />
          <Legend color="#4fb3c9" label="água na meta" />
          <Legend color="#fc4c02" label="Strava" ring />
          <span><b className="text-accent">7</b> dia fechado</span>
        </div>
      </section>

      <Dialog open={!!sel} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-xl">
        {sel && (<>
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-display text-2xl">
            {cap(new Date(`${sel.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }))}
          </DialogTitle>
          <DialogDescription>Os números deste dia</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={`de ${sel.goal.kcal} kcal`} value={`${sel.kcal} kcal`} />
          <Stat label={`proteína de ${sel.goal.protein} g`} value={`${sel.protein} g`} />
          <Stat label={`água de ${num(sel.goal.waterMl / 1000)} L`} value={`${num(sel.waterMl / 1000)} L`} />
          <Stat label="peso" value={sel.weight ? `${num(sel.weight)} kg` : "—"} />
          <Stat label={`carboidratos de ${sel.goal.carbs} g`} value={`${sel.carbs} g`} />
          <Stat label={`gorduras de ${sel.goal.fat} g`} value={`${sel.fat} g`} />
          {sel.bio?.fatPct !== undefined && <Stat label="gordura corporal (bioimpedância)" value={`${num(sel.bio.fatPct)}%`} />}
          {sel.bio?.muscleKg !== undefined && <Stat label="massa muscular (bioimpedância)" value={`${num(sel.bio.muscleKg)} kg`} />}
        </div>

        {sel.eaten.length > 0 && (
          <div>
            <h3 className="font-bold">Refeições</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {(Object.keys(MEAL_LABEL) as MealType[]).map((m) => {
                const items = sel.eaten.filter((f) => f.meal === m);
                if (!items.length) return null;
                return (
                  <li key={m}>
                    <b>{MEAL_LABEL[m]}</b> <span className="text-muted-foreground">· {Math.round(items.reduce((s, f) => s + f.kcal, 0))} kcal · {items.map((f) => f.name).join(", ")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {sel.workouts.map((r) => {
          const total = recordTotal(r);
          const done = r.exercises.reduce((s, e) => s + e.setsDone, 0);
          const planned = r.exercises.reduce((s, e) => s + e.setsPlanned, 0);
          const previous = lastRecordBefore(history.slice(0, history.indexOf(r)), r.dayName);
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-5 w-5 text-accent" />
                <div>
                  <div className="font-display text-lg font-bold">{r.dayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.durationMs !== undefined ? `${Math.round(r.durationMs / 60000)} min · ` : ""}{done}/{planned} séries{total ? ` · ${num(total, 0)} kg de volume` : ""}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShare({ heading: `${r.dayName} concluído! 💪`, title: `${r.dayName} concluído no forma.`, fileName: `forma-treino-${r.date}.png`, make: (bg) => workoutCard(r, previous, bg) })}
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><Share2 className="h-4 w-4" />Compartilhar</button>
            </div>
          );
        })}

        {sel.strava.map((a) => (
          <button key={a.id} type="button" onClick={() => setActivity(a)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-left hover:border-[#fc4c02]">
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#fc4c02]">{sportLabel(a.sport)} · Strava</span>
              <span className="block truncate font-display font-bold">{a.name}</span>
            </span>
            <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
              {a.distanceM > 0 && <span className="block">{km(a.distanceM)} km</span>}
              <span className="block text-muted-foreground">{duration(a.movingS)}</span>
            </span>
          </button>
        ))}

        {sel.closed ? (
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 font-bold">Resumo do dia</h3>
            <DaySummary record={sel.closed} onShare={() => setShare(dayShare(sel.closed!))} />
          </div>
        ) : sel.eaten.length === 0 && sel.workouts.length === 0 && sel.strava.length === 0 && !sel.waterMl && !sel.weight && !sel.bio ? (
          <p className="text-sm text-muted-foreground">Nada registrado neste dia.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Este dia não foi fechado. {sel.date === now ? "Feche o dia na tela Hoje para receber o resumo da IA." : ""}</p>
        )}
        </div>
        </>)}
        </DialogContent>
      </Dialog>

      <section className="rounded-3xl bg-primary p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold">Resumo de {monthName.split(" ")[0]!.toLowerCase()}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summary.map(([label, value]) => (
            <div key={label}>
              <div className="font-display text-2xl font-extrabold tabular-nums">{value}</div>
              <div className="text-xs opacity-75">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <ShareDialog request={share} onClose={() => setShare(null)} />
      <StravaActivityDialog activity={activity} onClose={() => setActivity(null)} />
    </div>
  );
}

/** Day marker; `ring` draws it hollow so Strava stays apart from the (also orange) workout dot. */
function Dot({ color, ring = false }: { color: string; ring?: boolean }) {
  return <span className="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2" style={ring ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : { background: color }} />;
}

function Legend({ color, label, ring = false }: { color: string; label: string; ring?: boolean }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={ring ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : { background: color }} />{label}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-3 py-2">
      <div className="font-display text-lg font-bold leading-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
