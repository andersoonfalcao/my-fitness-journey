import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Sparkles, Trash2, Loader2, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { foodsKey, KEYS, targets, today, uid, useLocal, type FoodEntry, type MealType, type Profile } from "@/lib/store";
import { searchFoods, type Food } from "@/lib/foods";
import { estimateFood } from "@/lib/ai-food";
import { WaterCard } from "@/components/WaterCard";
import { ProductPanel } from "@/components/ProductPanel";
import { MacroBar, NeedProfile } from "@/components/AppShell";

export const Route = createFileRoute("/alimentacao")({
  head: () => ({
    meta: [
      { title: "Alimentação — forma" },
      { name: "description", content: "Registre refeições buscando alimentos da tabela TACO ou descrevendo com IA e acompanhe calorias e macros." },
      { property: "og:title", content: "Alimentação — forma" },
      { property: "og:description", content: "Contagem de calorias e macros com busca de alimentos e estimativa por IA." },
    ],
  }),
  component: FoodPage,
});

const MEALS: { v: MealType; t: string }[] = [
  { v: "cafe", t: "Café da manhã" },
  { v: "almoco", t: "Almoço" },
  { v: "lanche", t: "Lanche" },
  { v: "jantar", t: "Jantar" },
];
const r1 = (n: number) => Math.round(n * 10) / 10;

function FoodPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [date, setDate] = useState(today());
  const [foods, setFoods] = useLocal<FoodEntry[]>(foodsKey(date), []);
  const [meal, setMeal] = useState<MealType>("almoco");
  const [mode, setMode] = useState<"busca" | "produto" | "ia">("busca");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;
  const t = targets(profile);
  const day = foods.filter((f) => f.date === date);
  const sum = day.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });

  const addFood = () => {
    if (!sel) return;
    const k = grams / 100;
    setFoods((fs) => [...fs, { id: uid(), date, meal, name: sel.name, grams, kcal: Math.round(sel.kcal * k), p: r1(sel.p * k), c: r1(sel.c * k), f: r1(sel.f * k) }]);
    toast.success(`${sel.name} adicionado`);
    setSel(null); setQ("");
  };

  const estimate = async () => {
    if (aiText.trim().length < 2) return;
    setLoading(true);
    try {
      const items = await estimateFood(aiText);
      if (!items.length) throw new Error("Nenhum alimento identificado.");
      setFoods((fs) => [...fs, ...items.map((i) => ({ id: uid(), date, meal, ...i }))]);
      toast.success(`${items.length} item(ns) estimado(s) pela IA`);
      setAiText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao estimar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-extrabold">Alimentação</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-input bg-card px-3 py-2" />
      </div>

      <section className="grid gap-4 rounded-3xl bg-primary p-6 text-primary-foreground sm:grid-cols-[auto_1fr] sm:items-center">
        <div>
          <div className="text-sm opacity-75">Consumido</div>
          <div className="font-display text-4xl font-extrabold">{Math.round(sum.kcal)}<span className="text-lg opacity-75"> / {t.kcal} kcal</span></div>
        </div>
        <div className="grid gap-3 sm:pl-6 [&_span]:!text-primary-foreground/80">
          <MacroBar name="Proteína" value={sum.p} max={t.protein} color="var(--chart-3)" />
          <MacroBar name="Carboidratos" value={sum.c} max={t.carbs} color="var(--accent)" />
          <MacroBar name="Gorduras" value={sum.f} max={t.fat} color="var(--secondary)" />
        </div>
      </section>

      <WaterCard date={date} targetMl={t.waterMl} />

      <section id="registrar" className="scroll-mt-24 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap gap-2">
          {MEALS.map((m) => (
            <button key={m.v} onClick={() => setMeal(m.v)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${meal === m.v ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{m.t}</button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-3xl bg-muted p-1 sm:inline-grid">
          <button onClick={() => setMode("busca")} className={`flex flex-col items-center gap-0.5 rounded-3xl px-2 py-2 text-xs font-bold sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${mode === "busca" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Search className="h-4 w-4" />Buscar</button>
          <button onClick={() => setMode("produto")} className={`flex flex-col items-center gap-0.5 rounded-3xl px-2 py-2 text-xs font-bold sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${mode === "produto" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><ScanBarcode className="h-4 w-4" />Produto</button>
          <button onClick={() => setMode("ia")} className={`flex flex-col items-center gap-0.5 rounded-3xl px-2 py-2 text-xs font-bold sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${mode === "ia" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Sparkles className="h-4 w-4 text-accent" />Descrever com IA</button>
        </div>

        {mode === "produto" ? (
          <ProductPanel onAdd={(food) => {
            setFoods((fs) => [...fs, { id: uid(), date, meal, ...food }]);
            toast.success(`${food.name} adicionado`);
          }} />
        ) : mode === "busca" ? (
          <div className="mt-4">
            {!sel ? (
              <>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex: frango, arroz, banana..."
                  className="w-full rounded-xl border border-input bg-background px-4 py-3" />
                <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
                  {searchFoods(q).map((f) => (
                    <li key={f.id}>
                      <button onClick={() => { setSel(f); setGrams(f.unit?.g ?? 100); }} className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left hover:text-accent">
                        <span className="min-w-0">
                          <span className="block font-semibold">{f.name}</span>
                          <span className="block text-xs text-muted-foreground">P {f.p}g · C {f.c}g · G {f.f}g por 100 g</span>
                        </span>
                        <span className="shrink-0 text-right text-sm text-muted-foreground">
                          {f.kcal} kcal
                          <span className="block text-[10px] font-semibold uppercase tracking-wide">{f.source}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {q.trim() && searchFoods(q).length === 0 && (
                    <li className="px-1 py-3 text-sm text-muted-foreground">Nada encontrado. Tente outra palavra ou use "Descrever com IA".</li>
                  )}
                </ul>
              </>
            ) : (
              <div className="rounded-2xl bg-muted p-4">
                <div className="font-display text-lg font-bold">{sel.name}</div>
                <div className="text-xs text-muted-foreground">Fonte: {sel.source === "TACO" ? "TACO (Unicamp)" : sel.source === "USDA" ? "USDA FoodData Central" : "média de rótulos"}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="number" value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="w-24 rounded-xl border border-input bg-card px-3 py-2" />
                  <span className="text-sm">gramas</span>
                  {sel.unit && (
                    <div className="flex gap-1">
                      {[1, 2, 3].map((n) => (
                        <button key={n} onClick={() => setGrams(sel.unit!.g * n)} className="rounded-full border border-input bg-card px-3 py-1 text-xs font-semibold">{n} {sel.unit!.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {Math.round(sel.kcal * grams / 100)} kcal · P {r1(sel.p * grams / 100)}g · C {r1(sel.c * grams / 100)}g · G {r1(sel.f * grams / 100)}g
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={addFood} className="rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground">Adicionar</button>
                  <button onClick={() => setSel(null)} className="rounded-full px-4 py-2 font-semibold text-muted-foreground">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={3}
              placeholder="Ex: 2 conchas de feijão, 4 colheres de arroz, 1 filé de frango grelhado e salada"
              className="w-full rounded-xl border border-input bg-background px-4 py-3" />
            <button onClick={estimate} disabled={loading} className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-bold text-accent-foreground disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Estimar macros
            </button>
            <p className="mt-2 text-xs text-muted-foreground">A IA estima porções e valores; confira e apague o que não fizer sentido.</p>
          </div>
        )}
      </section>

      <div id="refeicoes" className="grid scroll-mt-24 gap-4 md:grid-cols-2">
        {MEALS.map((m) => {
          const items = day.filter((f) => f.meal === m.v);
          const kcal = items.reduce((a, f) => a + f.kcal, 0);
          return (
            <section key={m.v} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex justify-between"><h3 className="font-bold">{m.t}</h3><span className="font-display font-bold text-accent">{kcal} kcal</span></div>
              {items.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nada registrado.</p> : (
                <ul className="mt-2 divide-y divide-border">
                  {items.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <div><div className="font-semibold">{f.name}</div><div className="text-muted-foreground">{f.grams}g · P {f.p} · C {f.c} · G {f.f}</div></div>
                      <div className="flex items-center gap-3"><span className="font-semibold">{f.kcal}</span>
                        <button aria-label="Remover" onClick={() => setFoods((fs) => fs.filter((x) => x.id !== f.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
