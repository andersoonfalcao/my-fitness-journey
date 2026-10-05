import { useState } from "react";
import { Check, Droplets, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocal, waterKey, type WaterLog } from "@/lib/store";

/** Quick amounts; tapping one fills the field, which can also be typed in, and Salvar adds it. */
const AMOUNTS = [200, 250, 300, 500, 750, 1000];
const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;

/** Water drunk on `date`, saved per day in the month document of the user's account. */
export function WaterCard({ date, targetMl }: { date: string; targetMl: number }) {
  const [log, setLog] = useLocal<WaterLog>(waterKey(date), {});
  const [custom, setCustom] = useState("250");
  const ml = log[date] ?? 0;
  const pct = Math.min(100, Math.round((ml / targetMl) * 100));

  const add = (delta: number) => setLog((l) => ({ ...l, [date]: Math.max(0, (l[date] ?? 0) + delta) }));
  const amount = () => {
    const value = Number(custom.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 3000) {
      toast.error("Escolha ou digite uma quantidade entre 1 e 3000 ml");
      return null;
    }
    return Math.round(value);
  };
  const save = () => {
    const value = amount();
    if (value === null) return;
    add(value);
    toast.success(`+${value} ml de água`);
  };
  const remove = () => {
    const value = amount();
    if (value === null) return;
    add(-value);
    toast(`−${Math.min(value, ml)} ml de água`);
  };

  return (
    <section id="agua" className="scroll-mt-24 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-chart-4" />
          <h2 className="font-bold">Água</h2>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-extrabold tabular-nums">{liters(ml)}</div>
          <div className="text-xs text-muted-foreground">meta {liters(targetMl)}</div>
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Água do dia">
        <div className="h-full rounded-full bg-chart-4 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quantidade">
        {AMOUNTS.map((a) => (
          <button key={a} type="button" onClick={() => setCustom(String(a))} aria-pressed={custom === String(a)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${custom === String(a) ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
            {a >= 1000 ? liters(a) : `${a} ml`}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative w-28">
          <Input
            inputMode="numeric"
            aria-label="Quantidade de água em ml"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            onFocus={(e) => e.target.select()}
            className="pr-9"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ml</span>
        </div>
        <Button type="button" onClick={save} className="rounded-full"><Check />Salvar</Button>
        {ml > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={remove} className="rounded-full text-muted-foreground"><Minus />Tirar</Button>
        )}
      </div>
    </section>
  );
}
