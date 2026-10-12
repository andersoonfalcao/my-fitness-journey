import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Flag, Scale, TrendingDown, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { fmtKg, foodsKey, KEYS, targets, today, useLocal, type FoodEntry, type Profile, type WeightEntry } from "@/lib/store";
import { addDays, lowIntake, readWeight } from "@/lib/insights";

const n = (v: number) => v.toLocaleString("pt-BR");
const fullDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");

/** The weight reading (pace, plateau, goal) with the logs it needs: the weigh-ins and the last two weeks of food. */
export function useWeightReading(profile: Profile) {
  const end = today();
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [thisMonth] = useLocal<FoodEntry[]>(foodsKey(end), []);
  const [prevMonth] = useLocal<FoodEntry[]>(foodsKey(addDays(end, -15)), []);
  const foods = foodsKey(end) === foodsKey(addDays(end, -15)) ? thisMonth : [...prevMonth, ...thisMonth];
  const t = targets(profile);
  return { reading: readWeight(weights, foods, profile.goalWeight, t.kcal < t.tdee, end), foods, t };
}

/** A notice dismissed stays hidden for a week: { kind: date dismissed }. */
const HIDDEN_KEY = "forma.insights.hidden";

/** Hoje: what the weight and food logs are saying that asks for a decision (goal reached, losing too fast, stalled, eating too little). */
export function WeightNotices({ profile }: { profile: Profile }) {
  const [, setProfile] = useLocal<Profile | null>(KEYS.profile, null);
  const [hidden, setHidden] = useLocal<Record<string, string>>(HIDDEN_KEY, {});
  const { reading, foods, t } = useWeightReading(profile);
  const floor = profile.sex === "m" ? 1500 : 1200;
  const low = lowIntake(foods, floor, today());
  const shown = (kind: string) => !(hidden[kind] && hidden[kind]! > addDays(today(), -7));
  const hide = (kind: string) => setHidden((h) => ({ ...h, [kind]: today() }));

  const maintain = () => {
    setProfile((p) => (p ? { ...p, maintain: { goalWeight: p.goalWeight } } : p));
    toast.success(`Metas em manutenção: ${n(t.tdee)} kcal por dia.`);
  };

  const notices: { kind: string; icon: typeof Flag; body: ReactNode }[] = [];
  if (reading.goalReached && t.kcal < t.tdee && shown("meta")) notices.push({ kind: "meta", icon: Flag, body: (
    <>
      <p><b>Você chegou à meta de {fmtKg(profile.goalWeight)} kg.</b> As calorias ainda estão em déficit ({n(t.kcal)} de {n(t.tdee)} kcal).</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={maintain} className="min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Passar para manutenção</button>
        <Link to="/perfil" className="inline-flex min-h-11 items-center rounded-full border border-input px-4 py-2 text-sm font-semibold">Definir meta nova</Link>
      </div>
    </>
  ) });
  if (reading.fast && shown("ritmo")) notices.push({ kind: "ritmo", icon: TrendingDown, body: (
    <p><b>Peso caindo {fmtKg(-reading.fast.rate)} kg por semana</b> nas últimas duas semanas, mais de 1% do seu peso. Para preservar músculo, considere comer cerca de {n(reading.fast.raiseKcal)} kcal a mais por dia.</p>
  ) });
  if (reading.plateau && shown("plato")) {
    const avg = reading.plateau.avgKcal;
    notices.push({ kind: "plato", icon: Scale, body: avg === null ? (
      <p><b>Peso parado há duas semanas.</b> Com menos de 7 dias completos de refeições registradas nesse período, não dá para dizer o motivo.</p>
    ) : avg <= t.kcal * 1.05 ? (
      <p><b>Peso parado há duas semanas</b> com as calorias na meta (média de {n(avg)} kcal). O seu gasto pode ter mudado: <Link to="/perfil" className="font-semibold underline underline-offset-4">veja o gasto calibrado no Perfil</Link>.</p>
    ) : (
      <p><b>Peso parado há duas semanas.</b> A média registrada foi de {n(avg)} kcal, {n(avg - t.kcal)} acima da meta de {n(t.kcal)}.</p>
    ) });
  }
  if (low !== null && shown("pouco")) notices.push({ kind: "pouco", icon: Utensils, body: (
    <p><b>Você comeu pouco nos últimos três dias completos:</b> média de {n(low)} kcal, abaixo do mínimo de {n(floor)}. Vários dias assim custam músculo e energia para treinar.</p>
  ) });

  return (
    <>
      {notices.map(({ kind, icon: Icon, body }) => (
        <section key={kind} className="flex items-start gap-3 rounded-3xl border-2 border-accent bg-accent/10 p-4">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">{body}</div>
          <button type="button" onClick={() => hide(kind)} aria-label="Dispensar por uma semana" className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </section>
      ))}
    </>
  );
}

/** Corpo → Evolução: the current pace and when the goal arrives at it. */
export function WeightPace({ profile }: { profile: Profile }) {
  const { reading } = useWeightReading(profile);
  if (reading.rate === null) return <p className="px-2 text-sm text-muted-foreground sm:px-0">O ritmo aparece com três pesagens em pelo menos uma semana.</p>;
  const steady = Math.abs(reading.rate) < 0.05;
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4">
      <div className="rounded-2xl bg-muted/60 px-3 py-2.5">
        <div className="text-xs font-semibold text-muted-foreground">Ritmo atual</div>
        <div className="whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{steady ? "estável" : `${reading.rate > 0 ? "+" : "−"}${fmtKg(Math.abs(reading.rate))} kg`}</div>
        <div className="text-xs text-muted-foreground">{steady ? "nas últimas três semanas" : "por semana, nas últimas três"}</div>
      </div>
      <div className="rounded-2xl bg-muted/60 px-3 py-2.5">
        <div className="text-xs font-semibold text-muted-foreground">Previsão da meta</div>
        <div className="whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{reading.goalReached ? "atingida" : reading.eta ? fullDate(reading.eta) : "—"}</div>
        <div className="text-xs text-muted-foreground">{reading.goalReached ? `${fmtKg(profile.goalWeight)} kg` : reading.eta ? "se o ritmo se mantiver" : "o peso não está indo em direção à meta"}</div>
      </div>
    </div>
  );
}
