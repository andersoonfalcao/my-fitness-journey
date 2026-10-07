import { Link } from "@tanstack/react-router";
import { Gauge, X } from "lucide-react";
import { toast } from "sonner";
import { KEYS, today, useLocal, type Profile } from "@/lib/store";
import { MIN_COMPLETE_DAYS, MIN_WEIGH_INS, MIN_WEIGHT_SPAN, useCalibration } from "@/lib/calibration";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Perfil: the energy measured from the logs, with the choice to use it for the targets (or go back to the formula). */
export function CalibrationCard({ profile }: { profile: Profile }) {
  const [, setProfile] = useLocal<Profile | null>(KEYS.profile, null);
  const c = useCalibration(profile);
  if (!c) return null;
  const { result, inUse, suggest } = c;
  const calibrated = profile.calibratedTdee;

  const apply = (kcal: number) => {
    setProfile((p) => (p ? { ...p, calibratedTdee: { kcal, date: today() } } : p));
    toast.success("Metas recalculadas com o seu gasto medido.");
  };
  const reset = () => {
    if (!confirm("Voltar a calcular o gasto pela fórmula e pelo nível de atividade do perfil?")) return;
    setProfile((p) => (p ? { ...p, calibratedTdee: undefined } : p));
  };

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Gauge className="h-4 w-4 shrink-0 text-accent" aria-hidden />Gasto calibrado
      </div>
      {result.ready ? (
        <>
          <p className="text-sm">
            De {short(result.from)} a {short(result.to)}: média de <b>{fmt(result.avgKcal)} kcal</b> em {result.completeDays} dias completos e peso
            {" "}{result.kgPerWeek === 0 ? "estável" : <>{result.kgPerWeek < 0 ? "caindo" : "subindo"} <b>{fmt(Math.abs(result.kgPerWeek))} kg por semana</b></>}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-muted/60 px-3 py-2">
              <div className="whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{fmt(result.tdee)} <span className="text-sm">kcal</span></div>
              <div className="text-xs text-muted-foreground">medido, por dia</div>
            </div>
            <div className="rounded-2xl bg-muted/60 px-3 py-2">
              <div className="whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{fmt(inUse)} <span className="text-sm">kcal</span></div>
              <div className="text-xs text-muted-foreground">{calibrated ? "em uso: calibrado" : "em uso: estimativa"}</div>
            </div>
          </div>
          {suggest ? (
            <button type="button" onClick={() => apply(result.tdee)} className="min-h-11 w-full rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">
              Usar {fmt(result.tdee)} kcal/dia nas metas
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">O gasto em uso está dentro de 5% do medido; não precisa mudar.</p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm">Com 4 semanas de registros, o app mede o seu gasto real e ajusta a meta de calorias. Falta pouco:</p>
          <ul className="space-y-1 text-sm">
            <Need done={result.completeDays} need={MIN_COMPLETE_DAYS} label="dias com 3 ou 4 refeições registradas" />
            <Need done={result.weighIns} need={MIN_WEIGH_INS} label="pesagens" />
            <Need done={Math.min(result.weightSpan, MIN_WEIGHT_SPAN)} need={MIN_WEIGHT_SPAN} label="dias entre a primeira e a última pesagem" />
          </ul>
        </>
      )}
      {calibrated && (
        <button type="button" onClick={reset} className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline">
          Voltar à estimativa pela fórmula
        </button>
      )}
    </section>
  );
}

function Need({ done, need, label }: { done: number; need: number; label: string }) {
  const ok = done >= need;
  return (
    <li className="flex items-center gap-2">
      <span className={`w-12 shrink-0 text-right font-display font-bold tabular-nums ${ok ? "text-[#3f9d6b]" : ""}`}>{Math.min(done, need)}/{need}</span>
      <span className="text-muted-foreground">{label}</span>
    </li>
  );
}

/** Hoje: a short notice when a new measurement is ready to be used (until accepted or dismissed). */
export function CalibrationNotice({ profile }: { profile: Profile }) {
  const c = useCalibration(profile);
  if (!c || !c.result.ready || !c.suggest || c.dismissed) return null;
  return (
    <section className="flex items-start gap-3 rounded-3xl border-2 border-accent bg-accent/10 p-4">
      <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
      <Link to="/perfil" className="min-w-0 flex-1 text-sm">
        <b>Seu gasto real parece {fmt(c.result.tdee)} kcal/dia</b>, não {fmt(c.inUse)}. Toque para ver e ajustar a meta no Perfil.
      </Link>
      <button type="button" onClick={c.dismiss} aria-label="Dispensar" className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground">
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
