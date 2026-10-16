import { useState } from "react";
import { Activity, Check, Droplets, Dumbbell, Loader2, Plus, Scale, Search, Sparkles, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { closeDay } from "@/lib/day-close";
import { estimateFood } from "@/lib/ai-food";
import { searchFoods, type Food } from "@/lib/foods";
import { FAV_MEALS_KEY, frequentFoods, type FavItem, type FavMeal } from "@/lib/quick-foods";
import { CARDIO_KINDS, cardioKey, type CardioKind, type CardioRecord } from "@/lib/cardio";
import { dayComplete, MAIN_MEALS, planDayFinish, regram, type FinishPlan } from "@/lib/day-finish";
import { nextWorkoutIndex, type Plan } from "@/lib/plan";
import { byId } from "@/lib/exercises";
import {
  daysKey,
  fmtKg,
  foodsKey,
  KEYS,
  roundKg,
  targets,
  uid,
  useHistory,
  useLocal,
  waterKey,
  type DayRecord,
  type FoodEntry,
  type MealType,
  type Profile,
  type WaterLog,
  type WeightEntry,
  type WorkoutRecord,
} from "@/lib/store";

type Form = "refeicao" | "agua" | "treino" | "cardio" | "peso";
const FORMS: { id: Form; label: string; icon: typeof Utensils }[] = [
  { id: "refeicao", label: "Refeição", icon: Utensils },
  { id: "agua", label: "Água", icon: Droplets },
  { id: "treino", label: "Treino", icon: Dumbbell },
  { id: "cardio", label: "Cardio", icon: Activity },
  { id: "peso", label: "Peso", icon: Scale },
];
const MEAL_SHORT: Record<MealType, string> = { cafe: "Café", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar", suplementos: "Suplementos" };
const r1 = (n: number) => Math.round(n * 10) / 10;
const n0 = (n: number) => Math.round(n).toLocaleString("pt-BR");
const toNum = (s: string) => Number(s.replace(",", "."));
/** First day of the month before a date's month. */
const monthBefore = (date: string) => {
  const d = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const field = "h-11 w-full rounded-xl border border-input bg-background px-3 text-base";
const pill = (on: boolean) => `min-h-11 rounded-full px-3 text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`;

/**
 * Calendário, inside a day: log what was left out that day (meals, water, workout, cardio, weight), past days included,
 * and "Finalizar o dia com IA": the AI suggests what to log for the missing meals and the macros under the target,
 * the person ticks and adjusts, and only then it is saved and the day closed (its review, as in Hoje).
 */
export function DayComplete({ profile, date }: { profile: Profile; date: string }) {
  const userId = useAuth().user?.uid;
  const [open, setOpen] = useState<Form | null>(null);
  const [foods, setFoods] = useLocal<FoodEntry[]>(foodsKey(date), []);
  const [prevFoods] = useLocal<FoodEntry[]>(foodsKey(monthBefore(date)), []);
  const [water, setWater] = useLocal<WaterLog>(waterKey(date), {});
  const [weights, setWeights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [days, setDays] = useLocal<DayRecord[]>(daysKey(date), []);
  const [favs] = useLocal<FavMeal[]>(FAV_MEALS_KEY, []);
  const [history] = useHistory();
  const [plan, setPlan] = useState<FinishPlan | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [waterPick, setWaterPick] = useState(true);
  const [busy, setBusy] = useState<"plan" | "close" | null>(null);

  const goal = targets(profile, date);
  const eaten = foods.filter((f) => f.date === date);
  const waterMl = water[date] ?? 0;
  const waterLeft = Math.max(0, goal.waterMl - waterMl);
  const closed = days.find((d) => d.date === date);

  const addFoods = (meal: MealType, items: FavItem[], what: string) => {
    const added: FoodEntry[] = items.map((i) => ({ ...i, id: uid(), date, meal }));
    const ids = new Set(added.map((a) => a.id));
    setFoods((fs) => [...fs, ...added]);
    toast.success(`${what} no ${MEAL_SHORT[meal].toLowerCase()}`, { action: { label: "Desfazer", onClick: () => setFoods((fs) => fs.filter((f) => !ids.has(f.id))) } });
  };

  /** Writes the review of the day; the calendar then shows it as finished. */
  const finish = async () => {
    if (!userId) return;
    setBusy("close");
    try {
      const record = await closeDay({ uid: userId, date, profile, weights, history });
      setDays((list) => [...list.filter((d) => d.date !== date), record]);
      setPlan(null);
      toast.success("Dia finalizado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível finalizar o dia.");
    } finally {
      setBusy(null);
    }
  };

  const suggest = async () => {
    setBusy("plan");
    try {
      const next = await planDayFinish({ date, eaten, goal, recent: [...prevFoods, ...foods].filter((f) => f.date <= date), favs });
      setPlan(next);
      setPicked(Object.fromEntries(next.items.map((i) => [i.key, true])));
      setWaterPick(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível falar com a IA.");
    } finally {
      setBusy(null);
    }
  };

  /** Saves what was ticked, then closes the day. */
  const confirm = async () => {
    if (!plan) return;
    const chosen = plan.items.filter((i) => picked[i.key] && i.grams > 0);
    if (chosen.length) setFoods((fs) => [...fs, ...chosen.map(({ key: _k, estimated: _e, meal, ...item }) => ({ ...item, id: uid(), date, meal }))]);
    if (waterPick && waterLeft > 0) setWater((l) => ({ ...l, [date]: (l[date] ?? 0) + waterLeft }));
    await finish();
  };

  const nothingMissing = dayComplete(eaten, goal) && waterLeft === 0;

  return (
    <section className="space-y-3 border-t border-border pt-4" aria-labelledby="completar-dia">
      <h3 id="completar-dia" className="font-bold">Completar o dia</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {FORMS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold ${open === id ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
            <Icon className="h-4 w-4" aria-hidden />{label}
          </button>
        ))}
      </div>

      {open === "refeicao" && <MealForm date={date} recent={[...prevFoods, ...foods]} onAdd={addFoods} />}
      {open === "agua" && <WaterForm onAdd={(ml) => { setWater((l) => ({ ...l, [date]: (l[date] ?? 0) + ml })); toast.success(`+${ml} ml de água`); }} />}
      {open === "peso" && (
        <WeightForm current={weights.find((w) => w.date === date)?.kg ?? null}
          onSave={(kg) => { setWeights((ws) => [...ws.filter((w) => w.date !== date), { date, kg: roundKg(kg) }]); toast.success(`Peso de ${fmtKg(kg)} kg registrado`); setOpen(null); }} />
      )}
      {open === "treino" && <WorkoutForm date={date} onDone={() => setOpen(null)} />}
      {open === "cardio" && <CardioForm date={date} onDone={() => setOpen(null)} />}

      {plan ? (
        <FinishReview plan={plan} eaten={eaten} goal={goal} picked={picked} waterLeft={waterLeft} waterPick={waterPick} busy={busy === "close"}
          onPick={(key, on) => setPicked((p) => ({ ...p, [key]: on }))}
          onGrams={(key, grams) => setPlan((p) => p && { ...p, items: p.items.map((i) => (i.key === key ? regram(i, grams) : i)) })}
          onWater={setWaterPick} onConfirm={() => void confirm()} onCancel={() => setPlan(null)} />
      ) : (
        <div className="space-y-2 rounded-2xl bg-muted/60 p-4">
          <p className="text-sm text-muted-foreground">
            {nothingMissing
              ? "Refeições, metas e água completas. Finalize para receber a análise da IA."
              : "A IA olha as refeições que faltam e o que ficou abaixo da meta e sugere o que registrar. Você confere antes de salvar."}
          </p>
          <Button type="button" onClick={() => void (nothingMissing ? finish() : suggest())} disabled={!!busy} className="min-h-11 w-full rounded-full">
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy === "plan" ? "Vendo o que falta…" : busy === "close" ? "Finalizando…" : closed ? "Finalizar de novo com IA" : "Finalizar o dia com IA"}
          </Button>
        </div>
      )}
    </section>
  );
}

function FinishReview({ plan, eaten, goal, picked, waterLeft, waterPick, busy, onPick, onGrams, onWater, onConfirm, onCancel }: {
  plan: FinishPlan; eaten: FoodEntry[]; goal: { kcal: number; protein: number; carbs: number; fat: number };
  picked: Record<string, boolean>; waterLeft: number; waterPick: boolean; busy: boolean;
  onPick: (key: string, on: boolean) => void; onGrams: (key: string, grams: number) => void; onWater: (on: boolean) => void;
  onConfirm: () => void; onCancel: () => void;
}) {
  const chosen = plan.items.filter((i) => picked[i.key]);
  const total = [...eaten, ...chosen].reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const meals = MAIN_MEALS.filter(({ meal }) => plan.items.some((i) => i.meal === meal));
  const count = chosen.length + (waterPick && waterLeft > 0 ? 1 : 0);

  return (
    <div className="space-y-3 rounded-2xl border border-accent/40 p-4">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" aria-hidden /><b>Sugestão para completar</b></div>
      {plan.missingMeals.length > 0 && (
        <p className="text-sm">Faltavam: {plan.missingMeals.map((m) => MEAL_SHORT[m].toLowerCase()).join(", ")}.</p>
      )}
      {plan.note && <p className="text-sm text-muted-foreground">{plan.note}</p>}
      {plan.items.length === 0 && waterLeft === 0 && <p className="text-sm text-muted-foreground">A IA não achou nada para sugerir. Você pode finalizar assim mesmo.</p>}

      {meals.map(({ meal, label }) => (
        <div key={meal}>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
          <ul className="mt-1 space-y-1.5">
            {plan.items.filter((i) => i.meal === meal).map((i) => (
              <li key={i.key} className="flex items-center gap-2 rounded-xl bg-muted/60 px-2 py-1.5">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
                  <input type="checkbox" checked={!!picked[i.key]} onChange={(e) => onPick(i.key, e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{i.name}</span>
                    <span className="block text-xs tabular-nums text-muted-foreground">{n0(i.kcal)} kcal · P {r1(i.p).toLocaleString("pt-BR")} g{i.estimated ? " · estimado" : ""}</span>
                  </span>
                </label>
                <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <input type="number" inputMode="numeric" min={1} max={1500} defaultValue={i.grams} aria-label={`Gramas de ${i.name}`}
                    onBlur={(e) => { const g = Math.round(toNum(e.target.value)); if (g > 0 && g <= 1500 && g !== i.grams) onGrams(i.key, g); }}
                    className="h-11 w-16 rounded-lg border border-input bg-background px-2 text-right text-base tabular-nums text-foreground" />g
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {waterLeft > 0 && (
        <label className="flex min-h-11 items-center gap-2 rounded-xl bg-muted/60 px-2 py-1.5 text-sm">
          <input type="checkbox" checked={waterPick} onChange={(e) => onWater(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
          <span>Água: <b>+{n0(waterLeft)} ml</b> para chegar à meta</span>
        </label>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-xs">
        <span><b className="block font-display text-base tabular-nums">{n0(total.kcal)}</b>de {n0(goal.kcal)} kcal</span>
        <span><b className="block font-display text-base tabular-nums">{n0(total.p)} g</b>de {goal.protein} g de proteína</span>
        <span><b className="block font-display text-base tabular-nums">{n0(total.c)} g</b>de {goal.carbs} g de carboidratos</span>
        <span><b className="block font-display text-base tabular-nums">{n0(total.f)} g</b>de {goal.fat} g de gorduras</span>
      </div>

      <div className="grid gap-2">
        <Button type="button" onClick={onConfirm} disabled={busy} className="min-h-11 rounded-full">
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {busy ? "Finalizando…" : count ? `Registrar ${count === 1 ? "1 item" : `${count} itens`} e finalizar` : "Finalizar sem registrar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="min-h-11 rounded-full"><X />Cancelar</Button>
      </div>
    </div>
  );
}

function MealForm({ date, recent, onAdd }: { date: string; recent: FoodEntry[]; onAdd: (meal: MealType, items: FavItem[], what: string) => void }) {
  const eaten = recent.filter((f) => f.date === date);
  const [meal, setMeal] = useState<MealType>(() => MAIN_MEALS.find(({ meal: m }) => !eaten.some((f) => f.meal === m))?.meal ?? "almoco");
  const [mode, setMode] = useState<"busca" | "ia">("busca");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const frequent = frequentFoods(recent.filter((f) => f.date < date), 6);
  const results = q.trim() ? searchFoods(q).slice(0, 6) : frequent.map((x) => x.food);

  const pick = (food: Food) => {
    setSel(food);
    setGrams(String(frequent.find((x) => x.food.name === food.name)?.grams ?? food.unit?.g ?? 100));
  };
  const add = () => {
    const g = toNum(grams);
    if (!sel || !(g > 0 && g <= 3000)) { toast.error("Informe os gramas"); return; }
    const k = g / 100;
    onAdd(meal, [{ name: sel.name, grams: g, kcal: Math.round(sel.kcal * k), p: r1(sel.p * k), c: r1(sel.c * k), f: r1(sel.f * k), ...(sel.fiber !== undefined ? { fiber: r1(sel.fiber * k) } : {}) }], sel.name);
    setSel(null);
    setQ("");
  };
  const estimate = async () => {
    if (text.trim().length < 2) return;
    setLoading(true);
    try {
      const items = await estimateFood(text);
      if (!items.length) throw new Error("Nenhum alimento identificado.");
      onAdd(meal, items, items.length === 1 ? items[0]!.name : `${items.length} itens estimados pela IA`);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao estimar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MAIN_MEALS.map((m) => (
          <button key={m.meal} type="button" onClick={() => setMeal(m.meal)} aria-pressed={meal === m.meal} className={pill(meal === m.meal)}>
            {MEAL_SHORT[m.meal]}{eaten.some((f) => f.meal === m.meal) ? " ✓" : ""}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {([["busca", "Buscar"], ["ia", "Descrever com IA"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setMode(v)} className={`min-h-9 rounded-full text-sm font-bold ${mode === v ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {mode === "busca" ? (
        sel ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">{sel.name}</div>
            <div className="flex gap-2">
              <label className="relative flex-1">
                <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} aria-label="Gramas" className={`${field} pr-8`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
              </label>
              <Button type="button" onClick={add} className="min-h-11 rounded-full"><Plus />Adicionar</Button>
            </div>
            <button type="button" onClick={() => setSel(null)} className="text-sm font-semibold text-muted-foreground underline underline-offset-4">Escolher outro</button>
          </div>
        ) : (
          <>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento" aria-label="Buscar alimento" className={`${field} pl-9`} />
            </label>
            {!q.trim() && frequent.length > 0 && <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mais usados por você</div>}
            <ul className="space-y-1">
              {results.map((food) => (
                <li key={food.id}>
                  <button type="button" onClick={() => pick(food)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-left text-sm hover:bg-muted">
                    <span className="min-w-0 truncate">{food.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{n0(food.kcal)} kcal/100 g</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )
      ) : (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Ex.: arroz, feijão, filé de frango e salada" aria-label="Descreva o que comeu"
            className="w-full rounded-xl border border-input bg-background p-3 text-base" />
          <Button type="button" onClick={() => void estimate()} disabled={loading || text.trim().length < 2} className="min-h-11 w-full rounded-full">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}{loading ? "Estimando…" : `Estimar e adicionar ao ${MEAL_SHORT[meal].toLowerCase()}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function WaterForm({ onAdd }: { onAdd: (ml: number) => void }) {
  const [ml, setMl] = useState("250");
  const save = () => {
    const v = Math.round(toNum(ml));
    if (!(v > 0 && v <= 3000)) { toast.error("Quantidade entre 1 e 3000 ml"); return; }
    onAdd(v);
  };
  return (
    <div className="space-y-2 rounded-2xl bg-muted/40 p-3">
      <div className="grid grid-cols-4 gap-2">
        {[250, 500, 750, 1000].map((v) => (
          <button key={v} type="button" onClick={() => setMl(String(v))} className={pill(ml === String(v))}>{v < 1000 ? `${v} ml` : "1 L"}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <label className="relative flex-1">
          <input type="number" inputMode="numeric" value={ml} onChange={(e) => setMl(e.target.value)} aria-label="Mililitros" className={`${field} pr-10`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ml</span>
        </label>
        <Button type="button" onClick={save} className="min-h-11 rounded-full"><Plus />Adicionar</Button>
      </div>
    </div>
  );
}

function WeightForm({ current, onSave }: { current: number | null; onSave: (kg: number) => void }) {
  const [kg, setKg] = useState(current ? String(current).replace(".", ",") : "");
  const save = () => {
    const v = toNum(kg);
    if (!(v >= 25 && v <= 350)) { toast.error("Informe um peso válido"); return; }
    onSave(v);
  };
  return (
    <div className="flex gap-2 rounded-2xl bg-muted/40 p-3">
      <label className="relative flex-1">
        <input type="text" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="80,45" aria-label="Peso em kg" className={`${field} pr-10`} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
      </label>
      <Button type="button" onClick={save} className="min-h-11 rounded-full"><Check />{current ? "Trocar" : "Salvar"}</Button>
    </div>
  );
}

/** A workout done that day and not logged: saved as done without the timer, and it moves the sequence along. */
function WorkoutForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [plan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog, setDone] = useLocal<string[]>(KEYS.done, []);
  const [cycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [history, setHistory] = useHistory();
  const next = plan ? nextWorkoutIndex(doneLog.length, cycleStart, plan.days.length) : 0;
  const [idx, setIdx] = useState(next);
  if (!plan?.days.length) return <p className="rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">Gere um plano em Treinos para registrar treinos.</p>;
  const already = history.filter((r) => r.date === date);

  const save = () => {
    const day = plan.days[idx]!;
    const record: WorkoutRecord = {
      id: uid(),
      date,
      dayName: day.name,
      finishedAt: new Date(`${date}T12:00:00`).getTime(),
      exercises: day.items.map((it) => ({ exId: it.exId, name: byId(it.exId).name, setsDone: it.sets, setsPlanned: it.sets, reps: it.reps, setKgs: [], setReps: [] })),
    };
    setHistory((records) => [...records, record].sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt));
    setDone((d) => [...d, `${date}|${day.name}`]);
    toast.success(`${day.name} registrado`);
    onDone();
  };

  return (
    <div className="space-y-2 rounded-2xl bg-muted/40 p-3">
      {already.length > 0 && <p className="text-sm text-muted-foreground">Já registrado neste dia: {already.map((r) => r.dayName).join(", ")}.</p>}
      <div className="grid gap-2">
        {plan.days.map((d, i) => (
          <button key={d.name} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className={`${pill(idx === i)} text-left`}>
            {d.name}{i === next ? " · próximo da sequência" : ""}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Fica como feito, sem cronômetro e sem cargas, e a sequência avança.</p>
      <Button type="button" onClick={save} className="min-h-11 w-full rounded-full"><Check />Registrar treino</Button>
    </div>
  );
}

/** Cardio done that day: kind, time and minutes; it joins the Strava activity if one arrives for it. */
function CardioForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [, setCardio] = useLocal<CardioRecord[]>(cardioKey(date), []);
  const [kind, setKind] = useState<CardioKind>("caminhada");
  const [name, setName] = useState("");
  const [time, setTime] = useState("07:00");
  const [minutes, setMinutes] = useState("30");

  const save = () => {
    const min = Math.round(toNum(minutes));
    if (!(min > 0 && min <= 600)) { toast.error("Informe os minutos"); return; }
    if (kind === "outro" && !name.trim()) { toast.error("Diga qual atividade"); return; }
    const startedAt = new Date(`${date}T${/^\d{2}:\d{2}$/.test(time) ? time : "07:00"}:00`).getTime();
    const record: CardioRecord = { id: uid(), date, kind, ...(kind === "outro" ? { name: name.trim().slice(0, 40) } : {}), startedAt, finishedAt: startedAt + min * 60_000 };
    setCardio((list) => [...list, record]);
    toast.success(`Cardio de ${min} min registrado`);
    onDone();
  };

  return (
    <div className="space-y-2 rounded-2xl bg-muted/40 p-3">
      <div className="grid grid-cols-3 gap-2">
        {CARDIO_KINDS.map((k) => (
          <button key={k.kind} type="button" onClick={() => setKind(k.kind)} aria-pressed={kind === k.kind} className={pill(kind === k.kind)}>{k.label}</button>
        ))}
      </div>
      {kind === "outro" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Natação" aria-label="Qual atividade" className={field} />}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Início
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Duração
          <span className="relative">
            <input type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`${field} pr-12`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">min</span>
          </span>
        </label>
      </div>
      <Button type="button" onClick={save} className="min-h-11 w-full rounded-full"><Check />Registrar cardio</Button>
    </div>
  );
}
