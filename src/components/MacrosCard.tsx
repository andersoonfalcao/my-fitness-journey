import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MacroBar } from "@/components/AppShell";
import { foodsKey, today, useLocal, type FoodEntry, type targets } from "@/lib/store";

type Targets = ReturnType<typeof targets>;
type Key = "c" | "f" | "p";

const MACROS: { key: Key; name: string; color: string; target: (t: Targets) => number }[] = [
  { key: "c", name: "Carboidratos", color: "var(--chart-1)", target: (t) => t.carbs },
  { key: "f", name: "Gorduras", color: "var(--chart-3)", target: (t) => t.fat },
  { key: "p", name: "Proteínas", color: "var(--chart-2)", target: (t) => t.protein },
];
// Day initials in pt-BR, Sunday first (Date.getDay order).
const INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const g = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} g`;

/** The 7 days ending on `end` (YYYY-MM-DD), oldest first. */
function lastSevenDays(end: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${end}T12:00:00`);
    d.setDate(d.getDate() - 6 + i);
    return { date: iso(d), initial: INITIALS[d.getDay()]!, label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) };
  });
}

/**
 * Macros of the last 7 days: per macro, the average of the logged days and one vertical bar per day that fills
 * up to the daily target. The arrow opens today's progress and the day-by-day table.
 */
export function MacrosCard({ t, end = today(), className = "" }: { t: Targets; end?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const days = lastSevenDays(end);
  // Food logs are one document per month, so a week can span two of them.
  const [thisMonth] = useLocal<FoodEntry[]>(foodsKey(end), []);
  const [prevMonth] = useLocal<FoodEntry[]>(foodsKey(days[0]!.date), []);
  const foods = foodsKey(days[0]!.date) === foodsKey(end) ? thisMonth : [...prevMonth, ...thisMonth];

  const totals = days.map(({ date }) => {
    const items = foods.filter((f) => f.date === date);
    return {
      logged: items.length > 0,
      kcal: items.reduce((s, f) => s + f.kcal, 0),
      c: items.reduce((s, f) => s + f.c, 0),
      f: items.reduce((s, f) => s + f.f, 0),
      p: items.reduce((s, f) => s + f.p, 0),
    };
  });
  const logged = totals.filter((d) => d.logged);
  const avg = (key: Key) => (logged.length ? logged.reduce((s, d) => s + d[key], 0) / logged.length : 0);
  const avgLabel = logged.length === 7 || logged.length === 0 ? "média de 7 dias" : `média de ${logged.length} dia${logged.length === 1 ? "" : "s"} com registro`;
  const todayTotals = totals[6]!;

  return (
    <section className={`rounded-3xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-between gap-2 text-left" aria-haspopup="dialog">
        <h2 className="font-display text-xl font-bold">Macros</h2>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          Detalhes<ChevronRight className="h-5 w-5" aria-hidden />
        </span>
      </button>
      <ul className="mt-3 divide-y divide-border">
        {MACROS.map((m) => {
          const target = m.target(t);
          return (
            <li key={m.key} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold" style={{ color: m.color }}>{m.name}</div>
                <div className="text-xs text-muted-foreground">{avgLabel}</div>
                <div className="font-display text-2xl font-extrabold leading-tight tabular-nums">{g(avg(m.key))}</div>
              </div>
              <div className="flex shrink-0 items-end gap-1.5" role="img"
                aria-label={`${m.name} por dia: ${days.map((d, i) => `${d.label} ${Math.round(totals[i]![m.key])} g`).join(", ")}; meta ${target} g`}>
                {days.map((d, i) => {
                  const value = totals[i]![m.key];
                  const pct = Math.min(100, target ? (value / target) * 100 : 0);
                  const over = target > 0 && value > target * 1.05;
                  const isEnd = i === 6;
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1">
                      <div className="relative h-16 w-3.5 overflow-hidden rounded-full bg-muted sm:w-4">
                        <div className="absolute inset-x-0 bottom-0 rounded-full transition-all" style={{ height: `${pct}%`, background: m.color }} />
                        {over && <div className="absolute inset-x-0 top-0 h-1.5 bg-foreground/60" />}
                      </div>
                      <span className={`text-[11px] ${isEnd ? "font-extrabold text-foreground" : "text-muted-foreground"}`}>{d.initial}</span>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Macros</DialogTitle>
            <DialogDescription>Cada barra enche até a meta do dia. Uma marca no topo indica que passou da meta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {end === today() ? "Hoje" : new Date(`${end}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {Math.round(todayTotals.kcal)} de {t.kcal} kcal
            </div>
            {MACROS.map((m) => <MacroBar key={m.key} name={m.name} value={todayTotals[m.key]} max={m.target(t)} color={m.color} />)}
          </div>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1 font-bold">Dia</th>
                <th className="py-1 text-right font-bold">kcal</th>
                {MACROS.map((m) => <th key={m.key} className="py-1 text-right font-bold" style={{ color: m.color }}>{m.name.slice(0, 4)}.</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {days.map((d, i) => {
                const day = totals[i]!;
                return (
                  <tr key={d.date} className={i === 6 ? "font-bold" : ""}>
                    <td className="py-2">{d.label}</td>
                    {day.logged ? (
                      <>
                        <td className="py-2 text-right">{Math.round(day.kcal).toLocaleString("pt-BR")}</td>
                        {MACROS.map((m) => <td key={m.key} className="py-2 text-right">{Math.round(day[m.key])}</td>)}
                      </>
                    ) : (
                      <td colSpan={4} className="py-2 text-right text-muted-foreground">sem registro</td>
                    )}
                  </tr>
                );
              })}
              <tr className="text-muted-foreground">
                <td className="py-2">Meta diária</td>
                <td className="py-2 text-right">{t.kcal.toLocaleString("pt-BR")}</td>
                {MACROS.map((m) => <td key={m.key} className="py-2 text-right">{m.target(t)}</td>)}
              </tr>
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </section>
  );
}
