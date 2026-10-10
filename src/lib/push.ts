import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { STRAVA_WORKER } from "./strava";
import { KEYS, useLocal } from "./store";

/**
 * Notifications that work with the app closed or the screen off, sent by the Worker (strava-worker/src/notify.ts)
 * through Web Push: the daily "what's left" reminder and the end of a rest. A phone suspends a page whose screen
 * is off, so the page itself can't fire them. Each device subscribes on its own; its id is kept on the device.
 */
const VAPID_PUBLIC_KEY = "BFcNxeLIMg6YibiqivRXJvPW9-OvgT4bdvQ7KKWNBmTr0hDchfSL-yt0XdmTHWW8BEU8LP1XImNLiQ762verpro";
const DEVICE_KEY = "forma.push.device";
const SYNCED_KEY = "forma.push.synced";
/** Set only by "Desativar notificações": without it, a device that has the permission stays subscribed. */
const OFF_KEY = "forma.push.off";

export type Settings = {
  /** Rest between sets, in seconds, for every exercise. */
  restSeconds: number;
  reminder: boolean;
  /** HH:MM, local time of the device that subscribed. */
  reminderTime: string;
  /** Reminders the person writes, each at its own time and weekdays. */
  custom: CustomReminder[];
  /** Sunday 20:00 notice that opens the weekly summary (/semana). */
  weeklySummary: boolean;
};
const WEEKLY: CustomReminder = { id: "semana", title: "Sua semana no forma", body: "Veja o resumo da semana e o foco para a próxima.", time: "20:00", days: [0], on: true, url: "/semana" };
export type CustomReminder = {
  id: string;
  title: string;
  body: string;
  /** HH:MM, local time. */
  time: string;
  /** Weekdays it goes out, 0 = Sunday … 6 = Saturday. */
  days: number[];
  on: boolean;
  /** Screen the notification opens (only the app's own reminders set it; the person's open Hoje). */
  url?: string | undefined;
};
export const MAX_REMINDERS = 10;
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const DEFAULT_SETTINGS: Settings = {
  restSeconds: 60,
  reminder: true,
  reminderTime: "21:00",
  // The Mi Band only reaches the app when Mi Fitness is opened (src/lib/health.ts), so the list starts with that nudge.
  custom: [{ id: "miband", title: "Sincronize a Mi Band", body: "Abra o Mi Fitness para o forma receber o sono, os passos e o batimento de hoje.", time: "21:45", days: EVERY_DAY, on: true }],
  weeklySummary: true,
};

export function useSettings() {
  const [stored, setStored, ready] = useLocal<Partial<Settings>>(KEYS.settings, {});
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const update = (patch: Partial<Settings>) => setStored((prev) => ({ ...prev, ...patch }));
  return [settings, update, ready] as const;
}

const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Private mode: the device simply re-subscribes next time.
    }
  },
};

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";

/** Id of this device at the Worker, when notifications were turned on here. */
export const deviceId = () => storage.get(DEVICE_KEY);

async function call(path: string, body: Record<string, unknown>) {
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new Error("Entre na sua conta para ativar as notificações.");
  const res = await fetch(`${STRAVA_WORKER}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Não foi possível falar com o servidor de notificações.");
  return data;
}

const keyBytes = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** Where this device stands: "broken" = it was turned on here but the phone no longer has the subscription. */
export type PushState = "unsupported" | "off" | "blocked" | "broken" | "on";

/** The phone's own subscription is what counts: it outlives the flags kept in localStorage and a restart of the app. */
async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  return { registration, subscription: (await registration?.pushManager.getSubscription().catch(() => null)) ?? null };
}

/** iOS may report `Notification.permission` as "default" after the app restarts although it was granted; the push manager knows. */
async function permissionGranted(registration: ServiceWorkerRegistration) {
  if (Notification.permission === "granted") return true;
  return (await registration.pushManager.permissionState({ userVisibleOnly: true }).catch(() => "prompt")) === "granted";
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const { registration, subscription } = await currentSubscription();
  if (subscription) return "on";
  if (Notification.permission === "denied") return "blocked";
  if (storage.get(OFF_KEY)) return "off";
  return deviceId() || (registration && (await permissionGranted(registration))) ? "broken" : "off";
}

const CHANGED = "forma:push";
const changed = () => window.dispatchEvent(new Event(CHANGED));

/** The state of this device, kept current on every screen that shows it (banner and Configurações). */
export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => {
    let alive = true;
    // A problem is only reported after the app had its chance to subscribe again on its own (syncPush).
    const read = () => void pushState().then((next) => alive && (settled || next === "on" || next === "unsupported") && setState(next));
    read();
    // Coming back to the app is when a subscription the phone dropped gets noticed.
    const onVisible = () => document.visibilityState === "visible" && read();
    window.addEventListener(CHANGED, read);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.removeEventListener(CHANGED, read);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return state;
}

/** Asks permission (needs a tap), subscribes this device and sends the reminder settings. */
export async function enablePush(settings: Settings) {
  if (!pushSupported()) throw new Error("Este navegador não recebe notificações. No iPhone, adicione o app à tela de início primeiro.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    changed();
    throw new Error("Notificações bloqueadas. Libere nos ajustes do aparelho para este app.");
  }
  storage.set(OFF_KEY, null);
  try {
    const registration = await navigator.serviceWorker.ready;
    await register(await subscribe(registration), settings);
  } finally {
    changed();
  }
}

const subscribe = async (registration: ServiceWorkerRegistration) =>
  (await registration.pushManager.getSubscription()) ??
  (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));

/** Tells the Worker where this device is reached and what to remind it of. */
async function register(subscription: PushSubscription, settings: Settings) {
  const user = auth().currentUser;
  const { id } = await call("/push/subscribe", {
    subscription: subscription.toJSON(),
    refreshToken: user?.refreshToken,
    daily: settings.reminder,
    time: settings.reminderTime,
    custom: [...settings.custom, ...(settings.weeklySummary ? [WEEKLY] : [])],
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  storage.set(DEVICE_KEY, id ?? null);
  storage.set(SYNCED_KEY, syncStamp(settings, subscription.endpoint));
}

/** Only this turns a device off: the choice is remembered so the app doesn't subscribe it again on its own. */
export async function disablePush() {
  const id = deviceId();
  storage.set(OFF_KEY, "1");
  storage.set(DEVICE_KEY, null);
  storage.set(SYNCED_KEY, null);
  if (id) await call("/push/unsubscribe", { id }).catch(() => undefined);
  const registration = await navigator.serviceWorker?.getRegistration();
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
  changed();
}

/** The endpoint is part of the stamp: a subscription the phone replaced reaches the server at once. */
const syncStamp = (s: Settings, endpoint: string) => JSON.stringify([new Date().toDateString(), endpoint, s.reminder, s.reminderTime, s.custom, s.weeklySummary]);

let syncing: Promise<void> | null = null;
let settled = false;

/**
 * Keeps a device that was turned on subscribed, with no tap: runs when the app opens and each time it comes back
 * to the screen. The subscription the phone holds is sent again when anything changed or once a day (which also
 * keeps the sign-in the reminder uses fresh and follows the device to another time zone); the device id is restored
 * if the app's storage lost it; and a subscription the phone dropped is made again while the permission stands.
 * Only when the phone refuses a new one without a tap does the device show as "broken" (PushNotice asks for the tap).
 */
export function syncPush(settings: Settings) {
  syncing ??= keepSubscribed(settings)
    .catch(() => undefined)
    .finally(() => {
      syncing = null;
      settled = true;
      changed();
    });
  return syncing;
}

async function keepSubscribed(settings: Settings) {
  if (!pushSupported() || storage.get(OFF_KEY)) return;
  const { registration, subscription: held } = await currentSubscription();
  if (!registration) return;
  let subscription = held;
  if (!subscription) {
    if (!(await permissionGranted(registration))) return;
    subscription = await subscribe(registration);
  }
  if (deviceId() && storage.get(SYNCED_KEY) === syncStamp(settings, subscription.endpoint)) return;
  await register(subscription, settings);
}

export const sendTestReminder = () => call("/push/test", { id: deviceId(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone });

/** Seconds the server waits before the closed-app test goes out: time to leave the app. */
export const CLOSED_TEST_SECONDS = 10;
export const sendClosedAppTest = () => call("/push/test", { id: deviceId(), delay: CLOSED_TEST_SECONDS });

/** Schedules the "rest is over" push for this device (no-op when notifications are off here). */
export function scheduleRestPush(endsAt: number, next: string) {
  const id = deviceId();
  if (id) void call("/push/rest", { id, endsAt, next }).catch(() => undefined);
}

export function cancelRestPush() {
  const id = deviceId();
  if (id) void call("/push/rest/cancel", { id }).catch(() => undefined);
}
