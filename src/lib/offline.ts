import { useEffect, useState } from "react";

/**
 * Registers the service worker (`dist/client/sw.js`, generated at build time by scripts/build-sw.mjs) so the
 * installed app opens without signal. Only in the published build: in dev there is no sw.js and a cached
 * page would hide code changes.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      registration.active?.postMessage("trim");
      // The iPhone often brings the installed app back from the background instead of opening it again, and then
      // nothing would look for a new version: look whenever the app comes back to the screen.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void registration.update().catch(() => undefined);
      });
    })
    .catch((error: unknown) => console.warn("forma: service worker não registrado", error));
  // A new version took over (its service worker skips waiting): reload once so the screen runs the new code
  // rather than the one it opened with. The first install has no earlier version to replace.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

/** Version of the build this device runs (the service worker's, as in the published sw.js); null in dev or offline-less browsers. */
export function useAppVersion() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    const worker = typeof navigator !== "undefined" ? navigator.serviceWorker?.controller : null;
    if (!worker) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent<{ version?: string }>) => setVersion(event.data.version ?? null);
    worker.postMessage("version", [channel.port2]);
    return () => channel.port1.close();
  }, []);
  return version;
}

/**
 * The "Atualizar o app" button in Configurações: looks for a new version now. When there is one, the page reloads
 * by itself as soon as it takes over (see registerServiceWorker); otherwise the page is reloaded from the network.
 */
export async function updateApp(): Promise<"nova" | "atual"> {
  const registration = typeof navigator !== "undefined" ? await navigator.serviceWorker?.getRegistration() : undefined;
  if (!registration) {
    window.location.reload();
    return "atual";
  }
  if (!navigator.onLine) throw new Error("Sem internet. Conecte e tente de novo.");
  await registration.update();
  if (registration.installing || registration.waiting) return "nova";
  window.location.reload();
  return "atual";
}
