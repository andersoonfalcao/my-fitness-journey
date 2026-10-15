import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, ChefHat, Dumbbell, Flag, Footprints, HeartPulse, Hourglass, Lock, Ruler, Scale, Trophy, Utensils, Weight, X } from "lucide-react";
import { foodsKey, KEYS, today, useHistory, useLocal, type FoodEntry, type MeasureEntry, type Profile, type WeightEntry } from "@/lib/store";
import { healthKey, STEPS_GOAL_KEY, type HealthMonth } from "@/lib/health";
import { useTrainedDays } from "@/lib/trained";
import { addDays } from "@/lib/insights";
import { achievements, ACHIEVEMENTS_KEY, type Achievement } from "@/lib/achievements";
import type { FastRecord } from "@/lib/fasting";
import type { Recipe } from "@/lib/recipes";

const ICON: Record<string, typeof Trophy> = {
  treinos: Dumbbell, semanas: CalendarCheck, recordes: Trophy, tonelada: Weight, cardio: HeartPulse, jejum: Hourglass,
  alimentacao: Utensils, passos: Footprints, pesagens: Scale, medidas: Ruler, receitas: ChefHat, meta: Flag,
};
const monthBefore = (date: string) => { const d = new Date(`${date.slice(0, 7)}-01T12:00:00`); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };

/** Every medal with its progress, the date each was first seen won, and whether the data has loaded. */
function useAchievements(profile: Profile) {
  const date = today();
  const [history, , historyReady] = useHistory();
  const trained = useTrainedDays();
  const [fasts] = useLocal<FastRecord[]>(KEYS.fasts, []);
  const [weights, , weightsReady] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [measures] = useLocal<MeasureEntry[]>(KEYS.measures, []);
  const [recipes] = useLocal<Recipe[]>(KEYS.recipes, []);
  const [foodsNow] = useLocal<FoodEntry[]>(foodsKey(date), []);
  const [foodsBefore] = useLocal<FoodEntry[]>(foodsKey(monthBefore(date)), []);
  const [healthNow] = useLocal<HealthMonth>(healthKey(date), {});
  const [healthBefore] = useLocal<HealthMonth>(healthKey(monthBefore(date)), {});
  const [stepsGoal] = useLocal<number>(STEPS_GOAL_KEY, 8000);
  const [won, setWon, wonReady] = useLocal<Record<string, string>>(ACHIEVEMENTS_KEY, {});
  const last = [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.kg;
  const start = [...weights].sort((a, b) => a.date.localeCompare(b.date))[0]?.kg ?? profile.weight;
  const goalReached = last !== undefined && (start > profile.goalWeight ? last <= profile.goalWeight : start < profile.goalWeight ? last >= profile.goalWeight : false);
  const list = achievements({
    history, trained, plannedDays: profile.days, fasts, weighIns: weights.length, measures: measures.length, recipes: recipes.length,
    foods: [...foodsBefore, ...foodsNow], health: { ...healthBefore, ...healthNow }, stepsGoal, goalReached, today: date,
  });
  return { list, won, setWon, ready: historyReady && weightsReady && wonReady };
}

const isWon = (a: Achievement, won: Record<string, string>) => !!won[a.id] || a.have >= a.need;

/**
 * Hoje: keeps the won medals saved (so a streak that breaks keeps its medal) and shows the ones won in the last
 * three days. The first time it runs, what was already won is saved quietly instead of announced all at once.
 */
export function AchievementWatcher({ profile }: { profile: Profile }) {
  const { list, won, setWon, ready } = useAchievements(profile);
  // The cardio days arrive a moment after the rest; waiting a little keeps them from looking new.
  const [settled, setSettled] = useState(false);
  useEffect(() => { if (!ready) return; const id = setTimeout(() => setSettled(true), 3000); return () => clearTimeout(id); }, [ready]);
  const fresh = list.filter((a) => a.have >= a.need && !won[a.id]);
  useEffect(() => {
    if (!settled || fresh.length === 0) return;
    const first = Object.keys(won).length === 0;
    const stamp = first ? "antes" : today();
    setWon((prev) => ({ ...prev, ...Object.fromEntries(fresh.map((a) => [a.id, prev[a.id] ?? stamp])) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, fresh.map((a) => a.id).join()]);
  const [hidden, setHidden] = useState(false);
  const recent = list.filter((a) => won[a.id] && won[a.id] !== "antes" && won[a.id]! >= addDays(today(), -2));
  if (hidden || recent.length === 0) return null;
  return (
    <section className="flex items-start gap-3 rounded-3xl border border-[#3f9d6b]/40 bg-[#3f9d6b]/10 p-4">
      <Trophy className="mt-0.5 h-6 w-6 shrink-0 text-[#2f7d54] dark:text-[#6cc495]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{recent.length === 1 ? `Conquista nova: ${recent[0]!.title}` : `${recent.length} conquistas novas`}</p>
        <p className="text-sm text-muted-foreground">{recent.length === 1 ? recent[0]!.how : recent.map((a) => a.title).join(" · ")}</p>
        <Link to="/perfil" hash="conquistas" className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4">Ver todas as conquistas</Link>
      </div>
      <button type="button" aria-label="Fechar" onClick={() => setHidden(true)} className="-m-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground"><X className="h-5 w-5" /></button>
    </section>
  );
}

/** Perfil: every medal, won ones lit and the rest dimmed with what is missing. */
export function AchievementsGrid({ profile }: { profile: Profile }) {
  const { list, won } = useAchievements(profile);
  const [open, setOpen] = useState<Achievement | null>(null);
  const count = list.filter((a) => isWon(a, won)).length;
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  return (
    <section id="conquistas" className="scroll-mt-24 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Minhas conquistas</h2>
        <span className="text-sm tabular-nums text-muted-foreground">{count} de {list.length}</span>
      </div>
      <ul className="mt-3 grid grid-cols-4 gap-3">
        {list.map((a) => {
          const on = isWon(a, won);
          const Icon = on ? ICON[a.group] ?? Trophy : Lock;
          return (
            <li key={a.id}>
              <button type="button" onClick={() => setOpen(open?.id === a.id ? null : a)} aria-pressed={open?.id === a.id} aria-label={`${a.title}: ${on ? "conquistada" : "falta"}`}
                className="flex w-full flex-col items-center gap-1 text-center">
                <span className={`grid h-14 w-14 place-items-center rounded-full border-2 ${on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-muted text-muted-foreground"} ${open?.id === a.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className={`text-[11px] font-semibold leading-tight ${on ? "" : "text-muted-foreground"}`}>{a.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <div className="mt-4 rounded-2xl bg-muted/60 p-3 text-sm" aria-live="polite">
          <p className="font-bold">{open.title}</p>
          <p className="text-muted-foreground">{open.how}.</p>
          {isWon(open, won) ? (
            <p className="mt-1 font-semibold text-[#3f9d6b]">Conquistada{won[open.id] && won[open.id] !== "antes" ? ` em ${new Date(`${won[open.id]}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}.</p>
          ) : (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (open.have / open.need) * 100)}%` }} /></div>
              <p className="mt-1 tabular-nums text-muted-foreground">{fmt(Math.min(open.have, open.need))} de {fmt(open.need)}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
