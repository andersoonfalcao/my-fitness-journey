import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Check, ChefHat, ChevronDown, Pencil, Search, Sparkles, Star, Trash2, Loader2, ScanBarcode } from "lucide-react";
import { QuickMeals } from "@/components/QuickMeals";
import { asItem, FAV_MEALS_KEY, frequentFoods, type FavItem, type FavMeal } from "@/lib/quick-foods";
import { toast } from "sonner";
import { foodsKey, KEYS, plannedKey, targets, today, uid, useLocal, type FoodEntry, type MealType, type Profile } from "@/lib/store";
import { searchFoods, type Food } from "@/lib/foods";
import { estimateFood } from "@/lib/ai-food";
import { WaterCard } from "@/components/WaterCard";
import { ProductPanel } from "@/components/ProductPanel";
import { SupplementsCard } from "@/components/SupplementsCard";
import { MacroBar, NeedProfile } from "@/components/AppShell";
import { MacrosCard } from "@/components/MacrosCard";
import { FoodEditDialog } from "@/components/FoodEditDialog";
import { PlatePhoto } from "@/components/PlatePhoto";
import { RecipesPanel } from "@/components/RecipesPanel";
import { FastingCard } from "@/components/FastingCard";
import { WeekMenu } from "@/components/WeekMenu";
import { CloseGapCard } from "@/components/CloseGapCard";
import { addDays, FIBER_REFERENCE, fiberOf, proteinByMeal, proteinPerMeal } from "@/lib/insights";

export const Route = createFileRoute("/alimentacao")({
  head: () => ({
    meta: [
      { title: "Alimentação — forma" },
      { name: "description", content: "Registre refeições buscando alimentos da tabela TACO ou descrevendo com IA e acompanhe calorias e macros." },
      { property: "og:title", content: "Alimentação — forma" },
      { property: "og:description", content: "Contagem de calorias e macros com busca de alimentos e estimativa por IA." },
    ],
  }),
  // ?aba=historico opens the history (7-day macros and past days); the default tab is for logging the day.
  validateSearch: (search: Record<string, unknown>): { aba?: "historico" } => (search["aba"] === "historico" ? { aba: "historico" } : {}),
  component: FoodPage,
});

const MEALS: { v: MealType; t: string }[] = [
  { v: "cafe", t: "Café da manhã" },
  { v: "almoco", t: "Almoço" },
  { v: "lanche", t: "Lanche" },
  { v: "jantar", t: "Jantar" },
];
const r1 = (n: number) => Math.round(n * 10) / 10;
/** One decimal with a comma, as the rest of the app writes numbers. */
const num1 = (n: number) => r1(n).toLocaleString("pt-BR");
/** First day of the month before a date's month. */
const monthBefore = (date: string) => {
  const d = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

function FoodPage() {
  const tab = Route.useSearch().aba ?? "hoje";
  const navigate = useNavigate();
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [date, setDate] = useState(today());
  const [foods, setFoods] = useLocal<FoodEntry[]>(foodsKey(date), []);
  const [prevMonthFoods] = useLocal<FoodEntry[]>(foodsKey(monthBefore(date)), []);
  const [, setFavs] = useLocal<FavMeal[]>(FAV_MEALS_KEY, []);
  const [meal, setMeal] = useState<MealType>("almoco");
  const [mode, setMode] = useState<"busca" | "produto" | "ia" | "receita">("busca");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  // Planning: what is added waits in its own document, grey, until "Comi" turns it into a real entry.
  const [planned, setPlanned] = useLocal<FoodEntry[]>(plannedKey(date), []);
  const [planning, setPlanning] = useState(false);
  const [editing, setEditing] = useState<{ entry: FoodEntry; planned: boolean } | null>(null);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;
  const t = targets(profile, date);
  const day = foods.filter((f) => f.date === date);
  const sum = day.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const fiber = fiberOf(day);
  const mealProtein = proteinByMeal(day);
  const proteinAim = proteinPerMeal(Math.min(profile.weight, Math.max(profile.goalWeight, 1)));
  const plannedDay = planned.filter((f) => f.date === date);
  const plannedKcal = Math.round(plannedDay.reduce((s, f) => s + f.kcal, 0));
  const plannedProtein = plannedDay.reduce((s, f) => s + f.p, 0);

  const mealLabel = MEALS.find((m) => m.v === meal)!.t;
  /** Everything added goes through here: to the log, or to the plan while planning, with an undo in the toast. */
  const addItems = (items: FavItem[], what: string) => {
    const added: FoodEntry[] = items.map((i) => ({ ...i, id: uid(), date, meal }));
    const ids = new Set(added.map((a) => a.id));
    const set = planning ? setPlanned : setFoods;
    set((fs) => [...fs, ...added]);
    const where = mealLabel.toLowerCase();
    const title = added.length === 1
      ? `${added[0]!.name} ${planning ? "planejado para o" : "adicionado ao"} ${where}`
      : `${what}: ${added.length} itens ${planning ? "planejados para o" : "adicionados ao"} ${where}`;
    toast.success(title, {
      action: { label: "Desfazer", onClick: () => set((fs) => fs.filter((f) => !ids.has(f.id))) },
    });
  };

  const addFood = () => {
    if (!sel) return;
    const k = grams / 100;
    addItems([{ name: sel.name, grams, kcal: Math.round(sel.kcal * k), p: r1(sel.p * k), c: r1(sel.c * k), f: r1(sel.f * k), ...(sel.fiber !== undefined ? { fiber: r1(sel.fiber * k) } : {}) }], sel.name);
    setSel(null); setQ("");
  };

  /** "Para fechar o dia": goes straight to the log, in the meal the suggestion names. */
  const addToMeal = (m: MealType, items: FavItem[], what: string) => {
    const added: FoodEntry[] = items.map((i) => ({ ...i, id: uid(), date, meal: m }));
    const ids = new Set(added.map((a) => a.id));
    setFoods((fs) => [...fs, ...added]);
    const where = MEALS.find((x) => x.v === m)?.t.toLowerCase() ?? "dia";
    toast.success(`${what} adicionado ao ${where}`, { action: { label: "Desfazer", onClick: () => setFoods((fs) => fs.filter((f) => !ids.has(f.id))) } });
  };

  /** A planned food was eaten: it leaves the plan and enters the log as it is. */
  const eatPlanned = (ids: Set<string>) => {
    const eaten = planned.filter((f) => ids.has(f.id));
    setFoods((fs) => [...fs, ...eaten.map((f) => ({ ...f, id: uid() }))]);
    setPlanned((ps) => ps.filter((f) => !ids.has(f.id)));
    toast.success(eaten.length === 1 ? `${eaten[0]!.name} registrado` : `${eaten.length} itens registrados`);
  };

  const saveFavorite = (m: MealType, label: string, items: FoodEntry[]) => {
    const name = prompt("Nome da refeição favorita:", `${label} padrão`)?.trim();
    if (!name) return;
    setFavs((list) => [...list, { id: uid(), name: name.slice(0, 40), meal: m, items: items.map(asItem) }]);
    toast.success(`“${name}” salva nas favoritas`);
  };

  // What is logged most, with last time's grams, shown before typing (needs at least two uses).
  const frequent = frequentFoods([...prevMonthFoods.filter((f) => f.date < date), ...foods.filter((f) => f.date <= date)]);

  const estimate = async () => {
    if (aiText.trim().length < 2) return;
    setLoading(true);
    try {
      const items = await estimateFood(aiText);
      if (!items.length) throw new Error("Nenhum alimento identificado.");
      addItems(items, "Estimado pela IA");
      setAiText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao estimar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Alimentação</h1>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Alimentação">
        {([["hoje", "Registrar", {}], ["historico", "Histórico", { aba: "historico" }]] as const).map(([value, label, search]) => (
          <Link key={value} to="/alimentacao" search={search} replace role="tab" aria-selected={tab === value}
            className={`rounded-full py-2 text-center text-sm font-bold ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {label}
          </Link>
        ))}
      </div>

      {tab === "historico" ? (
        <FoodHistory t={t} onEdit={(d) => { setDate(d); void navigate({ to: "/alimentacao", search: {}, replace: true }); window.scrollTo({ top: 0 }); }} />
      ) : (<>
      <section className="rounded-3xl bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold opacity-90">
            {date === today() ? "Hoje" : new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
          </div>
          <label className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold">
            Outro dia
            <input type="date" value={date} max={planning ? addDays(today(), 7) : today()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Registrar em outro dia"
              className="w-[8.5rem] bg-transparent text-primary-foreground [color-scheme:dark]" />
          </label>
        </div>
        <div className="mt-1 font-display text-4xl font-extrabold">{Math.round(sum.kcal).toLocaleString("pt-BR")}<span className="text-lg opacity-75"> / {t.kcal.toLocaleString("pt-BR")} kcal</span></div>
        <div className="mt-4 grid gap-3 [&_span]:!text-primary-foreground/80">
          <MacroBar name="Proteína" value={sum.p} max={t.protein} color="#6cc495" />
          <MacroBar name="Carboidratos" value={sum.c} max={t.carbs} color="var(--chart-1)" />
          <MacroBar name="Gorduras" value={sum.f} max={t.fat} color="var(--chart-3)" />
          {fiber.known > 0 && <MacroBar name="Fibras" value={fiber.grams} max={FIBER_REFERENCE} color="var(--chart-4)" />}
        </div>
        {fiber.known > 0 && (
          <p className="mt-2 text-xs opacity-75">Fibras: referência de 25 a 30 g por dia.{fiber.unknown > 0 ? ` ${fiber.unknown} ${fiber.unknown === 1 ? "item não tem" : "itens não têm"} esse valor e ${fiber.unknown === 1 ? "ficou" : "ficaram"} de fora.` : ""}</p>
        )}
        {plannedKcal > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-primary-foreground/10 px-3 py-2 text-sm">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span>Planejado: <b>+{plannedKcal} kcal</b>. Se comer tudo, o dia fecha em <b>{(Math.round(sum.kcal) + plannedKcal).toLocaleString("pt-BR")}</b> de {t.kcal.toLocaleString("pt-BR")} kcal
              {Math.round(sum.kcal) + plannedKcal <= t.kcal ? `, sobrando ${t.kcal - Math.round(sum.kcal) - plannedKcal}` : `, ${Math.round(sum.kcal) + plannedKcal - t.kcal} acima`}.</span>
          </p>
        )}
        {date !== today() && (
          <button type="button" onClick={() => setDate(today())} className="mt-4 text-sm font-semibold underline underline-offset-4">Voltar para hoje</button>
        )}
      </section>

      {date === today() && (
        <CloseGapCard left={{ protein: t.protein - sum.p - plannedProtein, kcal: t.kcal - sum.kcal - plannedKcal }}
          history={[...prevMonthFoods.filter((f) => f.date < date), ...foods.filter((f) => f.date <= date)]} onAdd={addToMeal} />
      )}

      <WaterCard date={date} targetMl={t.waterMl} />

      <SupplementsCard date={date} />

      {date === today() && <FastingCard />}

      <section id="registrar" className="scroll-mt-24 rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="radiogroup" aria-label="Registrar ou planejar">
          {([[false, "Comi"], [true, "Planejar"]] as const).map(([value, label]) => (
            <button key={label} type="button" role="radio" aria-checked={planning === value} onClick={() => { setPlanning(value); if (!value && date > today()) setDate(today()); }}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full text-sm font-bold ${planning === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {value ? <CalendarClock className="h-4 w-4" /> : <Check className="h-4 w-4" />}{label}
            </button>
          ))}
        </div>
        {planning && <p className="-mt-2 mb-3 text-xs text-muted-foreground">O que você adicionar fica planejado (em cinza) e não conta até você tocar em “Comi”. Dá para planejar até 7 dias à frente pelo “Outro dia”.</p>}
        {planning && <WeekMenu profile={profile} entries={[...prevMonthFoods.filter((f) => f.date < date), ...foods.filter((f) => f.date <= date)]} />}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {MEALS.map((m) => (
            <button key={m.v} onClick={() => setMeal(m.v)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${meal === m.v ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{m.t}</button>
          ))}
        </div>
        <QuickMeals date={date} meal={meal} mealLabel={mealLabel} onAdd={addItems} />
        <div className="mt-4 grid grid-cols-4 gap-1 rounded-3xl bg-muted p-1 sm:inline-grid">
          <button onClick={() => setMode("busca")} className={`flex flex-col items-center gap-0.5 rounded-3xl px-2 py-2 text-xs font-bold sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${mode === "busca" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Search className="h-4 w-4" />Buscar</button>
          <button onClick={() => setMode("produto")} className={`flex flex-col items-center gap-0.5 rounded-3xl px-2 py-2 text-xs font-bold sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${mode === "produto" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><ScanBarcode className="h-4 w-4" />Produto</button>
          <button onClick={() => setMode("ia")} className={`flex flex-col items-center gap-0.5 rounded-3xl px-2 py-2 text-xs font-bold sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${mode === "ia" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Sparkles className="h-4 w-4 text-accent" /><span className="sm:hidden">Com IA</span><span className="hidden sm:inline">Descrever com IA</span></button>
          <button onClick={() => setMode("receita")} className={`flex flex-col items-center gap-0.5 rounded-3xl px-2 py-2 text-xs font-bold sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${mode === "receita" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><ChefHat className="h-4 w-4" />Receita</button>
        </div>

        {mode === "produto" ? (
          <ProductPanel onAdd={(food) => addItems([food], food.name)} />
        ) : mode === "receita" ? (
          <RecipesPanel mealLabel={mealLabel} planning={planning} onAdd={(item) => addItems([item], item.name)} />
        ) : mode === "busca" ? (
          <div className="mt-4">
            {!sel ? (
              <>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex: frango, arroz, banana..."
                  className="w-full rounded-xl border border-input bg-background px-4 py-3" />
                {!q.trim() && frequent.length > 0 && (
                  <>
                    <div className="mt-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mais usados por você</div>
                    <ul className="divide-y divide-border">
                      {frequent.map(({ food, grams: g, count }) => (
                        <li key={food.id}>
                          <button onClick={() => { setSel(food); setGrams(g); }} className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left hover:text-accent">
                            <span className="min-w-0">
                              <span className="block font-semibold">{food.name}</span>
                              <span className="block text-xs text-muted-foreground">última vez {g} g · {Math.round((food.kcal * g) / 100)} kcal</span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-muted-foreground">{count}×</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sugestões</div>
                  </>
                )}
                <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
                  {searchFoods(q).map((f) => (
                    <li key={f.id}>
                      <button onClick={() => { setSel(f); setGrams(f.unit?.g ?? 100); }} className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left hover:text-accent">
                        <span className="min-w-0">
                          <span className="block font-semibold">{f.name}</span>
                          <span className="block text-xs text-muted-foreground">P {num1(f.p)} g · C {num1(f.c)} g · G {num1(f.f)} g por 100 g</span>
                        </span>
                        <span className="shrink-0 text-right text-sm text-muted-foreground">
                          {f.kcal} kcal
                          <span className="block text-[10px] font-semibold uppercase tracking-wide">{f.source}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {q.trim() && searchFoods(q).length === 0 && (
                    <li className="px-1 py-3 text-sm text-muted-foreground">Nada encontrado. Tente outra palavra ou descreva com a IA.</li>
                  )}
                </ul>
              </>
            ) : (
              <div className="rounded-2xl bg-muted p-4">
                <div className="font-display text-lg font-bold">{sel.name}</div>
                <div className="text-xs text-muted-foreground">Fonte: {sel.source === "TACO" ? "TACO (Unicamp)" : sel.source === "USDA" ? "USDA FoodData Central" : sel.source === "Registro" ? "o seu registro anterior" : "média de rótulos"}</div>
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
                  {Math.round(sel.kcal * grams / 100)} kcal · P {num1(sel.p * grams / 100)} g · C {num1(sel.c * grams / 100)} g · G {num1(sel.f * grams / 100)} g
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={addFood} className="rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground">{planning ? "Planejar" : "Adicionar"}</button>
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
            <p className="mt-2 text-xs text-muted-foreground">A IA estima porções e valores; toque no item registrado para corrigir as gramas.</p>
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-sm font-bold">Ou tire uma foto do prato</p>
              <p className="text-xs text-muted-foreground">O texto acima, se houver, vai junto como dica (ex.: “arroz integral, frango sem pele”).</p>
              <PlatePhoto hint={aiText} mealLabel={mealLabel} planning={planning} onAdd={(items) => { addItems(items, "Foto do prato"); setAiText(""); }} />
            </div>
          </div>
        )}
      </section>

      <div id="refeicoes" className="grid scroll-mt-24 gap-4 md:grid-cols-2">
        {[...MEALS, { v: "suplementos" as const, t: "Suplementos" }].map((m) => {
          const items = day.filter((f) => f.meal === m.v);
          const plan = plannedDay.filter((f) => f.meal === m.v);
          if (m.v === "suplementos" && items.length === 0) return null;
          const kcal = items.reduce((a, f) => a + f.kcal, 0);
          return (
            <section key={m.v} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex justify-between"><h3 className="font-bold">{m.t}</h3><span className="font-display font-bold text-accent">{kcal} kcal</span></div>
              {m.v !== "suplementos" && items.length > 0 && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  Proteína: <b className={mealProtein[m.v]! >= proteinAim ? "text-[#3f9d6b]" : "text-foreground"}>{mealProtein[m.v]} g</b>
                  {mealProtein[m.v]! < proteinAim && <> · o ideal por refeição é a partir de {proteinAim} g</>}
                </p>
              )}
              {items.length === 0 && plan.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nada registrado.</p> : items.length > 0 && (
                <ul className="mt-2 divide-y divide-border">
                  {items.map((f) => (
                    <li key={f.id}>
                      <button type="button" onClick={() => setEditing({ entry: f, planned: false })} aria-label={`Editar ${f.name}`}
                        className="flex min-h-11 w-full items-center justify-between gap-2 py-2 text-left text-sm">
                        <span className="min-w-0"><span className="block font-semibold">{f.name}</span><span className="block text-muted-foreground">{f.dose ?? `${f.grams}g`} · P {f.p} · C {f.c} · G {f.f}</span></span>
                        <span className="flex shrink-0 items-center gap-2"><span className="font-semibold tabular-nums">{f.kcal}</span><Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {plan.length > 0 && (
                <div className="mt-2 rounded-2xl border border-dashed border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />Planejado · {Math.round(plan.reduce((s, f) => s + f.kcal, 0))} kcal</span>
                    {plan.length > 1 && <button type="button" onClick={() => eatPlanned(new Set(plan.map((f) => f.id)))} className="min-h-9 px-1 text-xs font-bold text-primary">Comi tudo</button>}
                  </div>
                  <ul className="divide-y divide-border">
                    {plan.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
                        <button type="button" onClick={() => setEditing({ entry: f, planned: true })} aria-label={`Editar ${f.name} planejado`} className="min-h-11 min-w-0 flex-1 text-left">
                          <span className="block font-semibold">{f.name}</span><span className="block text-xs">{f.grams}g · {f.kcal} kcal</span>
                        </button>
                        <button type="button" onClick={() => eatPlanned(new Set([f.id]))} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-input bg-card px-3 text-xs font-bold text-foreground">
                          <Check className="h-3.5 w-3.5" />Comi
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {items.length > 0 && m.v !== "suplementos" && (
                <button type="button" onClick={() => saveFavorite(m.v, m.t, items)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-accent">
                  <Star className="h-4 w-4" />Salvar como favorita
                </button>
              )}
            </section>
          );
        })}
      </div>
      <FoodEditDialog
        entry={editing?.entry ?? null}
        onClose={() => setEditing(null)}
        onSave={(next) => (editing?.planned ? setPlanned : setFoods)((fs) => fs.map((f) => (f.id === next.id ? next : f)))}
        onDelete={(entry) => {
          const set = editing?.planned ? setPlanned : setFoods;
          set((fs) => fs.filter((f) => f.id !== entry.id));
          toast.success(`${entry.name} apagado`, { action: { label: "Desfazer", onClick: () => set((fs) => [...fs, entry]) } });
        }}
      />
      </>)}
    </div>
  );
}

const DAYS_SHOWN = 30;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Histórico: the 7-day macros and the last days with what was eaten, each one reopenable for corrections. */
function FoodHistory({ t, onEdit }: { t: ReturnType<typeof targets>; onEdit: (date: string) => void }) {
  const end = today();
  const start = new Date(`${end}T12:00:00`);
  start.setDate(start.getDate() - (DAYS_SHOWN - 1));
  // Food logs are one document per month: the last 30 days span this month and the one before.
  const [thisMonth] = useLocal<FoodEntry[]>(foodsKey(end), []);
  const [prevMonth] = useLocal<FoodEntry[]>(foodsKey(iso(start)), []);
  const foods = foodsKey(iso(start)) === foodsKey(end) ? thisMonth : [...prevMonth, ...thisMonth];
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const d = new Date(`${end}T12:00:00`);
    d.setDate(d.getDate() - i);
    const date = iso(d);
    const items = foods.filter((f) => f.date === date);
    const sum = items.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
    return { date, d, items, sum };
  }).filter((x) => x.items.length > 0);

  return (
    <div className="space-y-4">
      <MacrosCard t={t} />
      <section className="space-y-2">
        <h2 className="px-1 text-xl font-bold">Últimos dias</h2>
        {days.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">Nenhuma refeição registrada nos últimos {DAYS_SHOWN} dias.</p>
        ) : days.map(({ date, d, items, sum }) => (
          <details key={date} className="group rounded-3xl border border-border bg-card px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {date === end ? "Hoje" : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </span>
                <span className="block font-display text-lg font-bold tabular-nums">
                  {Math.round(sum.kcal).toLocaleString("pt-BR")} <span className="text-sm font-semibold text-muted-foreground">/ {t.kcal.toLocaleString("pt-BR")} kcal · {Math.round((sum.kcal / t.kcal) * 100)}%</span>
                </span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  <b style={{ color: "var(--chart-2)" }}>P</b> {Math.round(sum.p)} g · <b style={{ color: "var(--chart-1)" }}>C</b> {Math.round(sum.c)} g · <b style={{ color: "var(--chart-3)" }}>G</b> {Math.round(sum.f)} g
                </span>
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-3 border-t border-border pt-2">
              {[...MEALS, { v: "suplementos" as const, t: "Suplementos" }].map((m) => {
                const list = items.filter((f) => f.meal === m.v);
                if (!list.length) return null;
                return (
                  <div key={m.v} className="py-1.5">
                    <div className="flex justify-between text-sm font-bold"><span>{m.t}</span><span className="text-accent">{list.reduce((a, f) => a + f.kcal, 0)} kcal</span></div>
                    <ul className="text-sm text-muted-foreground">
                      {list.map((f) => (
                        <li key={f.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{f.name} · {f.dose ?? `${f.grams}g`}</span><span className="shrink-0 tabular-nums">{f.kcal}</span></li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <button type="button" onClick={() => onEdit(date)} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold">
                <Pencil className="h-4 w-4" />Editar este dia
              </button>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
