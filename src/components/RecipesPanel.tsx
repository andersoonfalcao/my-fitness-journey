import { useState } from "react";
import { ArrowLeft, ChefHat, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { KEYS, uid, useLocal } from "@/lib/store";
import { searchFoods, type Food } from "@/lib/foods";
import type { FavItem } from "@/lib/quick-foods";
import { portionGrams, recipePortion, recipeTotals, type Recipe } from "@/lib/recipes";

const r1 = (n: number) => Math.round(n * 10) / 10;
const ofFood = (f: Food, grams: number): FavItem => {
  const k = grams / 100;
  return { name: f.name, grams, kcal: Math.round(f.kcal * k), p: r1(f.p * k), c: r1(f.c * k), f: r1(f.f * k), ...(f.fiber !== undefined ? { fiber: r1(f.fiber * k) } : {}) };
};

type Draft = { id: string | null; name: string; items: FavItem[]; cooked: string; portions: string };

/**
 * Home recipes: build one from the ingredients as weighed raw, say what the cooked pot weighs and how many portions
 * it gives, then log a portion (or any grams) of it. Recipes stay saved for next time.
 */
export function RecipesPanel({ mealLabel, planning = false, onAdd }: { mealLabel: string; planning?: boolean; onAdd: (item: FavItem) => void }) {
  const [recipes, setRecipes] = useLocal<Recipe[]>(KEYS.recipes, []);
  const [chosen, setChosen] = useState<Recipe | null>(null);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<"porcao" | "g">("porcao");
  const [draft, setDraft] = useState<Draft | null>(null);

  if (draft) return <RecipeEditor draft={draft} onChange={setDraft} onCancel={() => setDraft(null)} onSave={(r) => {
    setRecipes((list) => (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r]));
    toast.success(`Receita “${r.name}” salva`);
    setDraft(null);
    setChosen(r);
    setAmount("1"); setUnit("porcao");
  }} />;

  if (chosen) {
    const n = Number(amount.replace(",", "."));
    const grams = unit === "porcao" ? n * portionGrams(chosen) : n;
    const ok = Number.isFinite(n) && n > 0 && grams <= 5000;
    const item = ok ? recipePortion(chosen, grams) : null;
    return (
      <div className="mt-4 rounded-2xl bg-muted p-4">
        <button type="button" onClick={() => setChosen(null)} className="-mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />Receitas</button>
        <div className="font-display text-lg font-bold leading-tight">{chosen.name}</div>
        <div className="text-xs text-muted-foreground">Rende {chosen.cookedGrams} g pronta · {chosen.portions} {chosen.portions === 1 ? "porção" : "porções"} de {portionGrams(chosen)} g</div>
        <div className="mt-3 flex items-center gap-2">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onFocus={(e) => e.target.select()} aria-label="Quantidade"
            className="w-24 rounded-xl border border-input bg-card px-3 py-2 text-base" />
          <div className="grid flex-1 grid-cols-2 gap-1 rounded-full bg-card p-1">
            {(["porcao", "g"] as const).map((u) => (
              <button key={u} type="button" aria-pressed={unit === u} onClick={() => { setUnit(u); setAmount(u === "g" ? String(portionGrams(chosen)) : "1"); }}
                className={`min-h-9 rounded-full text-sm font-bold ${unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{u === "porcao" ? "porções" : "gramas"}</button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm tabular-nums text-muted-foreground">{item ? <><b className="text-foreground">{item.kcal} kcal</b> · {item.grams} g · P {item.p} · C {item.c} · G {item.f}</> : "Digite uma quantidade."}</p>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" disabled={!item} onClick={() => item && onAdd(item)} className="min-h-11 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground disabled:opacity-50">{planning ? "Planejar para o" : "Adicionar ao"} {mealLabel.toLowerCase()}</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDraft({ id: chosen.id, name: chosen.name, items: chosen.items, cooked: String(chosen.cookedGrams), portions: String(chosen.portions) })}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-input bg-card text-sm font-semibold"><Pencil className="h-4 w-4" />Editar</button>
            <button type="button" onClick={() => {
              if (!confirm(`Apagar a receita “${chosen.name}”? O que já foi registrado continua.`)) return;
              setRecipes((list) => list.filter((x) => x.id !== chosen.id));
              setChosen(null);
            }} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" />Apagar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {recipes.length === 0 ? (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          Monte uma receita feita em casa (lasanha, bolo, marmita da semana) com os ingredientes e o peso da panela pronta. Depois é só registrar a porção que comeu.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {recipes.map((r) => {
            const portion = recipePortion(r, portionGrams(r));
            return (
              <li key={r.id}>
                <button type="button" onClick={() => { setChosen(r); setAmount("1"); setUnit("porcao"); }} className="flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left hover:text-accent">
                  <ChefHat className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">{r.items.length} ingredientes · porção de {portionGrams(r)} g</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{portion.kcal} kcal</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => setDraft({ id: null, name: "", items: [], cooked: "", portions: "4" })}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border px-4 py-3 text-sm font-bold text-muted-foreground hover:border-accent hover:text-foreground">
        <Plus className="h-5 w-5" />Nova receita
      </button>
    </div>
  );
}

function RecipeEditor({ draft, onChange, onCancel, onSave }: { draft: Draft; onChange: (d: Draft) => void; onCancel: () => void; onSave: (r: Recipe) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const total = recipeTotals(draft.items);
  const cooked = Number(draft.cooked.replace(",", ".")) || 0;
  const portions = Math.round(Number(draft.portions) || 0);
  const cookedGrams = cooked > 0 ? Math.round(cooked) : Math.round(total.grams);
  const problem = !draft.name.trim() ? "Dê um nome à receita." : draft.items.length === 0 ? "Inclua pelo menos um ingrediente." : portions < 1 || portions > 100 ? "Diga quantas porções a receita rende." : cookedGrams <= 0 ? "Diga o peso da receita pronta." : null;
  const g = Number(grams.replace(",", "."));

  return (
    <div className="mt-4 space-y-4 rounded-2xl bg-muted p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">{draft.id ? "Editar receita" : "Nova receita"}</h3>
        <button type="button" onClick={onCancel} className="min-h-11 px-1 text-sm font-semibold text-muted-foreground">Cancelar</button>
      </div>
      <div>
        <label htmlFor="receita-nome" className="text-sm font-bold">Nome</label>
        <input id="receita-nome" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value.slice(0, 50) })} placeholder="Ex: Lasanha de frango"
          className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-base" />
      </div>

      <div>
        <div className="text-sm font-bold">Ingredientes <span className="font-normal text-muted-foreground">(peso cru, como foi para a panela)</span></div>
        {draft.items.length > 0 && (
          <ul className="mt-1 divide-y divide-border rounded-xl bg-card px-3">
            {draft.items.map((it, k) => (
              <li key={k} className="flex items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1"><span className="block font-semibold leading-tight">{it.name}</span><span className="text-xs tabular-nums text-muted-foreground">{it.grams} g · {it.kcal} kcal</span></span>
                <button type="button" aria-label={`Tirar ${it.name}`} onClick={() => onChange({ ...draft, items: draft.items.filter((_, j) => j !== k) })}
                  className="grid h-11 w-9 shrink-0 place-items-center text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {sel ? (
          <div className="mt-2 rounded-xl bg-card p-3">
            <div className="font-semibold">{sel.name}</div>
            <div className="mt-2 flex items-center gap-2">
              <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} onFocus={(e) => e.target.select()} aria-label="Gramas do ingrediente"
                className="w-24 rounded-xl border border-input bg-background px-3 py-2 text-base" />
              <span className="text-sm">gramas</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" disabled={!(g > 0)} onClick={() => { onChange({ ...draft, items: [...draft.items, ofFood(sel, Math.round(g))] }); setSel(null); setQ(""); }}
                className="min-h-11 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">Incluir</button>
              <button type="button" onClick={() => setSel(null)} className="min-h-11 rounded-full text-sm font-semibold text-muted-foreground">Voltar</button>
            </div>
          </div>
        ) : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ingrediente: arroz, frango, queijo…" aria-label="Buscar ingrediente"
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-base" />
            {q.trim() && (
              <ul className="mt-1 max-h-56 divide-y divide-border overflow-y-auto rounded-xl bg-card px-3">
                {searchFoods(q).slice(0, 12).map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => { setSel(f); setGrams(String(f.unit?.g ?? 100)); }} className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm">
                      <span className="min-w-0 font-semibold">{f.name}</span><span className="shrink-0 text-xs text-muted-foreground">{f.kcal} kcal/100 g</span>
                    </button>
                  </li>
                ))}
                {searchFoods(q).length === 0 && <li className="py-3 text-sm text-muted-foreground">Nada encontrado.</li>}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col justify-between">
          <label htmlFor="receita-pronta" className="text-sm font-bold">Peso pronta</label>
          <div className="relative mt-1">
            <input id="receita-pronta" inputMode="decimal" value={draft.cooked} onChange={(e) => onChange({ ...draft, cooked: e.target.value })} placeholder={String(Math.round(total.grams) || "")}
              className="w-full rounded-xl border border-input bg-card px-3 py-2 pr-7 text-base" />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <label htmlFor="receita-porcoes" className="text-sm font-bold">Porções</label>
          <input id="receita-porcoes" inputMode="numeric" value={draft.portions} onChange={(e) => onChange({ ...draft, portions: e.target.value })}
            className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-base" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Pese a panela pronta (sem a panela) para a conta ficar certa: a água que evapora ou entra muda o peso. Sem esse peso, vale a soma dos ingredientes ({Math.round(total.grams)} g).
      </p>
      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col rounded-xl bg-card p-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Receita inteira</dt>
          <dd className="font-display text-xl font-extrabold tabular-nums">{Math.round(total.kcal).toLocaleString("pt-BR")}<span className="text-sm font-semibold text-muted-foreground"> kcal</span></dd>
        </div>
        <div className="flex flex-col rounded-xl bg-card p-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Por porção</dt>
          <dd className="font-display text-xl font-extrabold tabular-nums">{portions > 0 ? Math.round(total.kcal / portions) : "—"}<span className="text-sm font-semibold text-muted-foreground"> kcal</span></dd>
        </div>
      </dl>
      <button type="button" disabled={!!problem} onClick={() => onSave({ id: draft.id ?? uid(), name: draft.name.trim(), items: draft.items, cookedGrams, portions })}
        className="min-h-11 w-full rounded-full bg-accent font-bold text-accent-foreground disabled:opacity-50">{problem ?? "Salvar receita"}</button>
    </div>
  );
}
