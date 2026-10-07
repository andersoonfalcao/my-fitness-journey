// Notifications of the forma app: the daily "what's left to fill in" reminder (cron) and the end of a rest
// when the phone screen is off (a Durable Object alarm per user, since a sleeping page can't run timers).
// Subscriptions live in KV as push:{uid}:{id}, with the reminder settings in the key metadata so the cron
// can find who is due from one list call.
import { DurableObject } from "cloudflare:workers";
import { b64url, sendPush, type PushSubscriptionJSON, type Vapid } from "./webpush";

export interface NotifyEnv {
  TOKENS: KVNamespace;
  REST: DurableObjectNamespace<RestTimer>;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_JWK: string; // secret
}

/** A reminder the person wrote in the app: title, optional text, HH:MM and weekdays (0 = Sunday). */
type Custom = { id: string; title: string; body: string; time: string; days: number[]; on: boolean };
/** `custom` and the day each one last went out (`customLast`) live in the value: they don't fit the 1 KB metadata. */
type Stored = { sub: PushSubscriptionJSON; refreshToken: string; custom?: Custom[]; customLast?: Record<string, string> };
/** `custom`: the device has reminders switched on, so the cron reads its value. */
type Meta = { daily: boolean; time: string; tz: string; last: string; custom?: boolean };
type Message = { title: string; body: string; tag: string; url: string };

const vapid = (env: NotifyEnv): Vapid => ({ publicKey: env.VAPID_PUBLIC_KEY, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: "https://apptreino.web.app" });
const keyOf = (uid: string, id: string) => `push:${uid}:${id}`;

async function deviceId(endpoint: string) {
  return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint))).slice(0, 16);
}

/** Sends to one stored device; a subscription the push service no longer knows is removed. */
async function push(env: NotifyEnv, key: string, message: Message, ttl?: number) {
  const stored = await env.TOKENS.get<Stored>(key, "json");
  if (!stored) return 0;
  const status = await sendPush(stored.sub, message, vapid(env), ttl);
  if (status === 404 || status === 410) await env.TOKENS.delete(key);
  return status;
}

function localNow(tz: string, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: new Date(`${date}T12:00:00Z`).getUTCDay() };
}

/** Monday of the week of a YYYY-MM-DD date. */
function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** A fresh ID token of the user from the sign-in kept on the server (fails when they signed out or changed password). */
export async function userIdToken(env: NotifyEnv, refreshToken: string) {
  const tokenRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${env.FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: "https://apptreino.web.app/" },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
  return ((await tokenRes.json()) as { id_token: string }).id_token;
}

/** Reads the user's own documents with their own credentials, so Firestore's rules still apply. */
export async function readUserDocs(env: NotifyEnv, uid: string, refreshToken: string, keys: string[], idToken?: string) {
  const id_token = idToken ?? (await userIdToken(env, refreshToken));
  const base = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const res = await fetch(`https://firestore.googleapis.com/v1/${base}:batchGet`, {
    method: "POST",
    headers: { Authorization: `Bearer ${id_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ documents: keys.map((k) => `${base}/users/${uid}/data/${k}`) }),
  });
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  const docs = (await res.json()) as { found?: { name: string; fields?: { json?: { stringValue?: string } } } }[];
  const values: Record<string, unknown> = {};
  for (const d of docs) {
    const json = d.found?.fields?.json?.stringValue;
    if (d.found && json !== undefined) values[d.found.name.split("/").at(-1)!] = JSON.parse(json);
  }
  return values;
}

const MEALS: [string, string][] = [["cafe", "café da manhã"], ["almoco", "almoço"], ["lanche", "lanche"], ["jantar", "jantar"]];
const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

/** What is still missing today, same rules as the app: the four meals, the water target, the week's workouts and closing the day. */
export async function dailySummary(env: NotifyEnv, uid: string, refreshToken: string, date: string): Promise<Message> {
  const month = date.slice(0, 7);
  const docs = await readUserDocs(env, uid, refreshToken, ["forma.profile", `forma.foods.${month}`, `forma.water.${month}`, `forma.days.${month}`, "forma.done", "forma.supplements"]);
  const profile = docs["forma.profile"] as { weight?: number; days?: number } | undefined;
  const foods = ((docs[`forma.foods.${month}`] as { date: string; meal: string; suppId?: string }[] | undefined) ?? []).filter((f) => f.date === date);
  const routine = (docs["forma.supplements"] as { id: string; name: string }[] | undefined) ?? [];
  const waterMl = ((docs[`forma.water.${month}`] as Record<string, number> | undefined) ?? {})[date] ?? 0;
  const closed = ((docs[`forma.days.${month}`] as { date: string }[] | undefined) ?? []).some((d) => d.date === date);
  const done = ((docs["forma.done"] as string[] | undefined) ?? []).map((d) => d.split("|")[0]!);

  const missing: string[] = [];
  const meals = MEALS.filter(([v]) => !foods.some((f) => f.meal === v)).map(([, label]) => label);
  if (meals.length === MEALS.length) missing.push("nenhuma refeição registrada");
  else if (meals.length) missing.push(`refeições: ${meals.join(", ")}`);
  // Same target as targets() in the app: ~35 ml/kg, kept within 1.5–4 L.
  const waterTarget = profile?.weight ? Math.round(Math.min(4000, Math.max(1500, profile.weight * 35)) / 50) * 50 : 0;
  if (waterTarget && waterMl < waterTarget) missing.push(`água: ${liters(waterMl)} de ${liters(waterTarget)}`);
  const from = weekStart(date);
  const weekWorkouts = done.filter((d) => d >= from && d <= date).length;
  if (!done.includes(date) && profile?.days && weekWorkouts < profile.days) missing.push(`treino (${weekWorkouts} de ${profile.days} na semana)`);
  const supplements = routine.filter((sup) => !foods.some((f) => f.suppId === sup.id)).map((sup) => sup.name);
  if (supplements.length) missing.push(`suplementos: ${supplements.join(", ")}`);
  if (!closed) missing.push("fechar o dia");

  return missing.length
    ? { title: "O que falta hoje", body: missing.map((m) => `• ${m[0]!.toUpperCase()}${m.slice(1)}`).join("\n"), tag: "forma-lembrete", url: "/" }
    : { title: "Dia completo ✅", body: "Tudo registrado hoje. Bom descanso!", tag: "forma-lembrete", url: "/" };
}

async function dailyFor(env: NotifyEnv, key: string, uid: string, date: string) {
  const stored = await env.TOKENS.get<Stored>(key, "json");
  if (!stored) return 0;
  let message: Message;
  try {
    message = await dailySummary(env, uid, stored.refreshToken, date);
  } catch {
    // Signed out or password changed: the reminder still goes out, without the details.
    message = { title: "O que falta hoje", body: "Abra o forma para conferir o que falta registrar hoje.", tag: "forma-lembrete", url: "/" };
  }
  return push(env, key, message, 3600);
}

/** Within the hour after HH:MM, local minutes. */
const due = (time: string, minutes: number) => {
  const [h, m] = time.split(":").map(Number);
  const target = h! * 60 + m!;
  return minutes >= target && minutes - target < 60;
};

/** Cron (every 5 min): sends each device's daily reminder and custom reminders once, within an hour after their times. */
export async function runDaily(env: NotifyEnv) {
  let cursor: string | undefined;
  do {
    const page: KVNamespaceListResult<Meta> = await env.TOKENS.list<Meta>({ prefix: "push:", cursor });
    for (const k of page.keys) {
      const meta = k.metadata;
      if (!meta) continue;
      const now = localNow(meta.tz);
      const daily = meta.daily && meta.last !== now.date && due(meta.time, now.minutes);
      if (!daily && !meta.custom) continue;
      const stored = await env.TOKENS.get<Stored>(k.name, "json");
      if (stored === null) continue;
      const customDue = (stored.custom ?? []).filter((c) => c.on && c.days.includes(now.weekday) && stored.customLast?.[c.id] !== now.date && due(c.time, now.minutes));
      if (!daily && !customDue.length) continue;
      // Marked as sent first, so a slow push never goes out twice from overlapping runs.
      const customLast = { ...stored.customLast, ...Object.fromEntries(customDue.map((c) => [c.id, now.date])) };
      await env.TOKENS.put(k.name, JSON.stringify({ ...stored, customLast } satisfies Stored), { metadata: { ...meta, ...(daily ? { last: now.date } : {}) } });
      if (daily) await dailyFor(env, k.name, k.name.split(":")[1]!, now.date).catch(() => undefined);
      for (const c of customDue) await push(env, k.name, { title: c.title, body: c.body, tag: `forma-lembrete-${c.id}`, url: "/" }, 3600).catch(() => undefined);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

/** Reminders from the app, checked and trimmed (at most 10). */
function cleanCustom(value: unknown): Custom[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((c): Custom[] => {
    if (!c || typeof c !== "object") return [];
    const r = c as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim().slice(0, 60) : "";
    const time = typeof r.time === "string" && TIME.test(r.time) ? r.time : null;
    const days = Array.isArray(r.days) ? [...new Set(r.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
    if (!title || !time || !days.length || typeof r.id !== "string" || !/^[\w-]{1,32}$/.test(r.id)) return [];
    return [{ id: r.id, title, body: typeof r.body === "string" ? r.body.trim().slice(0, 140) : "", time, days, on: r.on !== false }];
  });
}

/** One per user: holds the running rest and wakes up when it ends. */
export class RestTimer extends DurableObject<NotifyEnv> {
  async start(rest: { key: string; endsAt: number; next: string }) {
    await this.ctx.storage.put("rest", rest);
    await this.ctx.storage.setAlarm(rest.endsAt);
  }

  async cancel() {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.delete("rest");
  }

  async alarm() {
    const rest = await this.ctx.storage.get<{ key: string; endsAt: number; next: string }>("rest");
    if (!rest) return;
    await this.ctx.storage.delete("rest");
    // A rest that ended long ago (device offline) is no longer worth a buzz.
    if (Date.now() - rest.endsAt > 120_000) return;
    // Three minutes to deliver: a locked phone in low power may take a while to wake for it.
    await push(this.env, rest.key, { title: "Descanso acabou!", body: `Próxima: ${rest.next}`, tag: "forma-descanso", url: "/treinos" }, 180);
  }
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Routes under /push/ for a signed-in user; returns null for any other path. */
export async function pushRoute(path: string, request: Request, env: NotifyEnv, uid: string): Promise<[unknown, number] | null> {
  if (!path.startsWith("/push/") || request.method !== "POST") return null;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const timer = () => env.REST.get(env.REST.idFromName(uid));

  if (path === "/push/subscribe") {
    const sub = body.subscription as PushSubscriptionJSON | undefined;
    const refreshToken = body.refreshToken;
    if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth || typeof refreshToken !== "string") return [{ error: "inscrição inválida" }, 400];
    const time = typeof body.time === "string" && TIME.test(body.time) ? body.time : "21:00";
    const tz = typeof body.tz === "string" && body.tz ? body.tz : "America/Fortaleza";
    try {
      localNow(tz);
    } catch {
      return [{ error: "fuso inválido" }, 400];
    }
    const id = await deviceId(sub.endpoint);
    const key = keyOf(uid, id);
    const previous = await env.TOKENS.getWithMetadata<Meta>(key);
    const previousValue = previous.value ? (JSON.parse(previous.value) as Stored) : null;
    const custom = cleanCustom(body.custom);
    // Keep "sent today" (daily and each custom one) so changing a time after it went out doesn't send it twice.
    const meta: Meta = { daily: body.daily === true, time, tz, last: previous.metadata?.last ?? "", custom: custom.some((c) => c.on) };
    const stored: Stored = { sub, refreshToken, custom, customLast: previousValue?.customLast ?? {} };
    await env.TOKENS.put(key, JSON.stringify(stored), { metadata: meta });
    return [{ id }, 200];
  }

  const id = typeof body.id === "string" && /^[\w-]{16}$/.test(body.id) ? body.id : null;
  if (!id) return [{ error: "aparelho inválido" }, 400];
  const key = keyOf(uid, id);

  if (path === "/push/unsubscribe") {
    await env.TOKENS.delete(key);
    await timer().cancel();
    return [{ ok: true }, 200];
  }
  if (path === "/push/test") {
    const now = localNow(typeof body.tz === "string" ? body.tz : "America/Fortaleza");
    const status = await dailyFor(env, key, uid, now.date);
    return status >= 200 && status < 300 ? [{ ok: true }, 200] : [{ error: `push ${status}` }, 502];
  }
  if (path === "/push/rest") {
    const endsAt = Number(body.endsAt);
    const next = typeof body.next === "string" ? body.next.slice(0, 200) : "";
    if (!Number.isFinite(endsAt) || endsAt < Date.now() - 5000 || endsAt > Date.now() + 3_600_000) return [{ error: "descanso inválido" }, 400];
    await timer().start({ key, endsAt, next });
    return [{ ok: true }, 200];
  }
  if (path === "/push/rest/cancel") {
    await timer().cancel();
    return [{ ok: true }, 200];
  }
  return [{ error: "rota não encontrada" }, 404];
}
