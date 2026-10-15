import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Trophy, X } from "lucide-react";
import { NeedProfile, useCloseCalendar } from "@/components/AppShell";
import { ShareDialog, type ShareRequest } from "@/components/ShareDialog";
import { cardioAsActivity, cardioKey, type CardioRecord } from "@/lib/cardio";
import { healthKey, sleepLabel, type HealthMonth } from "@/lib/health";
import { defaultMonth, monthName, monthReview, monthShort, shiftMonth } from "@/lib/month";
import { monthCard } from "@/lib/share-card";
import { fmtKg, foodsKey, KEYS, targets, today, useHistory, useLocal, waterKey, type FoodEntry, type Profile, type WaterLog, type WeightEntry } from "@/lib/store";
import { stravaKey, type StravaActivity } from "@/lib/strava";

export const Route = createFileRoute("/mes")({
  head: () => ({
    meta: [
      { title: "Retrospectiva do mês — forma" },
      { name: "description", content: "O mês comparado com o anterior: treinos, peso total levantado, recordes, peso e alimentação." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { m?: string } =>
    typeof search["m"] === "string" && /^\d{4}-\d{2}$/.test(search["m"]) ? { m: search["m"] } : {},
  component: MonthPage,
});

const n = (v: number) => v.toLocaleString("pt-BR");
const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Both months' documents (the one shown and the one before, for the comparison). */
function useTwo<T>(keyOf: (date: string) => string, month: string, fallback: T, merge: (a: T, b: T) => T) {
  const [a] = useLocal<T>(keyOf(`${shiftMonth(month, -1)}-01`), fallback);
  const [b] = useLocal<T>(keyOf(`${month}-01`), fallback);
  return merge(a, b);
}

function MonthPage() {
  const close = useCloseCalendar();
  const navigate = Route.useNavigate();
  const now = today();
  const month = Route.useSearch().m ?? defaultMonth(now);
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [history] = useHistory();
  const foods = useTwo<FoodEntry[]>(foodsKey, month, [], (a, b) => [...a, ...b]);
  const water = useTwo<WaterLog>(waterKey, month, {}, (a, b) => ({ ...a, ...b }));
  const synced = useTwo<StravaActivity[]>(stravaKey, month, [], (a, b) => [...a, ...b]);
  const waiting = useTwo<CardioRecord[]>(cardioKey, month, [], (a, b) => [...a, ...b]);
  const health = useTwo<HealthMonth>(healthKey, month, {}, (a, b) => ({ ...a, ...b }));
  const [share, setShare] = useState<ShareRequest | null>(null);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;
  const t = targets(profile);
  const inputs = { foods, water, weights, history, strava: [...synced, ...waiting.map(cardioAsActivity)], health, targets: { kcal: t.kcal, waterMl: t.waterMl } };
  const r = monthReview(month, now, inputs, weights, history, profile.days);
  const s = r.stats;
  const b = r.before;
  const current = month >= now.slice(0, 7);
  const go = (k: number) => void navigate({ search: { m: shiftMonth(month, k) }, replace: true });
  const diff = (v: number | null, p: number | null, fmt: (x: number) => string) =>
    v === null || p === null || p === 0 ? null : v === p ? "igual" : `${v > p ? "+" : "−"}${fmt(Math.abs(v - p))}`;
  const volumePct = s.volumeKg && b.volumeKg ? Math.round(((s.volumeKg - b.volumeKg) / b.volumeKg) * 100) : null;
  const prevName = monthShort(shiftMonth(month, -1));
  const change = r.weight ? r.weight.to - r.weight.from : null;
  const tiles = [
    { label: "Peso médio", value: change === null ? "—" : `${change <= 0 ? "−" : "+"}${fmtKg(Math.abs(change))} kg`, sub: r.weight ? `${fmtKg(r.weight.from)} → ${fmtKg(r.weight.to)} kg` : "poucas pesagens no mês" },
    { label: "Dias na meta", value: `${s.kcalOnTarget} de ${s.days}`, sub: `calorias · ${s.loggedDays} com registro` },
    { label: "Proteína", value: s.proteinAvg === null ? "—" : `${n(s.proteinAvg)} g`, sub: `por dia, meta ${n(t.protein)}` },
    { label: "Passos", value: s.stepsAvg === null ? "—" : n(s.stepsAvg), sub: diff(s.stepsAvg, b.stepsAvg, n) ? `por dia · ${diff(s.stepsAvg, b.stepsAvg, n)} sobre ${prevName}` : "por dia" },
    { label: "Sono médio", value: s.sleepAvg === null ? "—" : sleepLabel(s.sleepAvg), sub: "por noite" },
    { label: "Cardio", value: s.cardioCount ? `${n(s.cardioMinutes)} min` : "—", sub: s.cardioCount ? `${s.cardioCount} atividade${s.cardioCount === 1 ? "" : "s"}${s.stravaKm ? ` · ${n(s.stravaKm)} km` : ""}` : "nenhuma no mês" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">{r.inProgress ? `Seu mês, até ${short(r.end)}` : "Seu mês"}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{monthName(month)}</h1>
        </div>
        <button type="button" onClick={close} aria-label="Fechar a retrospectiva" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-full bg-muted p-1">
        <button type="button" onClick={() => go(-1)} aria-label="Mês anterior" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card"><ChevronLeft className="h-5 w-5" /></button>
        <span className="font-display font-bold capitalize">{monthShort(month)}</span>
        <button type="button" onClick={() => go(1)} disabled={current} aria-label="Próximo mês" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <section className="rounded-3xl bg-primary p-6 text-primary-foreground">
        <p className="text-sm opacity-80">{s.volumeKg ? "Peso total levantado" : "Treinos no mês"}</p>
        <p className="font-display text-5xl font-extrabold tabular-nums leading-tight">{s.volumeKg ? `${n(s.volumeKg)} kg` : s.workouts}</p>
        <p className="mt-1 text-sm opacity-80">
          {volumePct !== null && `${volumePct >= 0 ? "+" : "−"}${Math.abs(volumePct)}% sobre ${prevName}${r.inProgress ? " (mesmos dias)" : ""} · `}
          {s.workouts} treino{s.workouts === 1 ? "" : "s"}{r.planned ? ` de ${r.planned} planejados` : ""}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-2xl bg-muted/60 px-3 py-2.5">
            <div className="text-xs font-semibold text-muted-foreground">{x.label}</div>
            <div className="mt-0.5 whitespace-nowrap font-display text-xl font-extrabold tabular-nums">{x.value}</div>
            <div className="text-xs tabular-nums text-muted-foreground">{x.sub}</div>
          </div>
        ))}
      </div>

      <section className="space-y-2 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-[#2f7d54] dark:text-[#6cc495]" aria-hidden /><h2 className="text-xl font-bold">{r.records.length ? `${r.records.length} recorde${r.records.length === 1 ? "" : "s"} no mês` : "Recordes"}</h2></div>
        {r.records.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum recorde de carga neste mês.</p>
        ) : (
          <ul className="space-y-2">
            {r.records.slice(0, 6).map((pr) => (
              <li key={pr.exId} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                <span className="min-w-0 font-semibold">{pr.name}</span>
                <span className="shrink-0 tabular-nums">{pr.kind === "carga" ? `${fmtKg(pr.kg).replace(",00", "")} kg` : `${fmtKg(pr.kg).replace(",00", "")} kg × ${pr.reps}`}</span>
              </li>
            ))}
          </ul>
        )}
        {r.records.length > 6 && <p className="text-xs text-muted-foreground">e mais {r.records.length - 6}</p>}
        {r.best && <p className="text-xs text-muted-foreground">Treino mais pesado: {short(r.best.date)}, {r.best.name}, {n(r.best.kg)} kg.</p>}
      </section>

      {(s.workouts > 0 || s.loggedDays > 0) && (
        <button type="button" onClick={() => setShare({ heading: "Compartilhar o mês", title: `Meu mês no forma: ${monthName(month)}`, fileName: `forma-${month}.png`, make: (bg) => monthCard(r, bg) })}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
          <Share2 className="h-5 w-5" />Compartilhar imagem
        </button>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {r.inProgress ? `Comparado com os mesmos dias de ${prevName}. ` : ""}Chega no dia 1º às 20:00, com notificação (Configurações → Retrospectiva do mês).
      </p>
      <ShareDialog request={share} onClose={() => setShare(null)} />
    </div>
  );
}
