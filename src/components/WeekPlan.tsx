import { useEffect, useRef, useState } from "react";
import { Check, Moon, Pencil, X } from "lucide-react";
import { byId, GROUP_LABEL, type Exercise } from "@/lib/exercises";
import { today, type WorkoutRecord } from "@/lib/store";
import type { Plan } from "@/lib/plan";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Training weekdays (0 = Monday) spread over the week for each number of days per week. */
const DEFAULT_DAYS: Record<number, number[]> = {
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};
export const defaultTrainingDays = (days: number) => DEFAULT_DAYS[Math.min(7, Math.max(1, days))]!;

/** Muscles worked by these exercises in order, e.g. "Costas, Trapézio, Bíceps e Antebraço". */
export function musclesOf(exIds: string[]) {
  // Records may keep exercises that have since left the library; those are skipped.
  const names = [...new Set(exIds.flatMap((id) => {
    const ex = byId(id) as Exercise | undefined;
    return ex ? [GROUP_LABEL[ex.group]] : [];
  }))];
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}` : names[0] ?? "";
}

/** Muscle names one by one, for the day cards. */
const muscleList = (exIds: string[]) => [...new Set(exIds.flatMap((id) => {
  const ex = byId(id) as Exercise | undefined;
  return ex ? [GROUP_LABEL[ex.group]] : [];
}))];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Cell =
  | { kind: "done"; records: WorkoutRecord[] }
  | { kind: "cardio"; names: string[] }
  | { kind: "missed" }
  | { kind: "planned"; idx: number }
  | { kind: "rest" };

/**
 * This week, Monday to Sunday. Past days show what was really trained; today and the training days ahead take
 * the sequence from the next workout, so a skipped day just pushes the sequence to the next training day.
 */
function weekCells(plan: Plan, history: WorkoutRecord[], nextIdx: number, trainingDays: number[], cardio: Record<string, string[]>) {
  const now = today();
  const monday = new Date(`${now}T12:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  let seq = nextIdx;
  return Array.from({ length: 7 }, (_, w) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + w);
    const date = iso(d);
    const done = history.filter((r) => r.date === date);
    const training = trainingDays.includes(w);
    let cell: Cell;
    if (done.length) cell = { kind: "done", records: done };
    // A day with only cardio is a training day too. Today keeps showing the gym workout while it can still be done.
    else if (cardio[date]?.length && (date < now || !training)) cell = { kind: "cardio", names: cardio[date] };
    else if (date < now) cell = training ? { kind: "missed" } : { kind: "rest" };
    else if (training) {
      cell = { kind: "planned", idx: seq };
      seq = (seq + 1) % plan.days.length;
    } else cell = { kind: "rest" };
    return { date, w, dateText: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, today: date === now, training, cell };
  });
}

export function WeekPlan({ plan, history, cardio = {}, nextIdx, trainingDays, activeIdx, todaySelected = false, onSelect, onOpenDone, onChangeDays, profileDays }: {
  plan: Plan;
  /** Cardio done on each date, by name (src/lib/cardio.ts). */
  cardio?: Record<string, string[]>;
  history: WorkoutRecord[];
  nextIdx: number;
  trainingDays: number[];
  activeIdx: number;
  /** The workout finished today is the one on screen: its card is the highlighted one. */
  todaySelected?: boolean;
  onSelect: (idx: number) => void;
  onOpenDone: (records: WorkoutRecord[]) => void;
  onChangeDays: (days: number[]) => void;
  profileDays: number;
}) {
  const [editing, setEditing] = useState(false);
  const cells = weekCells(plan, history, nextIdx, trainingDays, cardio);
  const strip = useRef<HTMLOListElement>(null);

  // Open the strip on today's card (scrollLeft only, so the page itself does not jump).
  useEffect(() => {
    const ol = strip.current;
    const todayCard = ol?.querySelector<HTMLElement>("[data-today]");
    if (ol && todayCard && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = todayCard.offsetLeft - 8;
  }, []);

  const toggle = (w: number) => {
    const next = trainingDays.includes(w) ? trainingDays.filter((x) => x !== w) : [...trainingDays, w].sort();
    if (next.length) onChangeDays(next);
  };

  return (
    <section className="-mx-2 rounded-3xl border border-border bg-card px-1.5 py-3 sm:mx-0 sm:p-4">
      <div className="flex items-center justify-between gap-2 px-2">
        <div>
          <h2 className="font-display text-lg font-bold">Sua semana</h2>
          <p className="text-xs text-muted-foreground">{cells[0]!.dateText} a {cells[6]!.dateText}</p>
        </div>
        <button type="button" onClick={() => setEditing((e) => !e)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${editing ? "bg-primary text-primary-foreground" : "border border-input"}`}>
          {editing ? <><Check className="h-4 w-4" />Pronto</> : <><Pencil className="h-4 w-4" />Dias de treino</>}
        </button>
      </div>
      {editing && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          Toque nos dias para alternar entre treino e descanso. {trainingDays.length} dia(s) de treino
          {trainingDays.length !== profileDays && ` (seu perfil diz ${profileDays})`}.
        </p>
      )}
      {/* Phone: one big card per day in a row that slides sideways, starting at today. Wider screens: the whole week. */}
      <ol ref={strip} className="relative mt-3 flex snap-x snap-mandatory scroll-px-2 gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-7 sm:gap-1 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {cells.map((c) => {
          const { cell } = c;
          const selected = !editing && cell.kind === "planned" && cell.idx === activeIdx;
          const exIds = cell.kind === "done" ? cell.records.flatMap((r) => r.exercises.map((e) => e.exId))
            : cell.kind === "planned" ? plan.days[cell.idx]!.items.map((it) => it.exId) : [];
          const muscles = muscleList(exIds);
          const dayName = cell.kind === "done" ? cell.records.map((r) => r.dayName).join(" + ") : cell.kind === "planned" ? plan.days[cell.idx]!.name : "";
          const tone = editing
            ? c.training ? "border-primary bg-primary/10" : "border-dashed border-border"
            : cell.kind === "done" && c.today && todaySelected ? "border-[#3f9d6b] bg-[#3f9d6b]/10 ring-2 ring-[#3f9d6b] ring-offset-2 ring-offset-card"
            : cell.kind === "done" || cell.kind === "cardio" ? "border-[#3f9d6b] bg-[#3f9d6b]/10"
            : cell.kind === "missed" ? "border-border bg-muted/50"
            : cell.kind === "planned" ? selected ? "border-primary bg-primary text-primary-foreground" : c.today ? "border-accent bg-accent/10" : "border-border bg-card"
            : "border-transparent bg-muted/40";
          const label = editing ? `${WEEKDAYS[c.w]}: ${c.training ? "treino" : "descanso"}`
            : cell.kind === "done" ? `${WEEKDAYS[c.w]} ${c.dateText}: concluído, ${musclesOf(exIds)}. Toque para conferir`
            : cell.kind === "cardio" ? `${WEEKDAYS[c.w]} ${c.dateText}: cardio concluído, ${cell.names.join(", ")}`
            : cell.kind === "missed" ? `${WEEKDAYS[c.w]} ${c.dateText}: sem treino`
            : cell.kind === "planned" ? `${WEEKDAYS[c.w]} ${c.dateText}: ${musclesOf(exIds)}${c.today ? ", hoje" : ""}`
            : `${WEEKDAYS[c.w]} ${c.dateText}: descanso`;
          const onClick = editing ? () => toggle(c.w)
            : cell.kind === "planned" ? () => onSelect(cell.idx)
            : cell.kind === "done" ? () => onOpenDone(cell.records)
            : undefined;
          const body = (
            <>
              <span className="flex w-full items-baseline justify-between gap-1">
                <span className={`text-xs font-bold uppercase tracking-wide ${c.today && !selected ? "text-accent" : "opacity-70"}`}>{c.today ? "Hoje" : WEEKDAYS[c.w]}</span>
                <span className="text-xs tabular-nums opacity-70">{c.dateText}</span>
              </span>
              <span className="mt-2 flex w-full flex-1 flex-col items-start gap-1">
                {editing ? <span className="font-display text-lg font-extrabold">{c.training ? "Treino" : "Descanso"}</span>
                  : cell.kind === "done" || cell.kind === "planned" ? (
                    <>
                      <span className="flex items-center gap-1 font-display text-base font-extrabold leading-tight">
                        {cell.kind === "done" && <Check className="h-4 w-4 shrink-0 text-[#3f9d6b]" aria-hidden />}{dayName}
                      </span>
                      {muscles.map((m) => <span key={m} className="block text-xs font-semibold leading-tight opacity-80">{m}</span>)}
                    </>
                  )
                  : cell.kind === "cardio" ? (
                    <>
                      <span className="flex items-center gap-1 font-display text-base font-extrabold leading-tight"><Check className="h-4 w-4 shrink-0 text-[#3f9d6b]" aria-hidden />Cardio</span>
                      {[...new Set(cell.names)].map((n) => <span key={n} className="block text-xs font-semibold leading-tight opacity-80">{n}</span>)}
                    </>
                  )
                  : cell.kind === "missed" ? <span className="flex items-center gap-1 text-sm font-bold text-muted-foreground"><X className="h-4 w-4" />Sem treino</span>
                  : <span className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"><Moon className="h-4 w-4" />Descanso</span>}
              </span>
            </>
          );
          const cls = `flex h-full min-h-[10.5rem] w-full flex-col rounded-2xl border-2 p-3 text-left ${tone}`;
          return (
            <li key={c.date} data-today={c.today || undefined} className="w-[8.75rem] shrink-0 snap-start sm:w-auto">
              {onClick ? (
                <button type="button" onClick={onClick} aria-pressed={editing ? c.training : selected || undefined} aria-label={label} className={cls}>{body}</button>
              ) : (
                <div aria-label={label} className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
