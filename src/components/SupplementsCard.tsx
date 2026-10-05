import { useState } from "react";
import { Check, CheckCheck, Pencil, Pill, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { foodsKey, uid, useLocal, type FoodEntry } from "@/lib/store";
import { doseLabel, PRESETS, SUPPLEMENTS_KEY, UNITS, type Supplement } from "@/lib/supplements";

const macros = (s: Pick<Supplement, "kcal" | "p" | "c" | "f">) =>
  s.kcal || s.p || s.c || s.f ? `${s.kcal} kcal · P ${s.p} · C ${s.c} · G ${s.f}` : "sem calorias";

const entryOf = (s: Omit<Supplement, "id">, date: string, suppId?: string): FoodEntry => ({
  id: uid(),
  date,
  meal: "suplementos",
  name: s.name,
  grams: s.unit === "g" ? s.amount : 0,
  dose: doseLabel(s),
  kcal: s.kcal,
  p: s.p,
  c: s.c,
  f: s.f,
  suppId,
});

/** Alimentação: the daily supplement routine (tap to mark as taken) and adding any supplement to the day. */
export function SupplementsCard({ date }: { date: string }) {
  const [routine, setRoutine] = useLocal<Supplement[]>(SUPPLEMENTS_KEY, []);
  const [foods, setFoods] = useLocal<FoodEntry[]>(foodsKey(date), []);
  const [editing, setEditing] = useState<Supplement | "new" | null>(null);

  const takenIds = new Set(foods.filter((f) => f.date === date && f.suppId).map((f) => f.suppId));
  const pending = routine.filter((s) => !takenIds.has(s.id));

  const take = (list: Supplement[]) => setFoods((fs) => [...fs, ...list.map((s) => entryOf(s, date, s.id))]);
  const untake = (s: Supplement) => setFoods((fs) => fs.filter((f) => !(f.date === date && f.suppId === s.id)));

  return (
    <section id="suplementos" className="scroll-mt-24 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-accent" />
          <h2 className="font-bold">Suplementos</h2>
        </div>
        {routine.length > 0 && (
          <span className={`text-sm font-semibold ${pending.length ? "text-muted-foreground" : "text-accent"}`}>
            {routine.length - pending.length} de {routine.length} tomados
          </span>
        )}
      </div>

      {routine.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Cadastre os suplementos que você toma todo dia e marque cada um com um toque.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {routine.map((s) => {
            const taken = takenIds.has(s.id);
            return (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <button type="button" onClick={() => (taken ? untake(s) : take([s]))} aria-pressed={taken}
                  aria-label={taken ? `${s.name}: tomado. Toque para desmarcar` : `Marcar ${s.name} como tomado`}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${taken ? "border-accent bg-accent text-accent-foreground" : "border-input"}`}>
                  {taken && <Check className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold leading-tight ${taken ? "text-muted-foreground line-through decoration-1" : ""}`}>{s.name}</div>
                  <div className="text-xs text-muted-foreground">{doseLabel(s)} · {macros(s)}</div>
                </div>
                <button type="button" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {pending.length > 1 && (
          <Button type="button" size="sm" onClick={() => { take(pending); toast.success(`${pending.length} suplementos marcados`); }} className="rounded-full">
            <CheckCheck />Tomar todos
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={() => setEditing("new")} className="rounded-full"><Plus />Adicionar suplemento</Button>
      </div>

      <SupplementDialog
        value={editing}
        onClose={() => setEditing(null)}
        onSave={(s, daily, takeNow) => {
          if (editing && editing !== "new") {
            setRoutine((list) => list.map((x) => (x.id === editing.id ? { ...s, id: editing.id } : x)));
            toast.success("Suplemento atualizado");
          } else if (daily && routine.some((x) => x.name.trim().toLowerCase() === s.name.toLowerCase())) {
            // Already in the routine: no second copy, just mark it if asked.
            const existing = routine.find((x) => x.name.trim().toLowerCase() === s.name.toLowerCase())!;
            if (takeNow && !takenIds.has(existing.id)) take([existing]);
            toast(`${existing.name} já está na sua rotina${takeNow ? "; marcado como tomado" : ""}. Para mudar a dose, toque no lápis.`);
          } else {
            const id = uid();
            if (daily) setRoutine((list) => [...list, { ...s, id }]);
            if (takeNow) setFoods((fs) => [...fs, entryOf(s, date, daily ? id : undefined)]);
            toast.success(daily ? `${s.name} salvo na rotina${takeNow ? " e marcado hoje" : ""}` : `${s.name} adicionado`);
          }
          setEditing(null);
        }}
        onDelete={(s) => {
          setRoutine((list) => list.filter((x) => x.id !== s.id));
          toast.success(`${s.name} saiu da rotina`);
          setEditing(null);
        }}
      />
    </section>
  );
}

type Draft = { name: string; amount: string; unit: string; kcal: string; p: string; c: string; f: string };
const toDraft = (s: Omit<Supplement, "id">): Draft => ({ name: s.name, amount: String(s.amount), unit: s.unit, kcal: String(s.kcal), p: String(s.p), c: String(s.c), f: String(s.f) });
const EMPTY: Draft = { name: "", amount: "1", unit: "dose(s)", kcal: "0", p: "0", c: "0", f: "0" };
const n = (v: string) => Number(v.replace(",", "."));

function SupplementDialog({ value, onClose, onSave, onDelete }: {
  value: Supplement | "new" | null;
  onClose: () => void;
  onSave: (s: Omit<Supplement, "id">, daily: boolean, takeNow: boolean) => void;
  onDelete: (s: Supplement) => void;
}) {
  const editing = value && value !== "new" ? value : null;
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [daily, setDaily] = useState(true);
  const [query, setQuery] = useState("");
  const [lastValue, setLastValue] = useState<typeof value>(null);
  if (value !== lastValue) {
    // Reset the form each time the dialog opens, for a new supplement or the one being edited.
    setLastValue(value);
    setDraft(editing ? toDraft(editing) : EMPTY);
    setDaily(true);
    setQuery("");
  }

  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const presets = PRESETS.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  const submit = (takeNow: boolean) => {
    const s = { name: draft.name.trim(), amount: n(draft.amount), unit: draft.unit, kcal: Math.round(n(draft.kcal)), p: n(draft.p), c: n(draft.c), f: n(draft.f) };
    if (!s.name) { toast.error("Dê um nome ao suplemento."); return; }
    if (!(s.amount > 0)) { toast.error("Informe a quantidade da dose."); return; }
    if ([s.kcal, s.p, s.c, s.f].some((x) => !Number.isFinite(x) || x < 0)) { toast.error("Confira calorias e macros (use 0 quando não tiver)."); return; }
    onSave(s, editing ? true : daily, takeNow);
  };

  const field = (k: keyof Draft, label: string, unit?: string) => (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <Input inputMode="decimal" value={draft[k]} onChange={(e) => set(k, e.target.value)} onFocus={(e) => e.target.select()} className={unit ? "pr-10" : ""} />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{editing ? `Editar ${editing.name}` : "Adicionar suplemento"}</DialogTitle>
          <DialogDescription>Os valores são da dose. Confira no rótulo do seu e ajuste se precisar.</DialogDescription>
        </DialogHeader>

        {!editing && (
          <div>
            <Input placeholder="Buscar: whey, creatina, ômega…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar suplemento" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.name} type="button" onClick={() => setDraft(toDraft(p))}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${draft.name === p.name ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{p.name}</button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Nome</span>
            <Input className="mt-1" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Whey da marca X" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {field("amount", "Dose")}
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Unidade</span>
              <select value={draft.unit} onChange={(e) => set("unit", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {field("kcal", "Calorias", "kcal")}
            {field("p", "Proteína", "g")}
            {field("c", "Carbo", "g")}
            {field("f", "Gordura", "g")}
          </div>
          {!editing && (
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <span>
                <span className="block font-semibold">Tomo todo dia</span>
                <span className="block text-xs text-muted-foreground">Salva na sua rotina para marcar com um toque.</span>
              </span>
              <Switch checked={daily} onCheckedChange={setDaily} />
            </label>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {editing && (
            <Button type="button" variant="ghost" onClick={() => { if (confirm(`Tirar ${editing.name} da rotina? O que já foi registrado continua.`)) onDelete(editing); }} className="mr-auto rounded-full text-destructive"><Trash2 />Tirar da rotina</Button>
          )}
          {editing ? (
            <Button type="button" onClick={() => submit(false)} className="rounded-full">Salvar</Button>
          ) : daily ? (
            <>
              <Button type="button" variant="secondary" onClick={() => submit(false)} className="rounded-full">Só salvar na rotina</Button>
              <Button type="button" onClick={() => submit(true)} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar e marcar hoje</Button>
            </>
          ) : (
            <Button type="button" onClick={() => submit(true)} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">Adicionar hoje</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
