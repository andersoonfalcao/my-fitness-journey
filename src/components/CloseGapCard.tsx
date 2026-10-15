import { Plus, Utensils } from "lucide-react";
import { closeGap } from "@/lib/close-gap";
import { FAV_MEALS_KEY, type FavItem, type FavMeal } from "@/lib/quick-foods";
import type { Recipe } from "@/lib/recipes";
import { KEYS, useLocal, type FoodEntry, type MealType } from "@/lib/store";

const MEAL_LABEL: Record<MealType, string> = { cafe: "Café", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar", suplementos: "Suplementos" };
const n = (v: number) => Math.round(v).toLocaleString("pt-BR");

/** Alimentação, today only: what is left of protein and calories and three things already eaten that close the gap. */
export function CloseGapCard({ left, history, onAdd }: {
  left: { protein: number; kcal: number };
  history: FoodEntry[];
  onAdd: (meal: MealType, items: FavItem[], what: string) => void;
}) {
  const [favs] = useLocal<FavMeal[]>(FAV_MEALS_KEY, []);
  const [recipes] = useLocal<Recipe[]>(KEYS.recipes, []);
  const gap = closeGap({ left, favs, recipes, history, hour: new Date().getHours() });
  if (!gap) return null;
  const [a, b] = gap.options;

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5" aria-labelledby="fechar-dia-titulo">
      <div className="flex items-center gap-2">
        <Utensils className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <h2 id="fechar-dia-titulo" className="text-xl font-bold">Para fechar o dia</h2>
      </div>
      <p className="text-sm">
        Faltam {gap.protein >= 10 && <><b>{n(gap.protein)} g de proteína</b> e </>}<b>{n(gap.kcal)} kcal</b>.
        {gap.options.length > 1 ? " Jeitos de chegar perto com o que você costuma comer:" : " Com o que você costuma comer:"}
      </p>
      <ul className="space-y-2">
        {gap.options.map((o) => (
          <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{o.name}</span>
              {o.detail !== o.name && <span className="block truncate text-xs text-muted-foreground">{o.detail}</span>}
              <span className="block text-xs tabular-nums text-muted-foreground">{n(o.p)} g proteína · {n(o.kcal)} kcal</span>
            </span>
            <button type="button" onClick={() => onAdd(o.meal, o.items, o.name)} aria-label={`Adicionar ${o.name} ao ${MEAL_LABEL[o.meal].toLowerCase()}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-bold text-primary-foreground">
              <Plus className="h-4 w-4" />{MEAL_LABEL[o.meal]}
            </button>
          </li>
        ))}
      </ul>
      {gap.pair && a && b && (
        <p className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
          <span>Com as duas primeiras</span>
          <span className="tabular-nums"><b className="font-display">{n(gap.pair.p)} g</b> · {n(gap.pair.kcal)} kcal</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">Montado com as suas favoritas, receitas e alimentos mais usados, já contando o que está planejado. Não usa a IA.</p>
    </section>
  );
}
