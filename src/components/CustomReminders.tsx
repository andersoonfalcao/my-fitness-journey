import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { uid } from "@/lib/store";
import { EVERY_DAY, MAX_REMINDERS, type CustomReminder, type Settings } from "@/lib/push";

// Shown Monday first; values are JavaScript weekdays (0 = Sunday).
const WEEK: [number, string][] = [[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [0, "Dom"]];

function daysLabel(days: number[]) {
  const set = new Set(days);
  if (set.size === 7) return "Todo dia";
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Seg a sex";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Fim de semana";
  return WEEK.filter(([d]) => set.has(d)).map(([, l]) => l).join(", ");
}

/** Configurações → Ajustes: reminders the person writes, each with its own time and weekdays (sent by the Worker). */
export function CustomReminders({ list, onChange, subscribed }: { list: CustomReminder[]; onChange: (next: CustomReminder[]) => void; subscribed: boolean }) {
  const [editing, setEditing] = useState<CustomReminder | null>(null);
  const isNew = editing !== null && !list.some((r) => r.id === editing.id);

  const save = () => {
    if (!editing) return;
    const clean = { ...editing, title: editing.title.trim().slice(0, 60), body: editing.body.trim().slice(0, 140) };
    onChange(isNew ? [...list, clean] : list.map((r) => (r.id === clean.id ? clean : r)));
    setEditing(null);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold">Lembretes personalizados</h3>
        <p className="text-xs text-muted-foreground">
          Crie avisos com o seu texto, no horário e nos dias que quiser.{!subscribed && " Para recebê-los, ative as notificações acima."}
        </p>
      </div>

      {list.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl bg-muted/60">
          {list.map((r) => (
            <li key={r.id}>
              {editing?.id === r.id ? (
                <Editor value={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)}
                  onDelete={() => { if (confirm(`Apagar o lembrete “${r.title}”?`)) { onChange(list.filter((x) => x.id !== r.id)); setEditing(null); } }} />
              ) : (
                <div className={`flex min-h-16 items-center gap-3 px-4 py-3 ${r.on ? "" : "opacity-60"}`}>
                  <button type="button" onClick={() => setEditing(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Editar ${r.title}`}>
                    <span className="w-14 shrink-0 font-display text-lg font-extrabold tabular-nums">{r.time}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{r.title}</span>
                      <span className="block text-xs text-muted-foreground">{daysLabel(r.days)}</span>
                    </span>
                  </button>
                  <Switch checked={r.on} onCheckedChange={(on) => onChange(list.map((x) => (x.id === r.id ? { ...x, on } : x)))} aria-label={`${r.title}: ${r.on ? "ligado" : "desligado"}`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isNew && (
        <div className="rounded-2xl bg-muted/60">
          <Editor value={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}

      {!editing && (
        <Button type="button" variant="outline" disabled={list.length >= MAX_REMINDERS} className="min-h-11 w-full rounded-full"
          onClick={() => setEditing({ id: uid(), title: "", body: "", time: "08:00", days: EVERY_DAY, on: true })}>
          <Plus />{list.length >= MAX_REMINDERS ? `Limite de ${MAX_REMINDERS} lembretes` : "Novo lembrete"}
        </Button>
      )}
    </div>
  );
}

function Editor({ value, onChange, onSave, onCancel, onDelete }: {
  value: CustomReminder; onChange: (r: CustomReminder) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  const set = (patch: Partial<CustomReminder>) => onChange({ ...value, ...patch });
  const toggleDay = (d: number) => set({ days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d].sort() });
  const valid = value.title.trim().length > 0 && value.days.length > 0;
  return (
    <div className="space-y-3 px-4 py-4">
      <label className="block">
        <span className="text-sm font-semibold">Título</span>
        <input value={value.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Tomar creatina"
          className="mt-1 block w-full rounded-xl border border-input bg-card px-3 py-2.5" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Mensagem <span className="font-normal text-muted-foreground">(opcional)</span></span>
        <input value={value.body} maxLength={140} onChange={(e) => set({ body: e.target.value })} placeholder="Ex.: 5 g com água"
          className="mt-1 block w-full rounded-xl border border-input bg-card px-3 py-2.5" />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">Horário</span>
        <input type="time" step={300} value={value.time} onChange={(e) => e.target.value && set({ time: e.target.value })}
          className="w-32 rounded-xl border border-input bg-card px-3 py-2 text-center" />
      </label>
      <div>
        <span className="text-sm font-semibold">Dias</span>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {WEEK.map(([d, label]) => (
            <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={value.days.includes(d)}
              className={`min-h-11 rounded-xl border text-xs font-bold ${value.days.includes(d) ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
        {value.days.length === 0 && <p className="mt-1 text-xs text-destructive">Escolha pelo menos um dia.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="button" disabled={!valid} onClick={onSave} className="min-h-11 flex-1 rounded-full"><Bell />Salvar</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="min-h-11 rounded-full">Cancelar</Button>
        {onDelete && (
          <Button type="button" variant="ghost" onClick={onDelete} className="min-h-11 rounded-full text-destructive" aria-label="Apagar lembrete"><Trash2 /></Button>
        )}
      </div>
    </div>
  );
}
