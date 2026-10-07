import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { KEYS, today, useLocal, type MeasureEntry, type Profile } from "@/lib/store";

type Key = Exclude<keyof MeasureEntry, "date">;

/** Tape measurements in cm; waist and abdomen going down is the good direction, the rest is neutral. */
const GROUPS: { title: string; fields: { key: Key; label: string; placeholder: string; lowerIsBetter?: boolean }[] }[] = [
  { title: "Tronco", fields: [
    { key: "neck", label: "Pescoço", placeholder: "39" },
    { key: "shoulders", label: "Ombros", placeholder: "118" },
    { key: "chest", label: "Peitoral", placeholder: "102" },
    { key: "waist", label: "Cintura", placeholder: "88", lowerIsBetter: true },
    { key: "abdomen", label: "Abdômen", placeholder: "92", lowerIsBetter: true },
    { key: "hips", label: "Quadril", placeholder: "100" },
  ] },
  { title: "Braços", fields: [
    { key: "armR", label: "Braço direito", placeholder: "35,5" },
    { key: "armL", label: "Braço esquerdo", placeholder: "35" },
    { key: "forearmR", label: "Antebraço direito", placeholder: "29" },
    { key: "forearmL", label: "Antebraço esquerdo", placeholder: "28,5" },
  ] },
  { title: "Pernas", fields: [
    { key: "thighR", label: "Coxa direita", placeholder: "58" },
    { key: "thighL", label: "Coxa esquerda", placeholder: "57,5" },
    { key: "calfR", label: "Panturrilha direita", placeholder: "38" },
    { key: "calfL", label: "Panturrilha esquerda", placeholder: "38" },
  ] },
];
const FIELDS = GROUPS.flatMap((g) => g.fields);

const num = (v: number, digits = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const parse = (s: string) => {
  const v = Number(s.replace(",", "."));
  return s.trim() && Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : undefined;
};
const dateBR = (d: string) => new Date(d + "T12:00").toLocaleDateString("pt-BR");

/**
 * Corpo → Medidas. "registrar" is the form (a date already saved opens filled for corrections); "evolucao" shows
 * the change since the first record, the waist-to-hip ratio and the history.
 */
export function BodyMeasures({ profile, part }: { profile: Profile; part: "registrar" | "evolucao" }) {
  const [list, setList] = useLocal<MeasureEntry[]>(KEYS.measures, []);
  const [date, setDate] = useState(today());
  const [form, setForm] = useState<Record<string, string>>({});

  const records = [...list].sort((a, b) => a.date.localeCompare(b.date));
  const latest = records.at(-1);
  const firstRecord = records[0];

  // Picking a date already saved fills the form with it, so a correction doesn't start blank.
  const pickDate = (d: string) => {
    setDate(d);
    const saved = list.find((m) => m.date === d);
    setForm(saved ? Object.fromEntries(FIELDS.flatMap((f) => (saved[f.key] !== undefined ? [[f.key, num(saved[f.key]!)]] : []))) : {});
  };

  const save = () => {
    const entry: MeasureEntry = { date };
    for (const f of FIELDS) {
      const v = parse(form[f.key] ?? "");
      if (v !== undefined) entry[f.key] = v;
    }
    if (Object.keys(entry).length === 1) {
      toast.error("Preencha pelo menos uma medida");
      return;
    }
    setList((l) => [...l.filter((m) => m.date !== date), entry]);
    setForm({});
    toast.success("Medidas registradas");
  };

  // WHO waist-to-hip ratio: above 0,90 (men) or 0,85 (women) means higher cardiometabolic risk.
  const ratio = latest?.waist && latest.hips ? latest.waist / latest.hips : null;
  const ratioLimit = profile.sex === "m" ? 0.9 : 0.85;
  const ratioText = ratioLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <section id="medidas" className="scroll-mt-24 space-y-5 rounded-3xl border border-border bg-card p-6">
      <div>
        <h2 className={part === "registrar" ? "text-xl font-bold" : "text-2xl font-bold"}>Medidas</h2>
        {part === "registrar" ? (
          <p className="text-sm text-muted-foreground">
            Com fita métrica, em centímetros. Meça sempre no mesmo horário, de preferência em jejum. Preencha só o que medir.
            {latest && <> Última medição em {dateBR(latest.date)}.</>}
          </p>
        ) : !latest && <p className="text-sm text-muted-foreground">Nenhuma medida ainda. Registre na aba Registrar.</p>}
      </div>

      {part === "evolucao" && latest && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Última medição · {dateBR(latest.date)}
            {firstRecord && firstRecord !== latest && ` · comparada a ${dateBR(firstRecord.date)}`}
          </div>
          {ratio !== null && (
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
              Relação cintura/quadril: <b className="tabular-nums">{ratio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              <span className={ratio > ratioLimit ? "text-destructive" : "text-[#3f9d6b]"}>
                {" "}· {ratio > ratioLimit ? `acima de ${ratioText} (risco aumentado, OMS)` : `até ${ratioText} (adequada, OMS)`}
              </span>
            </div>
          )}
          {GROUPS.map((g) => {
            const shown = g.fields.filter((f) => latest[f.key] !== undefined);
            if (!shown.length) return null;
            return (
              <div key={g.title}>
                <div className="mb-1.5 text-sm font-bold">{g.title}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {shown.map((f) => {
                    const now = latest[f.key]!;
                    const before = firstRecord !== latest ? firstRecord?.[f.key] : undefined;
                    const diff = before !== undefined ? Math.round((now - before) * 10) / 10 : null;
                    const good = !diff || f.lowerIsBetter === undefined ? null : (diff < 0) === f.lowerIsBetter;
                    return (
                      <div key={f.key} className="rounded-2xl bg-muted/60 px-3 py-2">
                        <div className="font-display text-lg font-bold leading-tight tabular-nums">{num(now)} <span className="text-sm">cm</span></div>
                        <div className="text-xs text-muted-foreground">
                          {f.label}
                          {!!diff && <b className={good === null ? "" : good ? "text-[#3f9d6b]" : "text-destructive"}> · {diff > 0 ? "+" : ""}{num(diff)}</b>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {part === "registrar" && (
      <div>
        <label className="block text-sm font-semibold">
          Data
          <input type="date" value={date} onChange={(e) => pickDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-input bg-card px-3 py-2.5 font-normal sm:w-auto" />
        </label>
        {GROUPS.map((g) => (
          <fieldset key={g.title} className="mt-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.title}</legend>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {g.fields.map((f) => (
                <label key={f.key} className="flex flex-col justify-between text-sm font-semibold">
                  {f.label}
                  <span className="mt-1 flex items-center rounded-xl border border-input bg-card pr-3">
                    <input inputMode="decimal" placeholder={f.placeholder} value={form[f.key] ?? ""} onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                      aria-label={`${f.label} em cm`} className="w-full min-w-0 bg-transparent px-3 py-2.5 font-normal outline-none" />
                    <span className="text-sm font-normal text-muted-foreground">cm</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button onClick={save} className="mt-4 rounded-full bg-accent px-6 py-2.5 font-bold text-accent-foreground">Salvar medidas</button>
      </div>
      )}

      {part === "evolucao" && records.length > 0 && (
        <ul className="divide-y divide-border">
          {[...records].reverse().map((r) => (
            <li key={r.date} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold">{dateBR(r.date)}</span>
                <span className="block text-muted-foreground">
                  {FIELDS.filter((f) => r[f.key] !== undefined).map((f) => `${f.label.toLowerCase()} ${num(r[f.key]!)}`).join(" · ")} (cm)
                </span>
              </span>
              <button aria-label="Excluir medidas" onClick={() => { if (confirm("Excluir estas medidas?")) setList((l) => l.filter((x) => x.date !== r.date)); }}
                className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
