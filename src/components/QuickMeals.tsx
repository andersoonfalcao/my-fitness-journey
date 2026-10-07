import { useState } from "react";
import { RotateCcw, Star, X } from "lucide-react";
import { foodsKey, useLocal, type FoodEntry, type MealType } from "@/lib/store";
import { asItem, FAV_MEALS_KEY, itemsKcal, type FavItem, type FavMeal } from "@/lib/quick-foods";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayBefore = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return iso(d);
};

/** Alimentação → registrar: one tap to repeat yesterday's same meal or to log a saved favorite. */
export function QuickMeals({ date, meal, mealLabel, onAdd }: { date: string; meal: MealType; mealLabel: string; onAdd: (items: FavItem[], what: string) => void }) {
  const yesterday = dayBefore(date);
  const [yesterdayMonth] = useLocal<FoodEntry[]>(foodsKey(yesterday), []);
  const [favs, setFavs] = useLocal<FavMeal[]>(FAV_MEALS_KEY, []);
  const [managing, setManaging] = useState(false);
  const repeat = yesterdayMonth.filter((f) => f.date === yesterday && f.meal === meal).map(asItem);
  // The favorites of the chosen meal come first; the others stay reachable (a snack can become a light dinner).
  const sorted = [...favs].sort((a, b) => Number(b.meal === meal) - Number(a.meal === meal));
  if (!repeat.length && !favs.length) return null;

  const chip = "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-3.5 py-2 text-left text-sm font-semibold";
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rápido</span>
        {favs.length > 0 && (
          <button type="button" onClick={() => setManaging((m) => !m)} className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline">
            {managing ? "Pronto" : "Editar favoritas"}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {repeat.length > 0 && !managing && (
          <button type="button" onClick={() => onAdd(repeat, `${mealLabel} de ontem`)} className={`${chip} border-primary bg-primary/5`}>
            <RotateCcw className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">Repetir {mealLabel.toLowerCase()} de ontem</span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">{itemsKcal(repeat)} kcal</span>
          </button>
        )}
        {sorted.map((f) => (
          <span key={f.id} className={`${chip} border-input bg-card`}>
            <button type="button" disabled={managing} onClick={() => onAdd(f.items, f.name)} className="flex min-w-0 items-center gap-1.5 disabled:cursor-default">
              <Star className="h-4 w-4 shrink-0 fill-accent text-accent" />
              <span className="min-w-0 truncate">{f.name}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">{itemsKcal(f.items)} kcal</span>
            </button>
            {managing && (
              <button type="button" aria-label={`Apagar a favorita ${f.name}`} onClick={() => { if (confirm(`Apagar a favorita “${f.name}”?`)) setFavs((list) => list.filter((x) => x.id !== f.id)); }}
                className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-destructive">
                <X className="h-4 w-4" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
