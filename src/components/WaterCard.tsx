import { useState } from "react";
import { Droplets, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocal, waterKey, type WaterLog } from "@/lib/store";

const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;

/** Water drunk on `date`, saved per day in the month document of the user's account. */
export function WaterCard({ date, targetMl }: { date: string; targetMl: number }) {
  const [log, setLog] = useLocal<WaterLog>(waterKey(date), {});
  const [custom, setCustom] = useState("");
  const ml = log[date] ?? 0;
  const pct = Math.min(100, Math.round((ml / targetMl) * 100));

  const add = (delta: number) => setLog((l) => ({ ...l, [date]: Math.max(0, (l[date] ?? 0) + delta) }));
  const addCustom = () => {
    const value = Number(custom.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 3000) {
      toast.error("Digite uma quantidade entre 1 e 3000 ml");
      return;
    }
    add(Math.round(value));
    setCustom("");
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
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
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => add(250)} className="rounded-full"><Plus />Copo 250 ml</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => add(500)} className="rounded-full"><Plus />Garrafa 500 ml</Button>
        <div className="flex items-center gap-1">
          <Input
            inputMode="numeric"
            placeholder="ml"
            aria-label="Outra quantidade de água em ml"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            className="h-8 w-20"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addCustom} className="rounded-full">Somar</Button>
        </div>
        {ml > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => add(-250)} className="rounded-full text-muted-foreground"><Minus />250 ml</Button>
        )}
      </div>
    </section>
  );
}
