import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useCloseCalendar, NeedProfile } from "@/components/AppShell";
import { fmtKg, foodsKey, KEYS, targets, today, useHistory, useLocal, waterKey, type FoodEntry, type Profile, type WaterLog, type WeightEntry } from "@/lib/store";
import { stravaKey, type StravaActivity } from "@/lib/strava";
import { cardioAsActivity, cardioKey, type CardioRecord } from "@/lib/cardio";
import { healthKey, sleepLabel, type HealthMonth } from "@/lib/health";
import { addDays, weekStart, weekStats, WEEKS_KEY, type WeekReview, type WeekStats } from "@/lib/week";
import { FAST_MODELS, generateJson, Schema } from "@/lib/ai";

export const Route = createFileRoute("/semana")({
  head: () => ({
    meta: [
      { title: "Resumo da semana — forma" },
      { name: "description", content: "A semana comparada com a anterior: peso, alimentação, treinos, sono e passos." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { inicio?: string } =>
    typeof search["inicio"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search["inicio"]) ? { inicio: search["inicio"] } : {},
  component: WeekPage,
});

const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const n = (v: number) => v.toLocaleString("pt-BR");

/** Merges the month documents a two-week span can touch (the same key twice is the same document). */
function useMonths<T>(keyOf: (date: string) => string, dates: string[], fallback: T, merge: (parts: T[]) => T) {
  const [a] = useLocal<T>(keyOf(dates[0]!), fallback);
  const [b] = useLocal<T>(keyOf(dates[1]!), fallback);
  return keyOf(dates[0]!) === keyOf(dates[1]!) ? a : merge([a, b]);
}

function WeekPage() {
  const close = useCloseCalendar();
  const navigate = Route.useNavigate();
  const now = today();
  const start = Route.useSearch().inicio ?? weekStart(now);
  const prevStart = addDays(start, -7);
  const span = [prevStart, addDays(start, 6) < now ? addDays(start, 6) : now];
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [history] = useHistory();
  const foods = useMonths<FoodEntry[]>(foodsKey, span, [], (p) => p.flat());
  const water = useMonths<WaterLog>(waterKey, span, {}, (p) => Object.assign({}, ...p));
  const synced = useMonths<StravaActivity[]>(stravaKey, span, [], (p) => p.flat());
  // Cardio done in the app that Strava hasn't brought yet counts as an activity (once it arrives, it is that activity).
  const waitingCardio = useMonths<CardioRecord[]>(cardioKey, span, [], (p) => p.flat());
  const strava = [...synced, ...waitingCardio.map(cardioAsActivity)];
  const health = useMonths<HealthMonth>(healthKey, span, {}, (p) => Object.assign({}, ...p));
  const [reviews, setReviews] = useLocal<Record<string, WeekReview>>(WEEKS_KEY, {});
  const [busy, setBusy] = useState(false);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;
  const t = targets(profile);
  const inputs = { foods, water, weights, history, strava, health, targets: { kcal: t.kcal, waterMl: t.waterMl } };
  const week = weekStats(start, now, inputs);
  const current = start === weekStart(now);
  // A week in progress is compared with the same days of the week before (Monday to the same weekday).
  const before = weekStats(prevStart, current ? addDays(prevStart, week.days - 1) : now, inputs);
  const review = reviews[start];

  const ask = async () => {
    setBusy(true);
    try {
      const ai = (await generateJson(SYSTEM, SCHEMA, JSON.stringify({
        objetivo: profile.focus, metaCalorias: t.kcal, metaProteina: t.protein, treinosPorSemana: profile.days,
        semana: week, semanaAnterior: before, semanaEmAndamento: current,
      }), { models: FAST_MODELS, timeoutMs: 30_000 })) as Partial<WeekReview["ai"]>;
      setReviews((r) => ({ ...r, [start]: { at: Date.now(), ai: { resumo: String(ai.resumo ?? ""), destaques: (ai.destaques ?? []).map(String), foco: String(ai.foco ?? "") } } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "A IA não respondeu. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const go = (offset: number) => void navigate({ search: { inicio: addDays(start, offset) }, replace: true });
  const better = profile.focus === "perder" ? "down" : profile.focus === "massa" ? "up" : null;
  const metrics = METRICS(better).filter((m) => m.value(week) !== null || m.value(before) !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">{current ? "Esta semana, até hoje" : "Semana"}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Resumo da semana</h1>
        </div>
        <button type="button" onClick={close} aria-label="Fechar o resumo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-full bg-muted p-1">
        <button type="button" onClick={() => go(-7)} aria-label="Semana anterior" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card"><ChevronLeft className="h-5 w-5" /></button>
        <span className="font-display font-bold tabular-nums">{short(week.start)} a {short(addDays(start, 6))}</span>
        <button type="button" onClick={() => go(7)} disabled={current} aria-label="Próxima semana" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        <p className="mb-3 px-1 text-xs text-muted-foreground">
          {current
            ? `Semana em andamento (${week.days} de 7 dias), comparada com os mesmos dias da anterior: ${short(before.start)} a ${short(before.end)}.`
            : `Comparada com ${short(before.start)} a ${short(before.end)}.`}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.map((m) => {
            const v = m.value(week);
            const p = m.value(before);
            const diff = v !== null && p !== null ? v - p : null;
            const good = diff === null || diff === 0 || m.better === null ? null : (diff > 0) === (m.better === "up");
            return (
              <div key={m.label} className="rounded-2xl bg-muted/60 px-3 py-2.5">
                <div className="text-xs font-semibold text-muted-foreground">{m.label}</div>
                <div className="mt-0.5 whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{v === null ? "—" : m.format(v)}</div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  {v === null ? "sem registro nesta semana" : p === null ? "sem dado na anterior" : diff === 0 ? "igual à anterior"
                    : <b className={good === null ? "" : good ? "text-[#3f9d6b]" : "text-destructive"}>{diff! > 0 ? "+" : "−"}{m.format(Math.abs(diff!))}</b>}
                </div>
                {m.sub && v !== null && <div className="text-xs tabular-nums text-muted-foreground">{m.sub(week)}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-primary p-6 text-primary-foreground">
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /><h2 className="text-xl font-bold">Comentário da semana</h2></div>
        {review ? (
          <>
            <p className="leading-relaxed">{review.ai.resumo}</p>
            {review.ai.destaques.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm opacity-90">{review.ai.destaques.map((d) => <li key={d}>{d}</li>)}</ul>}
            <p className="text-sm"><b>Foco para a próxima semana:</b> {review.ai.foco}</p>
          </>
        ) : (
          <p className="text-sm opacity-80">A IA lê os números acima, compara com a semana anterior e sugere um foco.</p>
        )}
        <button type="button" onClick={() => void ask()} disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? "Analisando…" : review ? "Gerar de novo" : "Pedir comentário"}
        </button>
      </section>
    </div>
  );
}

type Metric = { label: string; value: (w: WeekStats) => number | null; format: (v: number) => string; better: "up" | "down" | null; sub?: (w: WeekStats) => string };

const METRICS = (weightBetter: "up" | "down" | null): Metric[] => [
  { label: "Peso médio", value: (w) => w.weightAvg, format: (v) => `${fmtKg(v)} kg`, better: weightBetter },
  { label: "Calorias por dia", value: (w) => w.kcalAvg, format: (v) => `${n(v)} kcal`, better: null, sub: (w) => `${w.kcalOnTarget} na meta` },
  { label: "Proteína por dia", value: (w) => w.proteinAvg, format: (v) => `${n(v)} g`, better: "up" },
  { label: "Dias completos", value: (w) => (w.loggedDays ? w.fullDays : null), format: (v) => `${v}`, better: "up", sub: () => "com as 4 refeições" },
  { label: "Treinos", value: (w) => w.workouts, format: (v) => `${v}`, better: "up", sub: (w) => `${w.workoutMinutes} min` },
  { label: "Carga total", value: (w) => (w.volumeKg ? w.volumeKg : null), format: (v) => `${n(v)} kg`, better: "up" },
  { label: "Água na meta", value: (w) => w.waterDays, format: (v) => `${v} dia${v === 1 ? "" : "s"}`, better: "up" },
  { label: "Sono médio", value: (w) => w.sleepAvg, format: (v) => sleepLabel(Math.round(v)), better: "up" },
  { label: "Passos por dia", value: (w) => w.stepsAvg, format: (v) => n(v), better: "up" },
  { label: "Batimento em repouso", value: (w) => w.restingAvg, format: (v) => `${v} bpm`, better: "down" },
  { label: "Cardio", value: (w) => (w.cardioCount ? w.stravaKm : null), format: (v) => `${n(v)} km`, better: "up", sub: (w) => `${w.cardioCount} atividade${w.cardioCount === 1 ? "" : "s"}` },
];

const SYSTEM = `Você é um treinador e nutricionista brasileiro comentando a semana de um aluno num app de treino e alimentação.
Escreva em português do Brasil, tom próximo, direto e encorajador. Use SOMENTE os números recebidos e compare "semana" com "semanaAnterior".
Números no formato brasileiro (80,45 kg; 2.065 kcal). sleepAvg está em minutos (escreva em horas e minutos). Se semanaEmAndamento for true, lembre que a semana ainda não terminou.
workouts são os treinos da semana: os de musculação concluídos no app mais os dias em que houve só cardio (cardioOnlyDays, já incluídos em workouts; volumeKg e workoutMinutes são só da musculação); stravaCount são as atividades do Strava, e stravaSameAsWorkouts delas são esses mesmos treinos de musculação gravados pela pulseira: nunca some as duas contagens nem trate como treinos a mais.
Se algo não foi registrado, diga isso com naturalidade. Não dê diagnóstico médico nem recomende remédios ou suplementos específicos.
Campos: resumo (2 a 4 frases), destaques (2 a 4 pontos curtos, o que melhorou e o que piorou), foco (1 a 2 frases com uma ação concreta para a próxima semana).`;

const SCHEMA = Schema.object({
  properties: { resumo: Schema.string(), destaques: Schema.array({ items: Schema.string() }), foco: Schema.string() },
});
