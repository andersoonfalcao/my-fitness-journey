import { useState } from "react";
import { CalendarCheck, Check, ChevronDown, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { closeDay } from "@/lib/day-close";
import { km, sportLabel, stravaKey, type StravaActivity } from "@/lib/strava";
import {
  daysKey,
  foodsKey,
  KEYS,
  targets,
  useLocal,
  waterKey,
  type DayRecord,
  type FoodEntry,
  type Profile,
  type WaterLog,
  type WeightEntry,
  type WorkoutRecord,
} from "@/lib/store";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const prevMonth = (date: string) => {
  const d = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

/** "Close the day": checklist of today's records, an AI review saved to the account, and past reviews. */
export function DayClose({ profile, date }: { profile: Profile; date: string }) {
  const uid = useAuth().user?.uid;
  const [foods] = useLocal<FoodEntry[]>(foodsKey(date), []);
  const [water] = useLocal<WaterLog>(waterKey(date), {});
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [history] = useLocal<WorkoutRecord[]>(KEYS.history, []);
  const [days, setDays] = useLocal<DayRecord[]>(daysKey(date), []);
  const [earlier] = useLocal<DayRecord[]>(daysKey(prevMonth(date)), []);
  const [stravaMonth] = useLocal<StravaActivity[]>(stravaKey(date), []);
  const stravaToday = stravaMonth.filter((a) => a.date === date);
  const [busy, setBusy] = useState(false);

  const t = targets(profile);
  const eaten = foods.filter((f) => f.date === date);
  const kcal = Math.round(eaten.reduce((s, f) => s + f.kcal, 0));
  const protein = Math.round(eaten.reduce((s, f) => s + f.p, 0));
  const waterMl = water[date] ?? 0;
  const trained = history.some((r) => r.date === date);
  const weighed = weights.some((w) => w.date === date);
  const closed = days.find((d) => d.date === date);
  const past = [...days, ...earlier].filter((d) => d.date !== date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  const close = async () => {
    if (!uid) return;
    setBusy(true);
    try {
      const record = await closeDay({ uid, date, profile, weights, history });
      setDays((list) => [...list.filter((d) => d.date !== date), record]);
      toast.success(closed ? "Resumo do dia atualizado" : "Dia fechado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar o dia.");
    } finally {
      setBusy(false);
    }
  };

  const checks: [string, boolean, string][] = [
    ["Refeições", eaten.length > 0, eaten.length ? `${kcal} de ${t.kcal} kcal · proteína ${protein}/${t.protein} g` : "nada registrado"],
    ["Água", waterMl >= t.waterMl * 0.8, `${num(waterMl / 1000)} de ${num(t.waterMl / 1000)} L`],
    ["Treino", trained, trained ? "concluído" : "sem treino concluído hoje"],
    ["Peso", weighed, weighed ? `${num(weights.find((w) => w.date === date)!.kg)} kg` : "não registrado hoje (opcional)"],
  ];
  if (stravaToday.length) {
    const kcalOut = stravaToday.reduce((s, a) => s + (a.kcal ?? 0), 0);
    checks.push(["Strava", true, `${stravaToday.map((a) => `${sportLabel(a.sport)}${a.distanceM ? ` ${km(a.distanceM)} km` : ""}`).join(", ")}${kcalOut ? ` · ${kcalOut} kcal gastas` : ""}`]);
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-accent" />
          <h2 className="text-2xl font-bold">{closed ? "Dia fechado" : "Fechar o dia"}</h2>
        </div>
        <Button type="button" onClick={() => void close()} disabled={busy} variant={closed ? "outline" : "default"} className="rounded-full">
          {busy ? <Loader2 className="animate-spin" /> : closed ? <RefreshCw /> : <Sparkles />}
          {busy ? "Analisando o dia…" : closed ? "Gerar de novo" : "Fechar o dia"}
        </Button>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {checks.map(([label, ok, detail]) => (
          <li key={label} className="flex items-center gap-2.5 rounded-2xl bg-muted/60 px-3 py-2 text-sm">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? "bg-accent text-accent-foreground" : "bg-border text-muted-foreground"}`}>
              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0"><b>{label}:</b> <span className="text-muted-foreground">{detail}</span></span>
          </li>
        ))}
      </ul>

      {!closed && <p className="text-sm text-muted-foreground">Depois do treino e da última refeição, feche o dia para receber a análise da IA. Você pode gerar de novo se registrar algo depois.</p>}
      {closed && <DaySummary record={closed} />}

      {past.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="font-bold">Dias anteriores</h3>
          <div className="mt-2 space-y-2">
            {past.map((d) => (
              <details key={d.date} className="group rounded-2xl border border-border px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold capitalize">{longDate(d.date)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {d.day.kcal} kcal · {num(d.day.waterMl / 1000)} L de água · {d.day.workout ? d.day.workout.name : "sem treino"}
                    </span>
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3"><DaySummary record={d} /></div>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DaySummary({ record }: { record: DayRecord }) {
  const { day, sinceStart: s, ai } = record;
  const weightChange = s.weightNow - s.weightStart;
  const stats: [string, string][] = [
    ["Calorias", `${day.kcal} / ${day.targets.kcal}`],
    ["Proteína", `${day.protein} / ${day.targets.protein} g`],
    ["Água", `${num(day.waterMl / 1000)} / ${num(day.targets.waterMl / 1000)} L`],
    ["Treino", day.workout ? `${day.workout.setsDone}/${day.workout.setsPlanned} séries${day.workout.volumeKg ? ` · ${num(day.workout.volumeKg)} kg` : ""}` : "—"],
  ];
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
      <p className="leading-relaxed">{ai.overview}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Bullets title="Indo bem" items={ai.goingWell} tone="good" />
        <Bullets title="Precisa melhorar" items={ai.improve} tone="improve" />
      </div>
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <h4 className="font-bold">Desde o início</h4>
        <p className="mt-0.5 text-xs opacity-75">
          {s.days} dia(s) de acompanhamento · peso {num(s.weightStart)} → {num(s.weightNow)} kg ({weightChange >= 0 ? "+" : ""}{num(weightChange)}) · meta {num(s.weightGoal)} kg · {s.workouts} treino(s) · {s.daysLogged} dia(s) com refeições
        </p>
        <p className="mt-2 text-sm leading-relaxed">{ai.sinceStart}</p>
      </div>
      <p className="text-sm"><b>Foco para amanhã:</b> {ai.tomorrow}</p>
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
