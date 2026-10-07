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

export type Settings = {
  /** Rest between sets, in seconds, for every exercise. */
  restSeconds: number;
  reminder: boolean;
  /** HH:MM, local time of the device that subscribed. */
  reminderTime: string;
  /** Reminders the person writes, each at its own time and weekdays. */
  custom: CustomReminder[];
};
export type CustomReminder = {
  id: string;
  title: string;
  body: string;
  /** HH:MM, local time. */
  time: string;
  /** Weekdays it goes out, 0 = Sunday … 6 = Saturday. */
  days: number[];
  on: boolean;
};
export const MAX_REMINDERS = 10;
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const DEFAULT_SETTINGS: Settings = {
  restSeconds: 60,
  reminder: true,
  reminderTime: "21:00",
  // The Mi Band only reaches the app when Mi Fitness is opened (src/lib/health.ts), so the list starts with that nudge.
  custom: [{ id: "miband", title: "Sincronize a Mi Band", body: "Abra o Mi Fitness para o forma receber o sono, os passos e o batimento de hoje.", time: "21:45", days: EVERY_DAY, on: true }],
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

/** Asks permission (needs a tap), subscribes this device and sends the reminder settings. */
export async function enablePush(settings: Settings) {
  if (!pushSupported()) throw new Error("Este navegador não recebe notificações. No iPhone, adicione o app à tela de início primeiro.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notificações bloqueadas. Libere nas configurações do navegador para este site.");
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const user = auth().currentUser;
  const { id } = await call("/push/subscribe", {
    subscription: subscription.toJSON(),
    refreshToken: user?.refreshToken,
    daily: settings.reminder,
    time: settings.reminderTime,
    custom: settings.custom,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  storage.set(DEVICE_KEY, id ?? null);
  storage.set(SYNCED_KEY, syncStamp(settings));
}

export async function disablePush() {
  const id = deviceId();
  storage.set(DEVICE_KEY, null);
  storage.set(SYNCED_KEY, null);
  if (id) await call("/push/unsubscribe", { id }).catch(() => undefined);
  const registration = await navigator.serviceWorker?.getRegistration();
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
}

const syncStamp = (s: Settings) => JSON.stringify([new Date().toDateString(), s.reminder, s.reminderTime, s.custom]);

/**
 * On app open: a subscribed device sends its settings again when they changed or once a day, which also keeps the
 * sign-in the reminder uses fresh and follows the device to another time zone.
 */
export async function syncPush(settings: Settings) {
  if (!deviceId() || !pushSupported() || Notification.permission !== "granted") return;
  if (storage.get(SYNCED_KEY) === syncStamp(settings)) return;
  await enablePush(settings).catch(() => undefined);
}

export const sendTestReminder = () => call("/push/test", { id: deviceId(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone });

/** Schedules the "rest is over" push for this device (no-op when notifications are off here). */
export function scheduleRestPush(endsAt: number, next: string) {
  const id = deviceId();
  if (id) void call("/push/rest", { id, endsAt, next }).catch(() => undefined);
}

export function cancelRestPush() {
  const id = deviceId();
  if (id) void call("/push/rest/cancel", { id }).catch(() => undefined);
}
