import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, Check, ChevronRight, Loader2, RefreshCw, Share2, Sparkles, X } from "lucide-react";
import { ShareDialog, type ShareRequest } from "@/components/ShareDialog";
import { dayCard } from "@/lib/share-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { closeDay } from "@/lib/day-close";
import { km, sportLabel, stravaKey, type StravaActivity } from "@/lib/strava";
import { cardioByDate, cardioKey, type CardioRecord } from "@/lib/cardio";
import { SUPPLEMENTS_KEY, type Supplement } from "@/lib/supplements";
import { sleepLabel } from "@/lib/health";
import {
  daysKey,
  foodsKey,
  KEYS,
  targets,
  useHistory,
  useLocal,
  waterKey,
  type DayRecord,
  type FoodEntry,
  type Profile,
  type WaterLog,
  type WeightEntry,
  type WorkoutRecord,
  fmtKg,
} from "@/lib/store";

const MEAL_NAMES = [["cafe", "café da manhã"], ["almoco", "almoço"], ["lanche", "lanche"], ["jantar", "jantar"]] as const;
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** "Close the day": checklist of today's records and an AI review saved to the account (past days live in the Calendário). */
export function DayClose({ profile, date }: { profile: Profile; date: string }) {
  const uid = useAuth().user?.uid;
  const [foods] = useLocal<FoodEntry[]>(foodsKey(date), []);
  const [water] = useLocal<WaterLog>(waterKey(date), {});
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [history] = useHistory();
  const [days, setDays] = useLocal<DayRecord[]>(daysKey(date), []);
  const [stravaMonth] = useLocal<StravaActivity[]>(stravaKey(date), []);
  const [routine] = useLocal<Supplement[]>(SUPPLEMENTS_KEY, []);
  const stravaToday = stravaMonth.filter((a) => a.date === date);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<ShareRequest | null>(null);

  const t = targets(profile);
  const eaten = foods.filter((f) => f.date === date);
  const meals = eaten.filter((f) => f.meal !== "suplementos");
  const missingMeals = MEAL_NAMES.filter(([m]) => !meals.some((f) => f.meal === m)).map(([, label]) => label);
  const supplementsTaken = new Set(eaten.map((f) => f.suppId).filter(Boolean));
  const supplementsDone = routine.filter((s) => supplementsTaken.has(s.id)).length;
  const kcal = Math.round(eaten.reduce((s, f) => s + f.kcal, 0));
  const protein = Math.round(eaten.reduce((s, f) => s + f.p, 0));
  const waterMl = water[date] ?? 0;
  const [waitingCardio] = useLocal<CardioRecord[]>(cardioKey(date), []);
  // A day with only cardio is a training day too.
  const cardioDone = cardioByDate(stravaMonth, waitingCardio)[date] ?? [];
  const lifted = history.some((r) => r.date === date);
  const trained = lifted || cardioDone.length > 0;
  const weighed = weights.some((w) => w.date === date);
  const closed = days.find((d) => d.date === date);

  const close = async () => {
    if (!uid) return;
    setBusy(true);
    try {
      const record = await closeDay({ uid, date, profile, weights, history });
      setDays((list) => [...list.filter((d) => d.date !== date), record]);
      toast.success(closed ? "Resumo do dia atualizado" : "Dia fechado!");
      if (!closed) setShare(dayShare(record));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar o dia.");
    } finally {
      setBusy(false);
    }
  };

  // Each item opens its section: where to fill it in while missing, where to see it once done.
  type Target = { to: "/alimentacao" | "/treinos" | "/corpo"; hash?: string; history?: true; evolution?: true };
  const checks: [string, boolean, string, Target][] = [
    // Complete only with all four meals logged, and the water target fully reached.
    ["Refeições", missingMeals.length === 0, meals.length ? `${kcal} de ${t.kcal} kcal · proteína ${protein}/${t.protein} g${missingMeals.length ? ` · falta: ${missingMeals.join(", ")}` : ""}` : "nada registrado", { to: "/alimentacao", hash: missingMeals.length ? "registrar" : "refeicoes" }],
    ["Água", waterMl >= t.waterMl, `${num(waterMl / 1000)} de ${num(t.waterMl / 1000)} L`, { to: "/alimentacao", hash: "agua" }],
    ["Treino", trained, lifted ? "concluído" : trained ? `cardio concluído: ${[...new Set(cardioDone)].join(", ")}` : "sem treino concluído hoje", trained ? { to: "/treinos", history: true } : { to: "/treinos" }],
    ["Peso", weighed, weighed ? `${fmtKg(weights.find((w) => w.date === date)!.kg)} kg` : "não registrado (opcional)", weighed ? { to: "/corpo", hash: "evolucao", evolution: true } : { to: "/corpo", hash: "pesagem" }],
  ];
  if (routine.length) {
    const pendingNames = routine.filter((s) => !supplementsTaken.has(s.id)).map((s) => s.name);
    checks.push(["Suplementos", supplementsDone === routine.length, `${supplementsDone} de ${routine.length} tomados${pendingNames.length ? ` · falta: ${pendingNames.join(", ")}` : ` (${routine.map((s) => s.name).join(", ")})`}`, { to: "/alimentacao", hash: "suplementos" }]);
  }
  if (stravaToday.length) {
    const kcalOut = stravaToday.reduce((s, a) => s + (a.kcal ?? 0), 0);
    checks.push(["Strava", true, `${stravaToday.map((a) => `${sportLabel(a.sport)}${a.distanceM ? ` ${km(a.distanceM)} km` : ""}`).join(", ")}${kcalOut ? ` · ${kcalOut} kcal gastas` : ""}`, { to: "/treinos", hash: "strava", history: true }]);
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-accent" />
          <h2 className="text-2xl font-bold">{closed ? "Dia fechado" : "Fechar o dia"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {closed && !busy && (
            <Button type="button" onClick={() => setShare(dayShare(closed))} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Share2 />Compartilhar
            </Button>
          )}
          <Button type="button" onClick={() => void close()} disabled={busy} variant={closed ? "outline" : "default"} className="rounded-full">
            {busy ? <Loader2 className="animate-spin" /> : closed ? <RefreshCw /> : <Sparkles />}
            {busy ? "Analisando o dia…" : closed ? "Gerar de novo" : "Fechar o dia"}
          </Button>
        </div>
      </div>
      <ShareDialog request={share} onClose={() => setShare(null)} />

      <ul className="grid gap-2 sm:grid-cols-2">
        {checks.map(([label, ok, detail, target]) => (
          <li key={label}>
            <Link to={target.to} {...(target.hash ? { hash: target.hash } : {})} {...(target.history ? { search: { aba: "historico" as const } } : target.evolution ? { search: { aba: "evolucao" as const } } : {})} aria-label={`${label}: ${detail}. ${ok ? "Ver" : "Preencher"}`}
              className="flex items-center gap-2.5 rounded-2xl bg-muted/60 px-3 py-2 text-sm transition-colors hover:bg-muted active:bg-muted">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? "bg-accent text-accent-foreground" : "bg-border text-muted-foreground"}`}>
                {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1 leading-tight"><b className="block">{label}</b><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></span>
              <span className={`shrink-0 text-xs font-semibold ${ok ? "text-muted-foreground" : "text-accent"}`}>{ok ? "ver" : "preencher"}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {!closed && <p className="text-sm text-muted-foreground">Depois do treino e da última refeição, feche o dia para receber a análise da IA. Você pode gerar de novo se registrar algo depois.</p>}
      {closed && <DaySummary record={closed} />}

    </section>
  );
}

export const dayShare = (record: DayRecord): ShareRequest => ({
  heading: "Seu dia em uma imagem",
  title: "Meu dia no forma.",
  fileName: `forma-dia-${record.date}.png`,
  make: (bg) => dayCard(record, bg),
});

export function DaySummary({ record, onShare }: { record: DayRecord; onShare?: () => void }) {
  const { day, sinceStart: s, ai } = record;
  const weightChange = s.weightNow - s.weightStart;
  const stats: [string, string][] = [
    ["Calorias", `${day.kcal} / ${day.targets.kcal}`],
    ["Proteína", `${day.protein} / ${day.targets.protein} g`],
    ["Água", `${num(day.waterMl / 1000)} / ${num(day.targets.waterMl / 1000)} L`],
    ["Treino", day.workout ? `${day.workout.setsDone}/${day.workout.setsPlanned} séries${day.workout.volumeKg ? ` · ${num(day.workout.volumeKg)} kg` : ""}` : "—"],
  ];
  const supplements = day.supplements ?? [];
  const dailySupplements = supplements.filter((s) => s.daily);
  if (dailySupplements.length) stats.push(["Suplementos", `${dailySupplements.filter((s) => s.taken).length} / ${dailySupplements.length} da rotina`]);
  if (day.health?.sleepMin != null) stats.push(["Sono", sleepLabel(day.health.sleepMin)]);
  if (day.health?.steps != null) stats.push(["Passos", day.health.steps.toLocaleString("pt-BR")]);
  if (day.strava?.length) {
    const kcalOut = day.strava.reduce((s, a) => s + (a.kcal ?? 0), 0);
    stats.push(["Strava", `${day.strava.map((a) => a.sport).join(", ")}${kcalOut ? ` · ${kcalOut} kcal` : ""}`]);
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-muted/60 px-3 py-2">
            <div className="font-display text-base font-bold leading-tight tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      {supplements.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Suplementos do dia">
          {supplements.map((s) => (
            <li key={s.name} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.taken ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground line-through"}`}>
              {s.taken ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{s.name} · {s.dose}
            </li>
          ))}
        </ul>
      )}
      <p className="leading-relaxed">{ai.overview}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Bullets title="Indo bem" items={ai.goingWell} tone="good" />
        <Bullets title="Precisa melhorar" items={ai.improve} tone="improve" />
      </div>
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <h4 className="font-bold">Desde o início</h4>
        <p className="mt-0.5 text-xs opacity-75">
          {s.days} dia(s) de acompanhamento · peso {fmtKg(s.weightStart)} → {fmtKg(s.weightNow)} kg ({weightChange >= 0 ? "+" : ""}{fmtKg(weightChange)}) · meta {fmtKg(s.weightGoal)} kg · {s.workouts} treino(s) · {s.daysLogged} dia(s) com refeições
        </p>
        <p className="mt-2 text-sm leading-relaxed">{ai.sinceStart}</p>
      </div>
      <p className="text-sm"><b>Foco para amanhã:</b> {ai.tomorrow}</p>
      {onShare && (
        <button type="button" onClick={onShare} className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><Share2 className="h-4 w-4" />Compartilhar este dia</button>
      )}
    </div>
  );
}

function Bullets({ title, items, tone }: { title: string; items: string[]; tone: "good" | "improve" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === "good" ? "bg-secondary" : "bg-accent/10"}`}>
      <h4 className="font-bold">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
