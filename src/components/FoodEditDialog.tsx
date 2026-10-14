import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FoodEntry, MealType } from "@/lib/store";

const MEALS: { v: Exclude<MealType, "suplementos">; t: string }[] = [
  { v: "cafe", t: "Café da manhã" },
  { v: "almoco", t: "Almoço" },
  { v: "lanche", t: "Lanche" },
  { v: "jantar", t: "Jantar" },
];
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The entry with a new amount: calories, macros and fibre scale with the grams. */
export function rescale(f: FoodEntry, grams: number): FoodEntry {
  if (!(f.grams > 0) || grams === f.grams) return f;
  const k = grams / f.grams;
  return { ...f, grams, kcal: Math.round(f.kcal * k), p: r1(f.p * k), c: r1(f.c * k), f: r1(f.f * k), ...(f.fiber !== undefined ? { fiber: r1(f.fiber * k) } : {}) };
}

/**
 * Changes a logged (or planned) food: its amount and its meal, or removes it. Supplements keep their dose, so only
 * removing applies to them.
 */
export function FoodEditDialog({ entry, onSave, onDelete, onClose }: {
  entry: FoodEntry | null; onSave: (next: FoodEntry) => void; onDelete: (entry: FoodEntry) => void; onClose: () => void;
}) {
  const [grams, setGrams] = useState("");
  const [meal, setMeal] = useState<MealType>("almoco");
  useEffect(() => {
    if (entry) { setGrams(String(entry.grams)); setMeal(entry.meal); }
  }, [entry]);
  if (!entry) return <Dialog open={false} />;
  const supplement = entry.meal === "suplementos" || !(entry.grams > 0);
  const g = Number(grams.replace(",", "."));
  const valid = supplement || (Number.isFinite(g) && g > 0 && g <= 5000);
  const preview = valid && !supplement ? rescale(entry, Math.round(g)) : entry;
  const save = () => {
    if (!valid) return;
    onSave({ ...preview, meal });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader><DialogTitle className="pr-6 font-display text-xl leading-tight">{entry.name}</DialogTitle></DialogHeader>
        {supplement ? (
          <p className="text-sm text-muted-foreground">Dose: {entry.dose ?? `${entry.grams} g`}. Para mudar a dose, ajuste a rotina de suplementos.</p>
        ) : (
          <>
            <div>
              <label htmlFor="editar-gramas" className="text-sm font-bold">Quantidade</label>
              <div className="relative mt-1">
                <input id="editar-gramas" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-10 text-base" />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
              </div>
              <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                {valid ? <><b className="text-foreground">{preview.kcal} kcal</b> · P {preview.p} · C {preview.c} · G {preview.f}</> : "Digite uma quantidade em gramas."}
              </p>
            </div>
            <fieldset>
              <legend className="text-sm font-bold">Refeição</legend>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {MEALS.map((m) => (
                  <button key={m.v} type="button" onClick={() => setMeal(m.v)} aria-pressed={meal === m.v}
                    className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${meal === m.v ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{m.t}</button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <div className="flex flex-col gap-2">
          {!supplement && <Button type="button" disabled={!valid} onClick={save} className="min-h-11 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar</Button>}
          <Button type="button" variant="secondary" onClick={() => { onDelete(entry); onClose(); }} className="min-h-11 rounded-full text-destructive">
            <Trash2 />Apagar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
