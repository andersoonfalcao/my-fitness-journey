import { useEffect } from "react";

/**
 * Keeps the screen on while a workout runs, so the rest countdown and its beep keep working between sets.
 * The browser drops the lock whenever the app goes to the background; it is taken again on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release();
        else lock = next;
      } catch {
        // Battery saver or an unsupported device: the workout simply runs without the screen lock.
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [active]);
}

/** Asks once (on starting a workout, a tap) to show a notification when a rest ends with the app in the background. */
export function askRestNotifications() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
}

/**
 * Notification for the end of a rest, only when the app isn't on screen (on screen, the beep and toast do it).
 * Phones only show notifications through the service worker; the plain constructor is the desktop fallback.
 * Best effort: a phone may pause a background app, delaying the notice until the app runs again.
 */
export async function notifyRestOver(next: string) {
  if (document.visibilityState === "visible" || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: `Próxima: ${next}`,
    tag: "forma-descanso",
    renotify: true,
    vibrate: [300, 150, 300],
    icon: "/icon-192.png",
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification("Descanso acabou!", options);
    else new Notification("Descanso acabou!", options);
  } catch {
    // Notifications blocked by the system: the beep and the toast still run when the app comes back.
  }
}
