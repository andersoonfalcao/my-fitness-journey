import { readCloudOnce, writeCloud } from "./cloud-store";

/**
 * Spotify during the workout: what is playing, play/pause/skip, the person's playlists and a search.
 * The app is only a remote control (Spotify Connect): the music plays in the Spotify app of a device.
 * Login is Authorization Code with PKCE straight from the browser (public client, no secret, no Worker).
 * The tokens live in the account (`forma.spotify`), so the connection follows the person across devices.
 *
 * Client ID: the one below, else the one pasted in Configurações (`forma.spotify.app`). Each person who uses it
 * must be added to the Spotify app's user list in its dashboard while the app is in development mode.
 */
export const SPOTIFY_CLIENT_ID = "9d64a948ca2f4e0d9d9297ed3747aaf6";
export const SPOTIFY_APP_KEY = "forma.spotify.app";
export const SPOTIFY_KEY = "forma.spotify";
const PENDING = "forma.spotify.pending";
const API = "https://api.spotify.com/v1";
const SCOPES = ["user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing", "playlist-read-private", "playlist-read-collaborative"];

export type SpotifyAuth = { clientId: string; refresh: string; access: string; expiresAt: number; name?: string };
export type SpotifyApp = { clientId: string };

export const redirectUri = () => `${window.location.origin}/spotify`;

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Sends the person to Spotify to authorize; Spotify returns to /spotify with a code. */
export async function startSpotifyConnect(clientId: string) {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const state = base64url(crypto.getRandomValues(new Uint8Array(12)));
  localStorage.setItem(PENDING, JSON.stringify({ verifier, state, clientId }));
  const params = new URLSearchParams({
    client_id: clientId, response_type: "code", redirect_uri: redirectUri(), scope: SCOPES.join(" "),
    code_challenge_method: "S256", code_challenge: challenge, state,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new SpotifyError(data.error === "invalid_grant" ? "revoked" : "auth", data.error ?? `HTTP ${res.status}`);
  return data as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function finishSpotifyConnect(uid: string, code: string, state: string | null) {
  const pending = JSON.parse(localStorage.getItem(PENDING) ?? "null") as { verifier: string; state: string; clientId: string } | null;
  localStorage.removeItem(PENDING);
  if (!pending || pending.state !== state) throw new Error("A conexão com o Spotify expirou. Tente conectar de novo.");
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), client_id: pending.clientId, code_verifier: pending.verifier });
  const auth: SpotifyAuth = { clientId: pending.clientId, access: t.access_token, refresh: t.refresh_token ?? "", expiresAt: Date.now() + t.expires_in * 1000 };
  const me = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${auth.access}` } });
  if (me.status === 403) throw new Error("Esta conta Spotify não está liberada no app. Adicione o e-mail dela em User Management, no painel do Spotify.");
  const name = me.ok ? ((await me.json()) as { display_name?: string | null }).display_name : null;
  if (name) auth.name = name;
  writeCloud(uid, SPOTIFY_KEY, auth);
  return auth;
}

export function disconnectSpotify(uid: string) {
  writeCloud(uid, SPOTIFY_KEY, null);
}

export type SpotifyErrorKind = "auth" | "revoked" | "premium" | "no-device" | "forbidden" | "network";
export class SpotifyError extends Error {
  constructor(public kind: SpotifyErrorKind, message: string) { super(message); }
}

export const spotifyMessage = (e: unknown) => {
  const kind = e instanceof SpotifyError ? e.kind : "network";
  return {
    premium: "Controlar a música pede Spotify Premium.",
    "no-device": "Nenhum aparelho tocando. Abra o Spotify no celular e tente de novo.",
    forbidden: "O Spotify recusou o pedido. Confira se esta conta está liberada no app.",
    revoked: "O Spotify foi desconectado. Conecte de novo em Configurações.",
    auth: "O Spotify foi desconectado. Conecte de novo em Configurações.",
    network: "Não foi possível falar com o Spotify agora.",
  }[kind];
};

let refreshing: Promise<SpotifyAuth> | null = null;

/** A valid access token; refreshes (and saves the rotated refresh token) a minute before it expires. */
async function accessToken(uid: string): Promise<string> {
  const auth = await readCloudOnce<SpotifyAuth | null>(uid, SPOTIFY_KEY, null);
  if (!auth?.refresh) throw new SpotifyError("auth", "not connected");
  if (auth.expiresAt - 60_000 > Date.now()) return auth.access;
  refreshing ??= tokenRequest({ grant_type: "refresh_token", refresh_token: auth.refresh, client_id: auth.clientId })
    .then((t) => {
      const next = { ...auth, access: t.access_token, refresh: t.refresh_token ?? auth.refresh, expiresAt: Date.now() + t.expires_in * 1000 };
      writeCloud(uid, SPOTIFY_KEY, next);
      return next;
    })
    .catch((e: unknown) => {
      if (e instanceof SpotifyError && e.kind === "revoked") writeCloud(uid, SPOTIFY_KEY, null);
      throw e;
    })
    .finally(() => { refreshing = null; });
  return (await refreshing).access;
}

async function api<T>(uid: string, path: string, init?: RequestInit): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${await accessToken(uid)}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
  } catch (e) {
    if (e instanceof SpotifyError) throw e;
    throw new SpotifyError("network", String(e));
  }
  if (res.status === 204 || res.status === 202) return null;
  const data = (await res.json().catch(() => null)) as { error?: { message?: string; reason?: string } } | null;
  if (res.ok) return data as T;
  const reason = data?.error?.reason ?? "";
  if (res.status === 401) throw new SpotifyError("auth", "unauthorized");
  if (res.status === 404 || reason === "NO_ACTIVE_DEVICE") throw new SpotifyError("no-device", reason);
  if (res.status === 403) throw new SpotifyError(reason === "PREMIUM_REQUIRED" || /premium/i.test(data?.error?.message ?? "") ? "premium" : "forbidden", reason);
  throw new SpotifyError("network", `HTTP ${res.status}`);
}

type Image = { url: string; width?: number | null };
const smallest = (images?: Image[] | null) => images?.length ? [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0)).find((i) => (i.width ?? 0) >= 60)?.url ?? images[0]!.url : null;

export type NowPlaying = {
  playing: boolean;
  title: string;
  artist: string;
  image: string | null;
  progressMs: number;
  durationMs: number;
  at: number;
  device: string | null;
  contextUri: string | null;
};

export async function nowPlaying(uid: string): Promise<NowPlaying | null> {
  type Player = {
    is_playing: boolean; progress_ms: number | null; device?: { name: string } | null; context?: { uri: string } | null;
    item?: { name: string; duration_ms: number; artists?: { name: string }[]; album?: { images?: Image[] }; show?: { name: string; images?: Image[] }; images?: Image[] } | null;
  };
  const p = await api<Player>(uid, "/me/player?additional_types=episode");
  if (!p) return null;
  return {
    playing: p.is_playing,
    title: p.item?.name ?? "",
    artist: p.item?.artists?.map((a) => a.name).join(", ") ?? p.item?.show?.name ?? "",
    image: smallest(p.item?.album?.images ?? p.item?.images ?? p.item?.show?.images),
    progressMs: p.progress_ms ?? 0,
    durationMs: p.item?.duration_ms ?? 0,
    at: Date.now(),
    device: p.device?.name ?? null,
    contextUri: p.context?.uri ?? null,
  };
}

export type Device = { id: string; name: string; type: string; active: boolean };
export async function devices(uid: string): Promise<Device[]> {
  const d = await api<{ devices: { id: string | null; name: string; type: string; is_active: boolean; is_restricted: boolean }[] }>(uid, "/me/player/devices");
  return (d?.devices ?? []).filter((x) => x.id && !x.is_restricted).map((x) => ({ id: x.id!, name: x.name, type: x.type, active: x.is_active }));
}

/** Plays a playlist/album; with no active device, the first one available (else asks to open Spotify). */
export async function playContext(uid: string, contextUri: string) {
  const body = JSON.stringify({ context_uri: contextUri });
  try {
    await api(uid, "/me/player/play", { method: "PUT", body });
  } catch (e) {
    if (!(e instanceof SpotifyError) || e.kind !== "no-device") throw e;
    const list = await devices(uid);
    const target = list.find((d) => d.type === "Smartphone") ?? list[0];
    if (!target) throw e;
    await api(uid, `/me/player/play?device_id=${encodeURIComponent(target.id)}`, { method: "PUT", body });
  }
}

export const control = (uid: string, action: "play" | "pause" | "next" | "previous") =>
  action === "play" || action === "pause"
    ? api(uid, `/me/player/${action}`, { method: "PUT" })
    : api(uid, `/me/player/${action}`, { method: "POST" });

export const transfer = (uid: string, deviceId: string) => api(uid, "/me/player", { method: "PUT", body: JSON.stringify({ device_ids: [deviceId], play: true }) });

export type Collection = { uri: string; name: string; subtitle: string; image: string | null; kind: "playlist" | "album" };

type RawPlaylist = { uri: string; name: string; owner?: { display_name?: string }; images?: Image[] | null; tracks?: { total?: number }; items?: { total?: number } } | null;
const fromPlaylist = (p: NonNullable<RawPlaylist>): Collection => {
  const total = p.tracks?.total ?? p.items?.total;
  return { uri: p.uri, name: p.name, subtitle: [p.owner?.display_name, total ? `${total} músicas` : null].filter(Boolean).join(" · "), image: smallest(p.images), kind: "playlist" };
};

export async function myPlaylists(uid: string): Promise<Collection[]> {
  const d = await api<{ items: RawPlaylist[] }>(uid, "/me/playlists?limit=50");
  return (d?.items ?? []).filter((p): p is NonNullable<RawPlaylist> => !!p).map(fromPlaylist);
}

export async function searchSpotify(uid: string, q: string): Promise<Collection[]> {
  type Album = { uri: string; name: string; artists?: { name: string }[]; images?: Image[] } | null;
  const d = await api<{ playlists?: { items: RawPlaylist[] }; albums?: { items: Album[] } }>(uid, `/search?${new URLSearchParams({ q, type: "playlist,album", limit: "10", market: "from_token" })}`);
  const playlists = (d?.playlists?.items ?? []).filter((p): p is NonNullable<RawPlaylist> => !!p).map(fromPlaylist);
  const albums = (d?.albums?.items ?? []).filter((a): a is NonNullable<Album> => !!a)
    .map((a): Collection => ({ uri: a.uri, name: a.name, subtitle: `Álbum · ${a.artists?.map((x) => x.name).join(", ") ?? ""}`, image: smallest(a.images), kind: "album" }));
  return [...playlists, ...albums];
}
