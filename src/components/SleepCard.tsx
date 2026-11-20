import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { BedDouble, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocal } from "@/lib/store";
import { clock, healthKey, sleepFromTimes, sleepLabel, type HealthMonth } from "@/lib/health";

const hmOf = (iso: string | undefined, fallback: string) => {
  if (!iso) return fallback;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * Hoje: last night's sleep. The band's app may not send it right to Health, so the person types the bedtime and the
 * wake time and the total is worked out here. A typed sleep is kept (the Shortcut never overwrites it) and feeds the
 * readiness, the day close and the AI like any other.
 */
export function SleepCard({ date }: { date: string }) {
  const [month, setMonth, ready] = useLocal<HealthMonth>(healthKey(date), {});
  const day = month[date];
  const [open, setOpen] = useState(false);
  const { hash } = useLocation();
  useEffect(() => { if (hash === "sono") setOpen(true); }, [hash]);

  // The last typed night is the starting point: most nights look alike.
  const lastManual = Object.entries(month).filter(([d, v]) => d < date && v.sleepManual && v.sleepStart).sort().at(-1)?.[1];
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  useEffect(() => {
    if (!open) return;
    setBed(hmOf(day?.sleepStart ?? lastManual?.sleepStart, "23:00"));
    setWake(hmOf(day?.sleepEnd ?? lastManual?.sleepEnd, "07:00"));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  const preview = sleepFromTimes(date, bed, wake);

  const save = () => {
    if (!preview) return;
    setMonth((m) => ({ ...m, [date]: { ...(m[date] ?? { at: 0 }), ...preview, sleepManual: true } }));
    setOpen(false);
    toast.success(`Sono registrado: ${sleepLabel(preview.sleepMin)}`, { description: "Entra na prontidão e na recuperação." });
  };
  const clear = () => {
    setMonth((m) => {
      const { sleepMin: _m, sleepStart: _s, sleepEnd: _e, sleepManual: _x, ...rest } = m[date] ?? { at: 0 };
      return { ...m, [date]: rest };
    });
    setOpen(false);
    toast("Registro de sono apagado");
  };

  const has = day?.sleepMin !== undefined;
  return (
    <>
      <section id="sono" className="scroll-mt-24 flex items-center gap-3 rounded-3xl surface-card py-3 pl-4 pr-2">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--data-protein)_14%,transparent)] text-[var(--data-protein)]">
          <BedDouble className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="type-overline text-muted-foreground">Sono desta noite</p>
          {has ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="type-number text-2xl leading-tight">{sleepLabel(day!.sleepMin!)}</span>
              {day!.sleepStart && day!.sleepEnd && <span className="text-sm text-muted-foreground">{clock(day!.sleepStart)}–{clock(day!.sleepEnd)}</span>}
              <span className="text-xs text-muted-foreground">{day!.sleepManual ? "registrado por você" : "da pulseira"}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Informe a hora em que dormiu e acordou.</p>
          )}
        </div>
        <Button variant={has ? "ghost" : "default"} size={has ? "icon" : "sm"} onClick={() => setOpen(true)}
          aria-label={has ? "Corrigir o sono desta noite" : undefined}>
          {has ? <Pencil /> : "Registrar"}
        </Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <div>
            <DialogTitle>Sono desta noite</DialogTitle>
            <DialogDescription>Use os horários que a pulseira mostra. O total é calculado aqui.</DialogDescription>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Dormi às</span>
              <input type="time" value={bed} onChange={(e) => setBed(e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-card px-3 text-center font-display text-xl font-bold tabular-nums" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Acordei às</span>
              <input type="time" value={wake} onChange={(e) => setWake(e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-card px-3 text-center font-display text-xl font-bold tabular-nums" />
            </label>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-3 text-center" aria-live="polite">
            {preview ? (
              <>
                <p className="type-number text-4xl leading-tight">{sleepLabel(preview.sleepMin)}</p>
                <p className="text-sm text-muted-foreground">de sono{bed > wake ? ", começando na noite anterior" : ""}</p>
              </>
            ) : (
              <p className="text-sm text-danger-text">Confira os horários: o total precisa ficar entre 1 e 16 horas.</p>
            )}
          </div>
          <div className="grid gap-2">
            <Button size="lg" disabled={!preview} onClick={save}>Salvar</Button>
            {day?.sleepManual && <Button variant="ghost" onClick={clear}>Apagar o registro</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
