import { Check, Target } from "lucide-react";
import { compositionFrom, roundKg, targets, type BodyEntry, type Profile } from "@/lib/store";

const date = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

/**
 * Offers to base the daily goals on a bioimpedance: the current goals next to the ones this reading gives
 * (basal energy and protein from the lean mass, weight from the scale). Nothing changes until it is approved.
 */
export function CompositionTargets({ entry, profile, onApply }: { entry: BodyEntry; profile: Profile; onApply: (next: Profile) => void }) {
  const composition = compositionFrom(entry, profile.weight);
  if (!composition) return null;
  const inUse = profile.composition?.date === entry.date && profile.composition.leanKg === composition.leanKg;
  const next: Profile = { ...profile, weight: entry.weightKg ? roundKg(entry.weightKg) : profile.weight, composition };

  if (inUse) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border p-3 text-sm">
        <span className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-[#3f9d6b]" aria-hidden />Seus objetivos diários já usam esta medição.</span>
        <button type="button" onClick={() => onApply({ ...profile, composition: undefined })} className="min-h-11 font-semibold underline underline-offset-4">
          Voltar ao cálculo só pelo peso
        </button>
      </div>
    );
  }

  const now = targets(profile);
  const after = targets(next);
  const rows = [
    ["Calorias", now.weekKcal, after.weekKcal, "kcal"],
    ["Proteína", now.protein, after.protein, "g"],
    ["Carboidratos", now.carbs, after.carbs, "g"],
    ["Gorduras", now.fat, after.fat, "g"],
  ] as const;
  return (
    <div className="space-y-3 rounded-2xl border-2 border-accent p-4">
      <div className="flex items-center gap-2 font-bold"><Target className="h-4 w-4 shrink-0 text-accent" aria-hidden />Usar esta medição nos objetivos diários</div>
      <p className="text-sm text-muted-foreground">
        Com {composition.leanKg.toLocaleString("pt-BR")} kg de massa magra ({composition.fatPct.toLocaleString("pt-BR")}% de gordura), o gasto em repouso
        e a proteína passam a ser calculados pela massa magra, que é o que realmente gasta energia e precisa de proteína.
        {profile.composition && <> Hoje eles usam a medição de {date(profile.composition.date)}.</>}
      </p>
      <table className="w-full text-sm tabular-nums">
        <thead><tr className="text-left text-xs text-muted-foreground"><th className="font-semibold">Meta diária</th><th className="pl-3 text-right font-semibold">Agora</th><th className="pl-3 text-right font-semibold">Nova</th></tr></thead>
        <tbody>
          {rows.map(([label, a, b, unit]) => (
            <tr key={label} className="border-t border-border">
              <td className="py-1.5">{label}</td>
              <td className="whitespace-nowrap py-1.5 pl-3 text-right">{a.toLocaleString("pt-BR")} {unit}</td>
              <td className={`whitespace-nowrap py-1.5 pl-3 text-right font-bold ${b === a ? "" : "text-accent"}`}>{b.toLocaleString("pt-BR")} {unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {next.weight !== profile.weight && <p className="text-xs text-muted-foreground">O peso das metas também passa a ser o da balança: {next.weight.toLocaleString("pt-BR")} kg.</p>}
      <button type="button" onClick={() => onApply(next)} className="min-h-11 w-full rounded-full bg-accent px-5 font-bold text-accent-foreground sm:w-auto">Usar nos meus objetivos</button>
    </div>
  );
}
