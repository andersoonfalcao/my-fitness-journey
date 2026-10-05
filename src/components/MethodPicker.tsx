import { Check } from "lucide-react";
import { METHOD_LIST, METHODS, methodFits, recommendMethod, type MethodId } from "@/lib/methods";
import type { Profile } from "@/lib/store";

/**
 * Training method choice. `value` undefined means "follow the recommendation", so the method keeps up with
 * changes to goal, level or days; picking the recommended one goes back to that.
 */
export function MethodPicker({ profile, value, onChange }: { profile: Pick<Profile, "focus" | "level" | "days">; value: MethodId | undefined; onChange: (method: MethodId | undefined) => void }) {
  const rec = recommendMethod(profile);
  const chosen = value && methodFits(METHODS[value], profile.days) ? value : rec.id;
  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm">
        Método que será usado: <b>{METHODS[chosen].name}</b>
        {chosen === rec.id ? <> · recomendado. {rec.reason}</> : <> · escolhido por você (o recomendado seria {METHODS[rec.id].name}).</>}
      </p>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Método de treino">
        {METHOD_LIST.map((m) => {
          const fits = methodFits(m, profile.days);
          const selected = m.id === chosen;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={selected} disabled={!fits}
              onClick={() => onChange(m.id === rec.id ? undefined : m.id)}
              className={`rounded-2xl border-2 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-accent"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{m.name}</span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : m.id === rec.id && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">recomendado</span>}
              </div>
              {selected && m.id === rec.id && <span className="mt-1 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">recomendado</span>}
              <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
              {!fits && <p className="mt-1 text-xs font-semibold">De {m.minDays} a {m.maxDays} dias por semana.</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
