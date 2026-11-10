import { useState } from "react";
import { CalendarRange, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addDays } from "@/lib/insights";
import { FAV_MEALS_KEY, frequentFoods, type FavMeal } from "@/lib/quick-foods";
import { foodsKey, plannedKey, targets, today, uid, useLocal, type FoodEntry, type Profile } from "@/lib/store";
import { buildWeekMenu, dayTotals, MEAL_SHARE, MENU_MEALS, type MenuDay, type MenuDayTarget, type MenuMeal } from "@/lib/week-menu";

const MEAL_LABEL = { cafe: "Café da manhã", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar" } as const;
const DAYS_AHEAD = 7;

const dayLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
const chipLabel = (date: string) =>
  date === today() ? "Hoje" : date === addDays(today(), 1) ? "Amanhã" : new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
const chip = (on: boolean) => `min-h-10 rounded-full border px-3 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"}`;

/**
 * "Montar com IA": the AI fills the planned meals the person picks (which days, from today to a week ahead, and which
 * meals of the day) from each day's targets and the foods the person logs most. A meal that already has something
 * planned, or logged today, is left alone, and its calories come off the day's target.
 * Nothing is saved until the person reviews the days and taps "Usar".
 */
export function WeekMenu({ profile, entries }: { profile: Profile; entries: FoodEntry[] }) {
  const dates = Array.from({ length: DAYS_AHEAD + 1 }, (_, k) => addDays(today(), k));
  const firstKey = plannedKey(dates[0]!);
  const lastKey = plannedKey(dates.at(-1)!);
  // The week can cross into the next month: each month is its own planned document.
  const [plannedA, setPlannedA] = useLocal<FoodEntry[]>(firstKey, []);
  const [plannedB, setPlannedB] = useLocal<FoodEntry[]>(lastKey, []);
  const planned = firstKey === lastKey ? plannedA : [...plannedA, ...plannedB];
  // Today's log: a meal already eaten today isn't planned again.
  const [logged] = useLocal<FoodEntry[]>(foodsKey(today()), []);
  const [favorites] = useLocal<FavMeal[]>(FAV_MEALS_KEY, []);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<MenuDay[] | null>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());

  /** What is already on a day (planned, or eaten today): those meals are kept and their calories counted. */
  const taken = (date: string) => [...planned.filter((f) => f.date === date), ...(date === today() ? logged.filter((f) => f.date === date) : [])];
  const takenMeals = (date: string) => new Set(taken(date).map((f) => f.meal));
  // By default: the days ahead with nothing planned yet, all four meals.
  const [days, setDays] = useState<Set<string>>(() => new Set(dates.slice(1).filter((d) => !planned.some((f) => f.date === d))));
  const [meals, setMeals] = useState<Set<MenuMeal>>(() => new Set(MENU_MEALS));
  const toggle = <T,>(set: (fn: (s: Set<T>) => Set<T>) => void, v: T) => set((s) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; });

  /** Each picked day with the picked meals still free and their share of what is left of the day's targets. */
  const requests: MenuDayTarget[] = dates.filter((d) => days.has(d)).flatMap((date) => {
    const busyMeals = takenMeals(date);
    const free = MENU_MEALS.filter((m) => !busyMeals.has(m));
    const asked = free.filter((m) => meals.has(m));
    if (!asked.length) return [];
    const t = targets(profile, date);
    const used = taken(date).reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p }), { kcal: 0, p: 0 });
    const share = asked.reduce((s, m) => s + MEAL_SHARE[m], 0) / free.reduce((s, m) => s + MEAL_SHARE[m], 0);
    const kcal = Math.round(Math.max(0, t.kcal - used.kcal) * share);
    const ratio = t.kcal ? kcal / t.kcal : 0;
    return [{ date, meals: asked, kcal, protein: Math.round(Math.max(0, t.protein - used.p) * share), carbs: Math.round(t.carbs * ratio), fat: Math.round(t.fat * ratio) }];
  });
  const mealCount = requests.reduce((s, r) => s + r.meals.length, 0);
  const skipped = [...days].filter((d) => dates.includes(d) && !requests.some((r) => r.date === d));

  const build = async () => {
    if (!requests.length) return;
    setBusy(true);
    try {
      const result = await buildWeekMenu(requests, frequentFoods(entries, 30), favorites);
      if (result.every((d) => d.meals.every((m) => m.items.length === 0))) throw new Error("A IA não devolveu nenhuma refeição. Tente de novo.");
      setSkip(new Set(result.filter((d) => d.meals.every((m) => m.items.length === 0)).map((d) => d.date)));
      setMenu(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "A IA não respondeu. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!menu) return;
    const chosen = menu.filter((d) => !skip.has(d.date));
    const entriesOf = (key: string) => chosen.filter((d) => plannedKey(d.date) === key).flatMap((d) =>
      d.meals.flatMap((m) => m.items.map((i): FoodEntry => ({ ...i, id: uid(), date: d.date, meal: m.meal }))));
    const forA = entriesOf(firstKey);
    const forB = firstKey === lastKey ? [] : entriesOf(lastKey);
    if (forA.length) setPlannedA((ps) => [...ps, ...forA]);
    if (forB.length) setPlannedB((ps) => [...ps, ...forB]);
    // The days just planned are done: the picker starts empty for the next round.
    setDays(new Set());
    toast.success(`${chosen.length} ${chosen.length === 1 ? "dia planejado" : "dias planejados"}`, { description: "Escolha o dia acima para ver. Ao comer, toque em “Comi”." });
    setMenu(null);
  };

  const chosenCount = menu ? menu.filter((d) => !skip.has(d.date)).length : 0;
  const requestFor = (date: string) => requests.find((r) => r.date === date);

  return (
    <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><CalendarRange className="h-4 w-4 shrink-0 text-accent" aria-hidden />Montar com IA</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha os dias e as refeições. A IA monta pela sua meta de cada dia e pelos alimentos que você mais registra, e você revisa antes de entrar no plano.
      </p>

      <fieldset className="mt-3">
        <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dias</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {dates.map((d) => (
            <button key={d} type="button" aria-pressed={days.has(d)} onClick={() => toggle(setDays, d)} className={`capitalize ${chip(days.has(d))}`}>
              {chipLabel(d)}{planned.some((f) => f.date === d) && <span aria-label=", já tem algo planejado"> •</span>}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Refeições</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
          {MENU_MEALS.map((m) => (
            <button key={m} type="button" aria-pressed={meals.has(m)} onClick={() => toggle(setMeals, m)} className={chip(meals.has(m))}>{MEAL_LABEL[m]}</button>
          ))}
        </div>
      </fieldset>
      <p className="mt-2 text-xs text-muted-foreground">
        Refeição que já tem algo planejado (•) ou que você já comeu hoje fica como está, e as calorias dela saem da meta do dia.
        {skipped.length > 0 && <> {skipped.map(chipLabel).join(", ")}: as refeições escolhidas já estão preenchidas.</>}
      </p>

      <Button type="button" onClick={build} disabled={busy || !mealCount} className="mt-3 min-h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
        {busy ? <><Loader2 className="animate-spin" />Montando… pode levar 1 minuto</>
          : !mealCount ? "Escolha pelo menos um dia e uma refeição"
          : <><Sparkles />Montar {mealCount === 1 ? "1 refeição" : `${mealCount} refeições`} em {requests.length === 1 ? "1 dia" : `${requests.length} dias`}</>}
      </Button>

      <Dialog open={!!menu} onOpenChange={(open) => !open && setMenu(null)}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-xl">Cardápio sugerido</DialogTitle></DialogHeader>
          <p className="-mt-1 text-sm text-muted-foreground">Desmarque o dia que não quiser. Depois de usar, dá para editar ou apagar cada alimento no próprio dia.</p>
          {menu?.map((d) => {
            const t = requestFor(d.date);
            const total = dayTotals(d);
            const empty = d.meals.every((m) => m.items.length === 0);
            const on = !skip.has(d.date);
            return (
              <details key={d.date} className={`rounded-2xl border ${on ? "border-primary" : "border-border opacity-60"} bg-card`}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <input type="checkbox" checked={on} disabled={empty} aria-label={`Usar ${dayLabel(d.date)}`}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggle(setSkip, d.date)}
                    className="h-6 w-6 shrink-0 accent-[var(--primary)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-bold capitalize">{dayLabel(d.date)}</span>
                    <span className="block text-xs text-muted-foreground">{d.meals.map((m) => MEAL_LABEL[m.meal]).join(", ")}</span>
                    {empty ? <span className="block text-xs text-muted-foreground">a IA não montou este dia</span> : t && (<>
                      <span className="block text-xs tabular-nums text-muted-foreground">{total.kcal.toLocaleString("pt-BR")} de {t.kcal.toLocaleString("pt-BR")} kcal</span>
                      <span className="block text-xs tabular-nums text-muted-foreground">proteína {total.p} de {t.protein} g</span>
                    </>)}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-primary">ver</span>
                </summary>
                <div className="space-y-2 border-t border-border px-3 py-2">
                  {d.meals.filter((m) => m.items.length > 0).map((m) => (
                    <div key={m.meal}>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{MEAL_LABEL[m.meal]} · {Math.round(m.items.reduce((s, i) => s + i.kcal, 0))} kcal</p>
                      <ul className="text-sm">
                        {m.items.map((i, k) => (
                          <li key={k} className="py-0.5"><span className="block leading-snug">{i.name}</span><span className="block text-xs tabular-nums text-muted-foreground">{i.grams} g · {i.kcal} kcal · proteína {Math.round(i.p)} g</span></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={build} disabled={busy} className="min-h-11 rounded-full">
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Montar de novo
            </Button>
            <Button type="button" onClick={apply} disabled={chosenCount === 0 || busy} className="min-h-11 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Check />Usar {chosenCount === 1 ? "1 dia" : `${chosenCount} dias`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
