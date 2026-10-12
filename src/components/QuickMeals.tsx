import { useState } from "react";
import { ChevronDown, RotateCcw, Star, X } from "lucide-react";
import { foodsKey, useLocal, type FoodEntry, type MealType } from "@/lib/store";
import { asItem, FAV_MEALS_KEY, itemsKcal, type FavItem, type FavMeal } from "@/lib/quick-foods";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayBefore = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return iso(d);
};
const r1 = (n: number) => Math.round(n * 10) / 10;
const YESTERDAY = "ontem";

/** Alimentação → registrar: yesterday's same meal and the saved favorites; a tap shows what the meal has before it is logged. */
export function QuickMeals({ date, meal, mealLabel, onAdd }: { date: string; meal: MealType; mealLabel: string; onAdd: (items: FavItem[], what: string) => void }) {
  const yesterday = dayBefore(date);
  const [yesterdayMonth] = useLocal<FoodEntry[]>(foodsKey(yesterday), []);
  const [favs, setFavs] = useLocal<FavMeal[]>(FAV_MEALS_KEY, []);
  const [managing, setManaging] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const repeat = yesterdayMonth.filter((f) => f.date === yesterday && f.meal === meal).map(asItem);
  // The favorites of the chosen meal come first; the others stay reachable (a snack can become a light dinner).
  const sorted = [...favs].sort((a, b) => Number(b.meal === meal) - Number(a.meal === meal));
  if (!repeat.length && !favs.length) return null;

  const fav = favs.find((f) => f.id === open);
  const shown = managing ? null
    : open === YESTERDAY && repeat.length ? { title: `${mealLabel} de ontem`, items: repeat }
    : fav ? { title: fav.name, items: fav.items }
    : null;
  const total = (shown?.items ?? []).reduce((a, i) => ({ c: a.c + i.c, p: a.p + i.p, f: a.f + i.f }), { c: 0, p: 0, f: 0 });
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  const chip = "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-3.5 py-2 text-left text-sm font-semibold";
  const arrow = (id: string) => <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === id ? "rotate-180" : ""}`} aria-hidden />;
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
          <button type="button" aria-expanded={open === YESTERDAY} onClick={() => toggle(YESTERDAY)} className={`${chip} border-primary ${open === YESTERDAY ? "bg-primary/15" : "bg-primary/5"}`}>
            <RotateCcw className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">Repetir {mealLabel.toLowerCase()} de ontem</span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">{itemsKcal(repeat)} kcal</span>
            {arrow(YESTERDAY)}
          </button>
        )}
        {sorted.map((f) => (
          <span key={f.id} className={`${chip} ${open === f.id && !managing ? "border-primary bg-primary/5" : "border-input bg-card"}`}>
            <button type="button" disabled={managing} aria-expanded={managing ? undefined : open === f.id} onClick={() => toggle(f.id)} className="flex min-w-0 items-center gap-1.5 disabled:cursor-default">
              <Star className="h-4 w-4 shrink-0 fill-accent text-accent" />
              <span className="min-w-0 truncate">{f.name}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">{itemsKcal(f.items)} kcal</span>
              {!managing && arrow(f.id)}
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
      {shown && (
        <div className="mt-3 rounded-2xl bg-muted p-4">
          <div className="font-display text-lg font-bold">{shown.title}</div>
          <ul className="mt-1 divide-y divide-border">
            {shown.items.map((i, n) => (
              <li key={n} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{i.grams} g · C {i.c} · P {i.p} · G {i.f}</div>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{Math.round(i.kcal)} kcal</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 sm:grid-cols-4">
            {([["Calorias", itemsKcal(shown.items), "kcal", undefined], ["Carboidratos", r1(total.c), "g", "var(--chart-1)"], ["Proteínas", r1(total.p), "g", "var(--chart-2)"], ["Gorduras", r1(total.f), "g", "var(--chart-3)"]] as const).map(([label, value, unit, color]) => (
              <div key={label} className="flex min-w-0 flex-col">
                <dt className="text-[11px] font-bold uppercase tracking-wide" style={{ color: color ?? "var(--muted-foreground)" }}>{label}</dt>
                <dd className="font-display text-xl font-bold tabular-nums">{value}<span className="text-xs font-semibold text-muted-foreground"> {unit}</span></dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:gap-2">
            <button type="button" onClick={() => { onAdd(shown.items, shown.title); setOpen(null); }} className="min-h-11 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground">
              Adicionar ao {mealLabel.toLowerCase()}
            </button>
            <button type="button" onClick={() => setOpen(null)} className="min-h-11 rounded-full px-4 py-2 font-semibold text-muted-foreground">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
