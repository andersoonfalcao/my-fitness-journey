// Apple Health data (from the Mi Band through the Mi Fitness app) sent by an iPhone Shortcut. Web apps can't read
// Health, so a Shortcut reads it and posts here with a personal key made in Configurações. The day's numbers are
// saved in the user's own Firestore document `forma.health.YYYY-MM` = { "YYYY-MM-DD": HealthDay }, written with
// their own credentials so Firestore's rules still apply.
import { b64url } from "./webpush";
import { readUserDocs, userIdToken, type NotifyEnv } from "./notify";

export type HealthDay = {
  steps?: number; activeKcal?: number; restingHr?: number; vo2max?: number;
  /** Sleep that ended on this day: minutes asleep and the first and last moment asleep (ISO). */
  sleepMin?: number; sleepStart?: string; sleepEnd?: string;
  /** When the Shortcut last sent this day (ms). */
  at: number;
};

type KeyRecord = { uid: string; refreshToken: string; createdAt: number };
const sha = async (text: string) => b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
const keyOfUser = (uid: string) => `hkeyof:${uid}`;

/** Routes under /health/ for a signed-in user (the app): make, check or revoke the personal key. */
export async function healthKeyRoute(path: string, request: Request, env: NotifyEnv, uid: string): Promise<[unknown, number] | null> {
  if (!path.startsWith("/health/") || path === "/health/ingest") return null;
  if (path === "/health/status") {
    const hash = await env.TOKENS.get(keyOfUser(uid));
    const record = hash ? await env.TOKENS.get<KeyRecord>(`hkey:${hash}`, "json") : null;
    return [{ hasKey: !!record, createdAt: record?.createdAt ?? null }, 200];
  }
  if (request.method !== "POST") return [{ error: "método inválido" }, 405];
  const old = await env.TOKENS.get(keyOfUser(uid));
  if (old) await env.TOKENS.delete(`hkey:${old}`);
  if (path === "/health/revoke") {
    await env.TOKENS.delete(keyOfUser(uid));
    return [{ ok: true }, 200];
  }
  if (path === "/health/key") {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: unknown };
    if (typeof body.refreshToken !== "string") return [{ error: "sessão inválida" }, 400];
    // The key is shown once; only its hash is kept.
    const key = b64url(crypto.getRandomValues(new Uint8Array(24)));
    const hash = await sha(key);
    await env.TOKENS.put(`hkey:${hash}`, JSON.stringify({ uid, refreshToken: body.refreshToken, createdAt: Date.now() } satisfies KeyRecord));
    await env.TOKENS.put(keyOfUser(uid), hash);
    return [{ key }, 200];
  }
  return [{ error: "rota não encontrada" }, 404];
}

/** "8.432", "420,5 kcal", 61 → numbers; anything else → NaN. */
export function parseNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  let s = v.replace(/[^\d.,-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  return s ? Number(s) : NaN;
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : typeof v === "string" && v.includes("\n") ? v.split("\n") : v === undefined || v === null || v === "" ? [] : [v]);

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Offset of a time zone at a moment, in minutes (e.g. -180 for Fortaleza). */
function offsetMinutes(tz: string, at: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!) - at.getTime()) / 60000;
}

/** ISO dates, or the Brazilian text the Shortcuts app may send ("7 de out. de 2026 às 06:52", "07/10/2026 06:52"). */
export function parseDate(v: unknown, tz: string): number {
  if (typeof v !== "string" || !v.trim()) return NaN;
  const iso = Date.parse(v);
  if (!Number.isNaN(iso) && /\d{4}-\d{2}-\d{2}/.test(v)) return iso;
  let m = v.toLowerCase().match(/(\d{1,2}) de ([a-zç]{3})[a-zç.]* de (\d{4})\D+(\d{1,2}):(\d{2})/);
  let parts: number[] | null = m ? [+m[3]!, MONTHS.indexOf(m[2]!), +m[1]!, +m[4]!, +m[5]!] : null;
  // Recent dates may come as "Hoje às 06:52" / "Ontem às 23:40".
  const relative = v.toLowerCase().match(/(hoje|ontem)\D+(\d{1,2}):(\d{2})/);
  if (!parts && relative) {
    const day = new Date(Date.now() - (relative[1] === "ontem" ? 86400_000 : 0));
    const [y, mo, d] = localDate(day.getTime(), tz).split("-").map(Number) as [number, number, number];
    parts = [y, mo - 1, d, +relative[2]!, +relative[3]!];
  }
  if (!parts) {
    m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\D+(\d{1,2}):(\d{2})/);
    parts = m ? [+m[3]!, +m[2]! - 1, +m[1]!, +m[4]!, +m[5]!] : null;
  }
  if (!parts || parts[1]! < 0) return Number.isNaN(iso) ? NaN : iso;
  const asUtc = Date.UTC(parts[0]!, parts[1]!, parts[2]!, parts[3]!, parts[4]!);
  return asUtc - offsetMinutes(tz, new Date(asUtc)) * 60000;
}

const localDate = (ms: number, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));

/** Minutes asleep in the sleep that ended today, from Health's sleep samples (value + start + end). */
export function sleepOf(values: unknown[], starts: unknown[], ends: unknown[], tz: string, today: string) {
  const samples = values.map((value, i) => ({ value: String(value ?? "").toLowerCase(), start: parseDate(starts[i], tz), end: parseDate(ends[i], tz) }))
    .filter((s) => s.end > s.start && s.end - s.start < 16 * 3600_000 && localDate(s.end, tz) === today);
  const awake = (s: { value: string }) => /acord|awake/.test(s.value);
  const inBed = (s: { value: string }) => /cama|bed/.test(s.value);
  // Stages (core, deep, REM) or plain "asleep"; only "in bed" when the band recorded nothing finer.
  let asleep = samples.filter((s) => !awake(s) && !inBed(s));
  if (!asleep.length) asleep = samples.filter(inBed);
  if (!asleep.length) return null;
  // Overlapping samples (stages inside an "asleep" block) are counted once.
  const sorted = asleep.sort((a, b) => a.start - b.start);
  let total = 0;
  let [curStart, curEnd] = [sorted[0]!.start, sorted[0]!.end];
  for (const s of sorted.slice(1)) {
    if (s.start <= curEnd) curEnd = Math.max(curEnd, s.end);
    else { total += curEnd - curStart; [curStart, curEnd] = [s.start, s.end]; }
  }
  total += curEnd - curStart;
  return { sleepMin: Math.round(total / 60000), sleepStart: new Date(sorted[0]!.start).toISOString(), sleepEnd: new Date(Math.max(...sorted.map((s) => s.end))).toISOString() };
}

/** Resting heart rate: the mean of the lowest tenth of the day's readings (at least five), as bands usually report it. */
export function restingHrOf(values: unknown[]) {
  const bpm = values.map(parseNumber).filter((n) => n >= 30 && n <= 220).sort((a, b) => a - b);
  if (bpm.length < 10) return null;
  const low = bpm.slice(0, Math.max(5, Math.round(bpm.length / 10)));
  return Math.round(low.reduce((s, n) => s + n, 0) / low.length);
}

/**
 * Day total of a quantity (steps, active energy) recorded by more than one source, e.g. the iPhone and the band counting
 * the same walk. Each hour counts once: from the band when it recorded anything in it, otherwise from whatever did, so
 * time without the band is kept too. Without sources every sample is treated as one source (a plain sum).
 */
export function totalOf(values: unknown[], starts: unknown[], ends: unknown[], sources: unknown[], tz: string, today: string) {
  const HOUR = 3600_000;
  const hours = new Map<number, Map<string, number>>();
  const seen = new Set<string>();
  values.forEach((v, i) => {
    const value = parseNumber(v);
    const start = parseDate(starts[i], tz);
    if (!(value > 0) || Number.isNaN(start) || localDate(start, tz) !== today) return;
    const source = sources.length === values.length ? String(sources[i] ?? "").trim() : "";
    if (source) seen.add(source);
    const parsedEnd = parseDate(ends[i], tz);
    const end = parsedEnd > start && parsedEnd - start < 24 * HOUR ? parsedEnd : start;
    // A sample that crosses hours is split by the time spent in each.
    for (let h = Math.floor(start / HOUR); h <= Math.floor(end / HOUR); h++) {
      const share = end === start ? 1 : (Math.min(end, (h + 1) * HOUR) - Math.max(start, h * HOUR)) / (end - start);
      if (share <= 0) continue;
      const bySource = hours.get(h) ?? new Map<string, number>();
      bySource.set(source, (bySource.get(source) ?? 0) + value * share);
      hours.set(h, bySource);
    }
  });
  if (!hours.size) return null;
  // The band is the reference (its total is the one Mi Fitness shows): the main source is the one, other than the
  // iPhone itself, with records in the most hours. The others only fill the hours it left empty.
  const hoursOf = (s: string) => [...hours.values()].filter((bySource) => bySource.has(s)).length;
  const candidates = [...seen].filter((s) => !/iphone/i.test(s));
  const main = (candidates.length ? candidates : [...seen]).sort((a, b) => hoursOf(b) - hoursOf(a))[0] ?? "";
  let total = 0;
  for (const bySource of hours.values()) total += bySource.get(main) ?? Math.max(...bySource.values());
  return { total, sources: [...seen] };
}

const text = (body: string, status: number) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const fmt = (n: number, digits = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });

/** POST /health/ingest from the Shortcut, with "Authorization: Bearer <personal key>". Answers in plain text, shown on the iPhone. */
export async function ingestHealth(request: Request, env: NotifyEnv): Promise<Response> {
  if (request.method !== "POST") return text("Use POST.", 405);
  const key = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const record = key ? await env.TOKENS.get<KeyRecord>(`hkey:${await sha(key)}`, "json") : null;
  if (!record) return text("Chave inválida. Gere uma nova em Configurações → Saúde do iPhone e cole no atalho.", 401);
  const raw = await request.text();
  if (raw.length > 2_000_000) return text("Dados grandes demais.", 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return text("O atalho não mandou JSON. Confira o passo “Obter conteúdo do URL”: Corpo da requisição = JSON.", 400);
  }
  const tz = typeof body.tz === "string" && body.tz ? body.tz : "America/Fortaleza";
  const now = Date.now();
  let today: string;
  try {
    today = localDate(now, tz);
  } catch {
    return text("Fuso horário inválido.", 400);
  }
  // What arrived, trimmed, kept a week for checking a new Shortcut.
  const peek = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? { count: v.length, first: v.slice(0, 5) } : v]));
  await env.TOKENS.put(`hlast:${record.uid}`, JSON.stringify({ at: new Date(now).toISOString(), body: peek }), { expirationTtl: 7 * 86400 });

  const day: Partial<HealthDay> = {};
  // Samples with their source (counted once per hour), or the single number older Shortcuts send.
  const stepSamples = totalOf(list(body.stepValues), list(body.stepStarts), list(body.stepEnds), list(body.stepSources), tz, today);
  const steps = stepSamples?.total ?? parseNumber(body.steps);
  if (steps >= 0 && steps < 200_000) day.steps = Math.round(steps);
  const kcalSamples = totalOf(list(body.kcalValues), list(body.kcalStarts), list(body.kcalEnds), list(body.kcalSources), tz, today);
  const kcal = kcalSamples?.total ?? parseNumber(body.activeKcal);
  if (kcal >= 0 && kcal < 20_000) day.activeKcal = Math.round(kcal);
  const sources = [...new Set([...(stepSamples?.sources ?? []), ...(kcalSamples?.sources ?? [])])];
  const resting = restingHrOf(list(body.heartRates));
  if (resting) day.restingHr = resting;
  const vo2 = parseNumber(Array.isArray(body.vo2max) ? body.vo2max.at(-1) : body.vo2max);
  if (vo2 >= 10 && vo2 <= 90) day.vo2max = Math.round(vo2 * 10) / 10;
  const sleep = sleepOf(list(body.sleepValues), list(body.sleepStarts), list(body.sleepEnds), tz, today);
  if (sleep) Object.assign(day, sleep);

  const docKey = `forma.health.${today.slice(0, 7)}`;
  let idToken: string;
  try {
    idToken = await userIdToken(env, record.refreshToken);
  } catch {
    return text("Sua sessão no forma expirou. Abra Configurações → Saúde do iPhone, gere uma nova chave e cole no atalho.", 401);
  }
  const current = ((await readUserDocs(env, record.uid, record.refreshToken, [docKey], idToken))[docKey] ?? {}) as Record<string, HealthDay>;
  // A later send of the same day replaces what it brings and keeps the rest (e.g. sleep sent in the morning).
  current[today] = { ...current[today], ...day, at: now };
  const name = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${record.uid}/data/${docKey}`;
  const res = await fetch(`https://firestore.googleapis.com/v1/${name}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(current) }, updatedAt: { timestampValue: new Date(now).toISOString() } } }),
  });
  if (!res.ok) return text(`Não foi possível salvar (${res.status}). Tente de novo mais tarde.`, 502);

  const parts = [
    day.sleepMin !== undefined && `sono ${Math.floor(day.sleepMin / 60)}h${String(day.sleepMin % 60).padStart(2, "0")}`,
    day.steps !== undefined && `${fmt(day.steps)} passos`,
    day.activeKcal !== undefined && `${fmt(day.activeKcal)} kcal ativas`,
    day.restingHr !== undefined && `repouso ${day.restingHr} bpm`,
    day.vo2max !== undefined && `VO2 máx ${fmt(day.vo2max, 1)}`,
  ].filter(Boolean);
  // Named so a doubled total (samples that came without their source) is easy to spot on the iPhone.
  const from = sources.length ? ` (fontes: ${sources.join(", ")})` : stepSamples || kcalSamples ? " (as amostras vieram sem a fonte: passos e calorias podem estar somados em dobro)" : "";
  return text(parts.length ? `forma recebeu: ${parts.join(" · ")}${from}` :"forma recebeu o envio, mas sem dados de hoje. Confira as permissões do atalho no app Saúde.", 200);
}
