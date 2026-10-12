// Strava bridge for the forma app (Cloudflare Worker).
// Strava tokens never reach the browser: they live in KV keyed by the Firebase user id, and every request
// must carry that user's Firebase ID token. The Strava client secret is a Worker secret.
import { createRemoteJWKSet, jwtVerify } from "jose";
import { pushRoute, runDaily, type NotifyEnv } from "./notify";
import { healthKeyRoute, ingestHealth } from "./health";

export { RestTimer } from "./notify";

export interface Env extends NotifyEnv {
  TOKENS: KVNamespace;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string; // comma-separated
  /** The app's administrator (same as ADMIN_EMAIL in src/lib/firebase.ts and firestore.rules). */
  ADMIN_EMAIL: string;
}

type Stored = { access_token: string; refresh_token: string; expires_at: number; athlete: { id: number; name: string } };

const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

type Caller = { uid: string; email: string; verified: boolean; token: string };

async function firebaseCaller(request: Request, env: Env): Promise<Caller | null> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });
    if (typeof payload.sub !== "string") return null;
    return { uid: payload.sub, email: typeof payload["email"] === "string" ? payload["email"].toLowerCase() : "", verified: payload["email_verified"] === true, token };
  } catch {
    return null;
  }
}

const INVITE_CACHE_S = 600;

/**
 * Same access as firestore.rules: a confirmed e-mail that is the administrator's or has an invite. The invite is
 * read with the caller's own token (the rules let a person read their own invite) and remembered for ten minutes,
 * so anyone can create an account in the project's sign-in but only invited people reach Strava, push and Health.
 */
async function invited(env: Env, caller: Caller) {
  if (!caller.email || !caller.verified) return false;
  if (caller.email === env.ADMIN_EMAIL) return true;
  if (await env.TOKENS.get(`inv:${caller.uid}`)) return true;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/invites/${encodeURIComponent(caller.email)}`,
    { headers: { Authorization: `Bearer ${caller.token}` } },
  );
  if (!res.ok) return false;
  await env.TOKENS.put(`inv:${caller.uid}`, "1", { expirationTtl: INVITE_CACHE_S });
  return true;
}

function cors(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  // Firebase preview channels (apptreino--<channel>.web.app) are used to review changes before publishing.
  return allowed.includes(origin) || /^https:\/\/apptreino--[a-z0-9-]+\.web\.app$/.test(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", Vary: "Origin" }
    : {};
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

async function stravaToken(env: Env, params: Record<string, string>) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, ...params }),
  });
  if (!res.ok) throw new Error(`strava token ${res.status}`);
  return (await res.json()) as { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number; firstname?: string; lastname?: string } };
}

/** Valid access token for the user, refreshing it (and saving the new pair) when it is about to expire. */
async function accessToken(env: Env, uid: string): Promise<Stored | null> {
  const stored = await env.TOKENS.get<Stored>(uid, "json");
  if (!stored) return null;
  if (stored.expires_at - 300 > Date.now() / 1000) return stored;
  const fresh = await stravaToken(env, { grant_type: "refresh_token", refresh_token: stored.refresh_token });
  const next = { ...stored, access_token: fresh.access_token, refresh_token: fresh.refresh_token, expires_at: fresh.expires_at };
  await env.TOKENS.put(uid, JSON.stringify(next));
  return next;
}

type StravaActivity = {
  id: number; name: string; sport_type?: string; type?: string; start_date: string; start_date_local: string;
  distance?: number; moving_time?: number; elapsed_time?: number; total_elevation_gain?: number;
  average_heartrate?: number; max_heartrate?: number; kilojoules?: number; calories?: number; average_cadence?: number;
};

type StravaDetail = StravaActivity & {
  elapsed_time?: number; description?: string; average_speed?: number; max_speed?: number;
  average_watts?: number; suffer_score?: number; pr_count?: number; achievement_count?: number; kudos_count?: number;
  device_name?: string; map?: { polyline?: string; summary_polyline?: string };
  splits_metric?: { split: number; distance: number; moving_time: number; average_speed: number; average_heartrate?: number; elevation_difference?: number }[];
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const path = new URL(request.url).pathname;

    // The iPhone Shortcut signs with the personal Health key, not with a Firebase sign-in.
    if (path === "/health/ingest") {
      try {
        return await ingestHealth(request, env);
      } catch (error) {
        return new Response(`Erro no forma: ${error instanceof Error ? error.message : "desconhecido"}`, { status: 502 });
      }
    }

    const caller = await firebaseCaller(request, env);
    if (!caller) return json({ error: "não autenticado" }, 401, headers);
    if (!(await invited(env, caller))) return json({ error: "acesso não liberado para esta conta" }, 403, headers);
    const uid = caller.uid;

    try {
      const pushed = await pushRoute(path, request, env, uid);
      if (pushed) return json(pushed[0], pushed[1], headers);
      const health = await healthKeyRoute(path, request, env, uid);
      if (health) return json(health[0], health[1], headers);

      if (path === "/connect" && request.method === "POST") {
        const { code } = (await request.json()) as { code?: string };
        if (!code) return json({ error: "código ausente" }, 400, headers);
        const t = await stravaToken(env, { grant_type: "authorization_code", code });
        const athlete = { id: t.athlete?.id ?? 0, name: [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" ") };
        await env.TOKENS.put(uid, JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, athlete }));
        return json({ connected: true, athlete }, 200, headers);
      }

      if (path === "/status") {
        const stored = await env.TOKENS.get<Stored>(uid, "json");
        return json(stored ? { connected: true, athlete: stored.athlete } : { connected: false }, 200, headers);
      }

      if (path === "/activities") {
        const token = await accessToken(env, uid);
        if (!token) return json({ connected: false, activities: [] }, 200, headers);
        const after = new URL(request.url).searchParams.get("after") ?? "0";
        const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${encodeURIComponent(after)}&per_page=100`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        if (res.status === 401) return json({ connected: false, activities: [] }, 200, headers);
        if (!res.ok) return json({ error: `strava ${res.status}` }, 502, headers);
        const list = (await res.json()) as StravaActivity[];
        const activities = list.map((a) => ({
          id: a.id,
          name: a.name,
          sport: a.sport_type ?? a.type ?? "Workout",
          date: a.start_date_local.slice(0, 10),
          start: a.start_date,
          distanceM: Math.round(a.distance ?? 0),
          movingS: a.moving_time ?? 0,
          cadence: a.average_cadence ?? null,
          elevationM: Math.round(a.total_elevation_gain ?? 0),
          avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
          maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
          // Summaries often lack calories; for power-based activities kJ ≈ kcal burned.
          kcal: a.calories ? Math.round(a.calories) : a.kilojoules ? Math.round(a.kilojoules) : null,
        }));
        return json({ connected: true, activities }, 200, headers);
      }

      if (path === "/activity") {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!/^\d+$/.test(id)) return json({ error: "atividade inválida" }, 400, headers);
        const token = await accessToken(env, uid);
        if (!token) return json({ connected: false }, 200, headers);
        const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, { headers: { Authorization: `Bearer ${token.access_token}` } });
        if (res.status === 401) return json({ connected: false }, 200, headers);
        if (res.status === 404) return json({ error: "atividade não encontrada" }, 404, headers);
        if (!res.ok) return json({ error: `strava ${res.status}` }, 502, headers);
        const a = (await res.json()) as StravaDetail;
        return json(
          {
            connected: true,
            activity: {
              id: a.id,
              name: a.name,
              sport: a.sport_type ?? a.type ?? "Workout",
              start: a.start_date,
              startLocal: a.start_date_local,
              description: a.description ?? null,
              distanceM: Math.round(a.distance ?? 0),
              movingS: a.moving_time ?? 0,
              elapsedS: a.elapsed_time ?? 0,
              elevationM: Math.round(a.total_elevation_gain ?? 0),
              avgSpeed: a.average_speed ?? null,
              maxSpeed: a.max_speed ?? null,
              avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
              maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
              avgCadence: a.average_cadence ? Math.round(a.average_cadence) : null,
              avgWatts: a.average_watts ? Math.round(a.average_watts) : null,
              kcal: a.calories ? Math.round(a.calories) : a.kilojoules ? Math.round(a.kilojoules) : null,
              sufferScore: a.suffer_score ?? null,
              prCount: a.pr_count ?? 0,
              achievements: a.achievement_count ?? 0,
              kudos: a.kudos_count ?? 0,
              device: a.device_name ?? null,
              polyline: a.map?.polyline ?? a.map?.summary_polyline ?? null,
              splits: (a.splits_metric ?? []).map((s) => ({
                km: s.split,
                distanceM: Math.round(s.distance),
                movingS: s.moving_time,
                avgSpeed: s.average_speed,
                avgHr: s.average_heartrate ? Math.round(s.average_heartrate) : null,
                elevationM: Math.round(s.elevation_difference ?? 0),
              })),
            },
          },
          200,
          headers,
        );
      }

      if (path === "/disconnect" && request.method === "POST") {
        const stored = await env.TOKENS.get<Stored>(uid, "json");
        if (stored) {
          await fetch("https://www.strava.com/oauth/deauthorize", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `access_token=${encodeURIComponent(stored.access_token)}`,
          }).catch(() => undefined);
          await env.TOKENS.delete(uid);
        }
        return json({ connected: false }, 200, headers);
      }

      return json({ error: "rota não encontrada" }, 404, headers);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "erro" }, 502, headers);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDaily(env));
  },
};
