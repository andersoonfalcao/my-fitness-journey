/**
 * Registers the service worker (`dist/client/sw.js`, generated at build time by scripts/build-sw.mjs) so the
 * installed app opens without signal. Only in the published build: in dev there is no sw.js and a cached
 * page would hide code changes.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => registration.active?.postMessage("trim"))
    .catch((error: unknown) => console.warn("forma: service worker não registrado", error));
}
