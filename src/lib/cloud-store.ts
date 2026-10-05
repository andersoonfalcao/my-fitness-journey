import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

// Each key of the old localStorage store is one Firestore document: users/{uid}/data/{key} = { json }.
// Values are stored as a JSON string so any shape (nested arrays, undefined fields) round-trips unchanged.

type Entry = { value: unknown; ready: boolean; subs: Set<() => void>; stop?: () => void };
const entries = new Map<string, Entry>();

const ref = (uid: string, key: string) => doc(db(), "users", uid, "data", key);
const id = (uid: string, key: string) => `${uid}/${key}`;

function entry(uid: string, key: string): Entry {
  let e = entries.get(id(uid, key));
  if (!e) {
    e = { value: undefined, ready: false, subs: new Set() };
    entries.set(id(uid, key), e);
  }
  return e;
}

/** Subscribes to a key; the first subscriber opens the Firestore listener, the last one closes it. */
export function subscribeCloud(uid: string, key: string, onChange: () => void) {
  const e = entry(uid, key);
  e.subs.add(onChange);
  e.stop ??= onSnapshot(
    ref(uid, key),
    (snap) => {
      const json = snap.exists() ? (snap.data()["json"] as string | undefined) : undefined;
      e.value = json === undefined ? undefined : JSON.parse(json);
      e.ready = true;
      e.subs.forEach((fn) => fn());
    },
    () => {
      e.ready = true;
      e.subs.forEach((fn) => fn());
    },
  );
  return () => {
    e.subs.delete(onChange);
    if (e.subs.size === 0) {
      e.stop?.();
      entries.delete(id(uid, key));
    }
  };
}

export function readCloud<T>(uid: string, key: string, fallback: T): { value: T; ready: boolean } {
  const e = entries.get(id(uid, key));
  return { value: e?.value === undefined ? fallback : (e.value as T), ready: !!e?.ready };
}

/** Updates the cache immediately (every screen sees it) and saves to Firestore, which queues it while offline. */
export function writeCloud<T>(uid: string, key: string, value: T) {
  const e = entry(uid, key);
  e.value = value;
  e.subs.forEach((fn) => fn());
  void setDoc(ref(uid, key), { json: JSON.stringify(value), updatedAt: serverTimestamp() });
}

const LOCAL_KEYS = ["forma.profile", "forma.weights", "forma.loads", "forma.plan", "forma.done", "forma.session", "forma.history"];

/**
 * First login on a device that already has data from before accounts existed: copy it to that account,
 * unless the account already has a profile (then the cloud wins and nothing is overwritten).
 * Only the first account signed in on the device gets it, so a second person on a shared phone doesn't.
 */
export async function migrateLocalData(uid: string) {
  const marker = "forma.migrated";
  if (typeof window === "undefined" || localStorage.getItem(marker)) return;
  const raw = (key: string) => localStorage.getItem(key);
  const foods = JSON.parse(raw("forma.foods") ?? "[]") as { date: string }[];
  if (!LOCAL_KEYS.some(raw) && foods.length === 0) {
    localStorage.setItem(marker, "nada");
    return;
  }
  if ((await getDoc(ref(uid, "forma.profile"))).exists()) {
    localStorage.setItem(marker, "conta-ja-tinha-dados");
    return;
  }
  const batch = writeBatch(db());
  for (const key of LOCAL_KEYS) {
    const value = raw(key);
    if (value !== null) batch.set(ref(uid, key), { json: value, updatedAt: serverTimestamp() });
  }
  const byMonth = new Map<string, unknown[]>();
  for (const food of foods) byMonth.set(foodsKey(food.date), [...(byMonth.get(foodsKey(food.date)) ?? []), food]);
  for (const [key, list] of byMonth) batch.set(ref(uid, key), { json: JSON.stringify(list), updatedAt: serverTimestamp() });
  await batch.commit();
  localStorage.setItem(marker, `${uid} ${new Date().toISOString()}`);
  // The account now holds this data; remove the device copy so nobody else can pick it up.
  [...LOCAL_KEYS, "forma.foods"].forEach((key) => localStorage.removeItem(key));
}

/** Food entries are kept one document per month (a document holds at most 1 MB). */
export const foodsKey = (date: string) => `forma.foods.${date.slice(0, 7)}`;

/** Drops cached values when the user signs out, so the next account never sees them. */
export function resetCloudCache() {
  entries.forEach((e) => e.stop?.());
  entries.clear();
}
