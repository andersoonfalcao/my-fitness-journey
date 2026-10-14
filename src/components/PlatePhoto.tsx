import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { estimatePlate, type EstimatedFood } from "@/lib/ai-food";
import type { FavItem } from "@/lib/quick-foods";

const r1 = (n: number) => Math.round(n * 10) / 10;
const scale = (f: EstimatedFood, grams: number): EstimatedFood => {
  if (!(f.grams > 0)) return f;
  const k = grams / f.grams;
  return { ...f, grams, kcal: Math.round(f.kcal * k), p: r1(f.p * k), c: r1(f.c * k), f: r1(f.f * k), fiber: r1(f.fiber * k) };
};

/**
 * Photo of the plate → the AI lists each food with estimated grams → the person fixes the grams or drops a food →
 * only then it is logged. The original estimate is kept per item so typed grams always scale from it.
 */
export function PlatePhoto({ hint, mealLabel, planning = false, onAdd }: { hint: string; mealLabel: string; planning?: boolean; onAdd: (items: FavItem[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ base: EstimatedFood; grams: string }[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFound(null);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
    try {
      const items = await estimatePlate(file, hint);
      if (!items.length) throw new Error("Não reconheci comida na foto. Tire de cima, com o prato inteiro e boa luz.");
      setFound(items.map((base) => ({ base, grams: String(base.grams) })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler a foto");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const rows = (found ?? []).map((row) => {
    const g = Number(row.grams.replace(",", "."));
    return { ...row, ok: Number.isFinite(g) && g > 0 && g <= 3000, item: scale(row.base, Math.round(g)) };
  });
  const total = rows.filter((r) => r.ok).reduce((s, r) => s + r.item.kcal, 0);
  const valid = rows.length > 0 && rows.every((r) => r.ok);

  return (
    <div className="mt-3">
      <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Foto do prato" onChange={(e) => void pick(e.target.files?.[0])} />
      {!found && (
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-accent px-5 py-2.5 font-bold text-foreground disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-accent" />}
          {busy ? "Lendo a foto…" : "Foto do prato"}
        </button>
      )}
      {found && (
        <div className="rounded-2xl bg-muted p-3">
          <div className="flex items-start gap-3">
            {preview && <img src={preview} alt="Foto do prato enviada" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="font-bold">A IA encontrou {found.length} {found.length === 1 ? "alimento" : "alimentos"}</p>
              <p className="text-xs text-muted-foreground">Confira as gramas e tire o que não estiver no prato. Nada foi registrado ainda.</p>
            </div>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {rows.map((r, k) => (
              <li key={k} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-tight">{r.base.name}</div>
                  {r.ok ? (
                    <div className="text-xs tabular-nums text-muted-foreground">
                      <b className="block text-foreground">{r.item.kcal} kcal</b>
                      <span className="whitespace-nowrap">P {Math.round(r.item.p)} · C {Math.round(r.item.c)} · G {Math.round(r.item.f)}</span>
                    </div>
                  ) : <div className="text-xs text-destructive">gramas inválidas</div>}
                </div>
                <div className="relative w-24 shrink-0">
                  <input inputMode="decimal" value={r.grams} aria-label={`Gramas de ${r.base.name}`} onFocus={(e) => e.target.select()}
                    onChange={(e) => setFound((list) => list && list.map((x, j) => (j === k ? { ...x, grams: e.target.value } : x)))}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 pr-7 text-base" />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
                </div>
                <button type="button" aria-label={`Tirar ${r.base.name}`} onClick={() => setFound((list) => list && list.filter((_, j) => j !== k))}
                  className="grid h-11 w-9 shrink-0 place-items-center text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-col gap-2">
            <button type="button" disabled={!valid} onClick={() => {
              onAdd(rows.map((r) => ({ name: r.item.name, grams: r.item.grams, kcal: r.item.kcal, p: r.item.p, c: r.item.c, f: r.item.f, fiber: r.item.fiber })));
              setFound(null);
            }} className="min-h-11 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground disabled:opacity-50">
              {rows.length === 0 ? "Nenhum alimento" : `${planning ? `Planejar ${rows.length} para o` : `Adicionar ${rows.length} ao`} ${mealLabel.toLowerCase()} · ${total} kcal`}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => input.current?.click()} className="min-h-11 rounded-full border border-input bg-card px-3 text-sm font-semibold">Outra foto</button>
              <button type="button" onClick={() => setFound(null)} className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted-foreground">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
