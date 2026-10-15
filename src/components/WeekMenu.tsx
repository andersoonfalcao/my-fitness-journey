import { useState } from "react";
import { CalendarRange, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addDays } from "@/lib/insights";
import { FAV_MEALS_KEY, frequentFoods, type FavMeal } from "@/lib/quick-foods";
import { plannedKey, targets, today, uid, useLocal, type FoodEntry, type Profile } from "@/lib/store";
import { buildWeekMenu, dayTotals, type MenuDay } from "@/lib/week-menu";

const MEAL_LABEL = { cafe: "Café da manhã", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar" } as const;
const DAYS_AHEAD = 7;

const dayLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

/**
 * "Montar minha semana": the AI fills the planned meals of the next days (tomorrow to a week ahead) from each day's
 * targets and the foods the person logs most. Days that already have something planned are left alone.
 * Nothing is saved until the person reviews the days and taps "Usar".
 */
export function WeekMenu({ profile, entries }: { profile: Profile; entries: FoodEntry[] }) {
  const dates = Array.from({ length: DAYS_AHEAD }, (_, k) => addDays(today(), k + 1));
  const firstKey = plannedKey(dates[0]!);
  const lastKey = plannedKey(dates.at(-1)!);
  // The week can cross into the next month: each month is its own planned document.
  const [plannedA, setPlannedA] = useLocal<FoodEntry[]>(firstKey, []);
  const [plannedB, setPlannedB] = useLocal<FoodEntry[]>(lastKey, []);
  const planned = firstKey === lastKey ? plannedA : [...plannedA, ...plannedB];
  const [favorites] = useLocal<FavMeal[]>(FAV_MEALS_KEY, []);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<MenuDay[] | null>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());

  const free = dates.filter((d) => !planned.some((f) => f.date === d));
  const busyDays = dates.filter((d) => !free.includes(d));

  const build = async () => {
    if (!free.length) return;
    setBusy(true);
    try {
      const usual = frequentFoods(entries, 30);
      const days = free.map((date) => {
        const t = targets(profile, date);
        return { date, kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat };
      });
      const result = await buildWeekMenu(days, usual, favorites);
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
    toast.success(`${chosen.length} ${chosen.length === 1 ? "dia planejado" : "dias planejados"}`, { description: "Veja cada dia pelo “Outro dia”. Ao comer, toque em “Comi”." });
    setMenu(null);
  };

  const chosenCount = menu ? menu.filter((d) => !skip.has(d.date)).length : 0;

  return (
    <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><CalendarRange className="h-4 w-4 shrink-0 text-accent" aria-hidden />Montar a semana com IA</p>
      <p className="mt-1 text-sm text-muted-foreground">
        A IA monta café, almoço, lanche e jantar de amanhã até {dayLabel(dates.at(-1)!)}, pela sua meta de cada dia e pelos alimentos que você mais registra. Você revisa antes de entrar no plano.
      </p>
      {busyDays.length > 0 && free.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{busyDays.length === 1 ? "1 dia já tem" : `${busyDays.length} dias já têm`} algo planejado e {busyDays.length === 1 ? "fica" : "ficam"} como {busyDays.length === 1 ? "está" : "estão"}.</p>
      )}
      {free.length === 0 ? (
        <p className="mt-2 text-sm font-semibold">Os próximos {DAYS_AHEAD} dias já estão planejados.</p>
      ) : (
        <Button type="button" onClick={build} disabled={busy} className="mt-3 min-h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
          {busy ? <><Loader2 className="animate-spin" />Montando… pode levar 1 minuto</> : <><Sparkles />Montar {free.length === 1 ? "1 dia" : `${free.length} dias`}</>}
        </Button>
      )}

      <Dialog open={!!menu} onOpenChange={(open) => !open && setMenu(null)}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-xl">Cardápio sugerido</DialogTitle></DialogHeader>
          <p className="-mt-1 text-sm text-muted-foreground">Desmarque o dia que não quiser. Depois de usar, dá para editar ou apagar cada alimento no próprio dia.</p>
          {menu?.map((d) => {
            const t = targets(profile, d.date);
            const total = dayTotals(d);
            const empty = d.meals.every((m) => m.items.length === 0);
            const on = !skip.has(d.date);
            return (
              <details key={d.date} className={`rounded-2xl border ${on ? "border-primary" : "border-border opacity-60"} bg-card`}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <input type="checkbox" checked={on} disabled={empty} aria-label={`Usar ${dayLabel(d.date)}`}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => setSkip((s) => { const n = new Set(s); if (n.has(d.date)) n.delete(d.date); else n.add(d.date); return n; })}
                    className="h-6 w-6 shrink-0 accent-[var(--primary)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-bold capitalize">{dayLabel(d.date)}</span>
                    {empty ? <span className="block text-xs text-muted-foreground">a IA não montou este dia</span> : (<>
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
