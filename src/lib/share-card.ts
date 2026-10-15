// Share images (1080×1350, Instagram feed size) drawn on a canvas with the app's brand.
import { fmtKg, type DayRecord, type WorkoutRecord } from "./store";
import { decodePolyline, duration, km, pace, sportLabel, usesPace, type StravaDetail } from "./strava";
import { recordTotal, repsOfSet } from "./workout-stats";
import { monthName, type MonthReview } from "./month";
// Official "Powered by Strava" mark from Strava's brand guidelines, used unchanged.
import stravaLogo from "@/assets/strava-powered-white.svg";

const W = 1080;
const H = 1350;
const C = { green: "#124830", greenSoft: "#1d5c40", cream: "#fbf6ec", orange: "#ee7b2c", mute: "#a9c4b5", line: "rgba(251,246,236,0.14)" };
const DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';
const BODY = 'Manrope, system-ui, sans-serif';

/** Background choices: the brand green, fitness photos (CC0, see assets/share-bg/FONTES.md), the user's own photo, or none. */
export type Background = { id: string; label: string; kind: "brand" | "photo" | "transparent"; src?: string };
const PHOTOS = import.meta.glob<string>("@/assets/share-bg/*.jpg", { eager: true, import: "default" });
const PHOTO_LABEL: Record<string, string> = { halteres: "Halteres", anilha: "Anilha", box: "Box", pista: "Pista", "pista-noite": "Pista à noite", esteiras: "Esteiras", piscina: "Piscina" };
export const BACKGROUNDS: Background[] = [
  { id: "brand", label: "Verde", kind: "brand" },
  ...Object.keys(PHOTO_LABEL).flatMap((id) => {
    const src = Object.entries(PHOTOS).find(([path]) => path.endsWith(`/${id}.jpg`))?.[1];
    return src ? [{ id, label: PHOTO_LABEL[id]!, kind: "photo" as const, src }] : [];
  }),
  { id: "transparent", label: "Transparente", kind: "transparent" },
];

/** Per-canvas look: tiles go translucent and text gets a soft shadow over photos or a transparent background. */
const looks = new WeakMap<CanvasRenderingContext2D, { tile: string; shadow: boolean; mute: string }>();
const look = (ctx: CanvasRenderingContext2D) => looks.get(ctx) ?? { tile: C.greenSoft, shadow: false, mute: C.mute };

const n = (v: number, digits = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

async function canvas(bg: Background) {
  await Promise.all([
    document.fonts.load(`800 120px ${DISPLAY}`),
    document.fonts.load(`700 40px ${DISPLAY}`),
    document.fonts.load(`600 32px ${BODY}`),
  ]).catch(() => undefined);
  const el = document.createElement("canvas");
  el.width = W;
  el.height = H;
  const ctx = el.getContext("2d")!;
  if (bg.kind === "transparent") {
    looks.set(ctx, { tile: "rgba(10,32,22,0.55)", shadow: true, mute: "#e3ede7" });
    return { el, ctx };
  }
  if (bg.kind === "photo" && bg.src) {
    const img = await loadImage(bg.src).catch(() => null);
    if (img) {
      const scale = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * scale) / 2, (H - img.height * scale) / 2, img.width * scale, img.height * scale);
      // Dark green veil so the numbers read over any photo.
      const veil = ctx.createLinearGradient(0, 0, 0, H);
      veil.addColorStop(0, "rgba(8,28,19,0.72)");
      veil.addColorStop(0.45, "rgba(8,28,19,0.45)");
      veil.addColorStop(1, "rgba(8,28,19,0.8)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, W, H);
      looks.set(ctx, { tile: "rgba(10,32,22,0.62)", shadow: true, mute: "#d5e3da" });
      return { el, ctx };
    }
  }
  // Brand background: green with a soft glow in the corner.
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.1, 40, W * 0.85, H * 0.1, 760);
  glow.addColorStop(0, "rgba(238,123,44,0.28)");
  glow.addColorStop(1, "rgba(238,123,44,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  return { el, ctx };
}

function shade(ctx: CanvasRenderingContext2D) {
  const on = look(ctx).shadow;
  ctx.shadowColor = on ? "rgba(0,0,0,0.45)" : "transparent";
  ctx.shadowBlur = on ? 14 : 0;
}

function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  shade(ctx);
  ctx.font = `800 ${size}px ${DISPLAY}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.cream;
  ctx.fillText("forma", x, y);
  const w = ctx.measureText("forma").width;
  ctx.fillStyle = C.orange;
  ctx.fillText(".", x + w, y);
  ctx.shadowBlur = 0;
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, maxWidth?: number) {
  ctx.font = font;
  ctx.fillStyle = color === C.mute ? look(ctx).mute : color;
  let t = value;
  if (maxWidth) while (ctx.measureText(t).width > maxWidth && t.length > 3) t = `${t.slice(0, -2)}…`;
  shade(ctx);
  ctx.fillText(t, x, y);
  ctx.shadowBlur = 0;
}

/** Stat tile: big value with a small label underneath. */
function tile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, value: string, label: string, accent = false) {
  ctx.fillStyle = accent ? C.orange : look(ctx).tile;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 36);
  ctx.fill();
  text(ctx, value, x + 36, y + h / 2 + 8, `800 64px ${DISPLAY}`, accent ? C.green : C.cream, w - 60);
  text(ctx, label, x + 36, y + h / 2 + 56, `600 30px ${BODY}`, accent ? C.green : C.mute, w - 60);
}

/** Progress bar row: label, "value / target" and a bar. */
function bar(ctx: CanvasRenderingContext2D, y: number, label: string, value: number, target: number, unit: string, color: string, digits = 0) {
  text(ctx, label, 80, y, `700 38px ${DISPLAY}`, C.cream);
  const right = `${n(value, digits)} / ${n(target, digits)} ${unit}`;
  ctx.font = `600 34px ${BODY}`;
  text(ctx, right, W - 80 - ctx.measureText(right).width, y, `600 34px ${BODY}`, C.mute);
  ctx.fillStyle = look(ctx).shadow ? "rgba(10,32,22,0.55)" : C.line;
  ctx.beginPath();
  ctx.roundRect(80, y + 26, W - 160, 22, 11);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(80, y + 26, Math.max(22, (W - 160) * Math.min(1, target ? value / target : 0)), 22, 11);
  ctx.fill();
}

function footer(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.line;
  ctx.fillRect(80, H - 150, W - 160, 2);
  logo(ctx, 80, H - 70, 56);
}

const toBlob = (el: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => el.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem"))), "image/png"));

const clock = (ms: number) => {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
};

/** Image for a finished workout. `previous` is the last time the same workout was done (for the comparison). */
export async function workoutCard(record: WorkoutRecord, previous: WorkoutRecord | undefined, bg: Background): Promise<Blob> {
  const { el, ctx } = await canvas(bg);
  logo(ctx, 80, 150, 88);
  text(ctx, longDate(record.date).toUpperCase(), 80, 250, `700 30px ${BODY}`, C.orange);
  text(ctx, `${record.dayName} concluído`, 80, 340, `800 84px ${DISPLAY}`, C.cream, W - 160);

  const done = record.exercises.reduce((s, e) => s + e.setsDone, 0);
  const planned = record.exercises.reduce((s, e) => s + e.setsPlanned, 0);
  const exercises = record.exercises.filter((e) => e.setsDone > 0).length;
  const reps = record.exercises.reduce((s, e) => s + Array.from({ length: e.setsDone }, (_, j) => repsOfSet(e.setReps, j, e.reps) ?? 0).reduce((a, b) => a + b, 0), 0);
  const heaviest = Math.max(0, ...record.exercises.flatMap((e) => (e.setKgs ?? []).map((v) => v ?? 0)));
  const volume = recordTotal(record);
  const before = recordTotal(previous);
  const diff = volume > 0 && before > 0 ? volume - before : null;
  const half = (W - 160 - 30) / 2;
  const right = 80 + half + 30;
  tile(ctx, 80, 400, half, 220, record.durationMs !== undefined ? clock(record.durationMs) : "—", "tempo de treino");
  tile(ctx, right, 400, half, 220, `${done}/${planned}`, "séries feitas");
  tile(ctx, 80, 650, half, 220, volume ? `${n(volume)} kg` : "—", "volume (kg × reps)");
  tile(ctx, right, 650, half, 220, diff === null ? "1ª vez" : `${diff >= 0 ? "+" : "−"}${n(Math.abs(diff))} kg`, "vs. última vez", diff !== null && diff > 0);
  tile(ctx, 80, 900, half, 220, reps ? n(reps) : "—", `repetições · ${exercises} exercício${exercises === 1 ? "" : "s"}`);
  tile(ctx, right, 900, half, 220, heaviest ? `${n(heaviest, 1)} kg` : "—", "maior carga");
  footer(ctx);
  return toBlob(el);
}


/** Route line fitted into a box (equirectangular projection, corrected for latitude). */
function route(ctx: CanvasRenderingContext2D, points: [number, number][], x: number, y: number, w: number, h: number) {
  ctx.fillStyle = look(ctx).tile;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 36);
  ctx.fill();
  const k = Math.cos((points[0]![0] * Math.PI) / 180);
  const xs = points.map((p) => p[1] * k);
  const ys = points.map((p) => -p[0]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 60;
  const scale = Math.min((w - pad * 2) / (maxX - minX || 1), (h - pad * 2) / (maxY - minY || 1));
  const ox = x + (w - (maxX - minX) * scale) / 2;
  const oy = y + (h - (maxY - minY) * scale) / 2;
  const at = (i: number) => [ox + (xs[i]! - minX) * scale, oy + (ys[i]! - minY) * scale] as const;
  ctx.strokeStyle = STRAVA;
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((_, i) => (i ? ctx.lineTo(...at(i)) : ctx.moveTo(...at(i))));
  ctx.stroke();
  for (const [i, color] of [[0, C.cream], [points.length - 1, STRAVA]] as const) {
    ctx.fillStyle = color;
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(...at(i), 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

const STRAVA = "#fc4c02";

/** Image for a Strava activity: route drawing, the main numbers, the forma. logo and the official "Powered by Strava" mark. */
export async function stravaCard(d: StravaDetail, bg: Background): Promise<Blob> {
  const { el, ctx } = await canvas(bg);
  logo(ctx, 80, 150, 88);
  const when = new Date(d.startLocal.replace("Z", "")).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  text(ctx, `${sportLabel(d.sport)} · ${when}`.toUpperCase(), 80, 250, `700 30px ${BODY}`, STRAVA, W - 160);
  text(ctx, d.name, 80, 340, `800 76px ${DISPLAY}`, C.cream, W - 160);

  const paceSport = usesPace(d.sport);
  const stats: [string, string][] = [
    [d.distanceM ? `${km(d.distanceM)} km` : "", "distância"],
    [duration(d.movingS), "tempo em movimento"],
    [d.avgSpeed ? (paceSport ? pace(1000 / d.avgSpeed) : `${n(d.avgSpeed * 3.6, 1)} km/h`) : "", paceSport ? "ritmo médio" : "velocidade média"],
    [d.elevationM ? `${n(d.elevationM)} m` : "", "elevação"],
    [d.avgHr ? `${d.avgHr} bpm` : "", "FC média"],
    [d.kcal ? `${n(d.kcal)} kcal` : "", "calorias"],
  ];
  const shown = stats.filter(([v]) => v);
  const points = d.polyline ? decodePolyline(d.polyline) : [];
  const half = (W - 160 - 30) / 2;
  if (points.length > 1) {
    route(ctx, points, 80, 390, W - 160, 440);
    shown.slice(0, 4).forEach(([v, label], i) => tile(ctx, 80 + (i % 2) * (half + 30), 860 + Math.floor(i / 2) * 170, half, 150, v, label));
  } else {
    shown.forEach(([v, label], i) => tile(ctx, 80 + (i % 2) * (half + 30), 400 + Math.floor(i / 2) * 250, half, 220, v, label));
  }

  ctx.fillStyle = C.line;
  ctx.fillRect(80, H - 150, W - 160, 2);
  logo(ctx, 80, H - 70, 56);
  const mark = await loadImage(stravaLogo).catch(() => null);
  if (mark) {
    const mw = 400;
    const mh = (mw * 37) / 365;
    ctx.drawImage(mark, W - 80 - mw, H - 70 - mh + 4, mw, mh);
  }
  return toBlob(el);
}

/** Image for a closed day. */
export async function dayCard(record: DayRecord, bg: Background): Promise<Blob> {
  const { el, ctx } = await canvas(bg);
  const { day, sinceStart: s } = record;
  logo(ctx, 80, 150, 88);
  text(ctx, longDate(record.date).toUpperCase(), 80, 250, `700 30px ${BODY}`, C.orange);
  text(ctx, "Meu dia", 80, 340, `800 92px ${DISPLAY}`, C.cream);

  bar(ctx, 430, "Calorias", day.kcal, day.targets.kcal, "kcal", C.orange);
  bar(ctx, 540, "Proteína", day.protein, day.targets.protein, "g", "#f2b84b");
  bar(ctx, 650, "Água", day.waterMl / 1000, day.targets.waterMl / 1000, "L", "#4fb3c9", 1);

  const half = (W - 160 - 30) / 2;
  const workout = day.workout ? `${day.workout.name}` : "Descanso";
  const workoutSub = day.workout ? `${day.workout.setsDone}/${day.workout.setsPlanned} séries${day.workout.volumeKg ? ` · ${n(day.workout.volumeKg)} kg` : ""}` : "sem treino hoje";
  tile(ctx, 80, 760, half, 200, workout, workoutSub);
  const strava = day.strava?.[0];
  const stravaKm = day.strava?.reduce((sum, a) => sum + a.km, 0) ?? 0;
  tile(ctx, 80 + half + 30, 760, half, 200,
    strava ? (stravaKm ? `${n(stravaKm, 1)} km` : strava.sport) : day.weightKg ? `${fmtKg(day.weightKg)} kg` : `${day.meals} refeiç${day.meals === 1 ? "ão" : "ões"}`,
    strava ? `${day.strava!.map((a) => a.sport).join(", ")} no Strava` : day.weightKg ? "peso do dia" : "registradas no dia");

  const change = s.weightNow - s.weightStart;
  tile(ctx, 80, 990, W - 160, 170,
    `${change <= 0 ? "−" : "+"}${fmtKg(Math.abs(change))} kg em ${s.days} dia${s.days === 1 ? "" : "s"}`,
    `desde o início · ${s.workouts} treino${s.workouts === 1 ? "" : "s"} · meta ${fmtKg(s.weightGoal)} kg`, true);
  footer(ctx);
  return toBlob(el);
}

/** Image for the monthly review (/mes). */
export async function monthCard(r: MonthReview, bg: Background): Promise<Blob> {
  const { el, ctx } = await canvas(bg);
  const s = r.stats;
  logo(ctx, 80, 150, 88);
  text(ctx, monthName(r.month).toUpperCase(), 80, 250, `700 30px ${BODY}`, C.orange);
  text(ctx, r.inProgress ? "Meu mês até aqui" : "Meu mês", 80, 340, `800 92px ${DISPLAY}`, C.cream);

  const half = (W - 160 - 30) / 2;
  tile(ctx, 80, 420, W - 160, 220, s.volumeKg ? `${n(s.volumeKg)} kg` : `${s.workouts} treinos`, s.volumeKg ? "levantados no mês" : "no mês", true);
  tile(ctx, 80, 670, half, 200, `${s.workouts} treino${s.workouts === 1 ? "" : "s"}`, r.planned ? `de ${r.planned} planejados` : "no mês");
  const change = r.weight ? r.weight.to - r.weight.from : null;
  tile(ctx, 80 + half + 30, 670, half, 200, change === null ? `${s.loggedDays} dias` : `${change <= 0 ? "−" : "+"}${fmtKg(Math.abs(change))} kg`, change === null ? "com refeições" : "no peso médio");
  tile(ctx, 80, 900, half, 200, `${s.kcalOnTarget} dia${s.kcalOnTarget === 1 ? "" : "s"}`, "na meta de calorias");
  tile(ctx, 80 + half + 30, 900, half, 200, `${r.records.length} recorde${r.records.length === 1 ? "" : "s"}`, "de carga no mês");
  footer(ctx);
  return toBlob(el);
}

/** Opens the phone's share sheet with the image when possible; otherwise downloads it. */
export async function shareImage(blob: Blob, fileName: string, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: title });
      return "shared";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
