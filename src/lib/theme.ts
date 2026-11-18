import { useSyncExternalStore } from "react";

/** The theme on screen. */
export type Theme = "light" | "dark";
/** What the person chose: follow the device (default), or always light / dark. Kept in this browser only. */
export type ThemePreference = "system" | Theme;

const STORAGE_KEY = "forma.theme";
// Status bar / browser chrome colour for each theme: the page background (--bg in styles.css).
const BAR_COLOR: Record<Theme, string> = { light: "#f7f8fa", dark: "#0f1115" };
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs inline in <head> before the page paints, so the page never flashes the wrong theme.
 * No saved choice (or "system") follows the device. It also creates the theme-color tag itself: one left to the
 * route head would be added again on hydration with the light colour, and the iPhone follows the last one.
 * Kept as a string because it goes into the document as is.
 */
export const THEME_BOOT_SCRIPT = `try{var p=localStorage.getItem("${STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("${DARK_QUERY}").matches);if(d)document.documentElement.classList.add("dark");var m=document.createElement("meta");m.name="theme-color";m.content=d?"${BAR_COLOR.dark}":"${BAR_COLOR.light}";document.head.appendChild(m)}catch(e){}`;

const readPreference = (): ThemePreference => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
};

const systemTheme = (): Theme => (window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light");
const resolve = (pref: ThemePreference): Theme => (pref === "system" ? systemTheme() : pref);

function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (root.classList.contains("dark") !== (theme === "dark")) {
    // A short cross-fade (styles.css, .theme-switching); prefers-reduced-motion turns it off there.
    if (animate) {
      root.classList.add("theme-switching");
      window.setTimeout(() => root.classList.remove("theme-switching"), 300);
    }
    root.classList.toggle("dark", theme === "dark");
  }
  let bar = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!bar) {
    bar = document.createElement("meta");
    bar.name = "theme-color";
    document.head.appendChild(bar);
  }
  bar.content = BAR_COLOR[theme];
}

// The <html> class is the single source of the theme on screen; every hook reads it.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
let watchingSystem = false;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // While the choice is "system", follow the device switching between light and dark.
  if (!watchingSystem && typeof window !== "undefined" && window.matchMedia) {
    watchingSystem = true;
    window.matchMedia(DARK_QUERY).addEventListener("change", () => {
      if (readPreference() !== "system") return;
      apply(systemTheme(), true);
      notify();
    });
  }
  return () => listeners.delete(listener);
};
const current = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

/** Sets and saves the choice ("system" forgets the manual one). */
export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Private mode or blocked storage: the theme still changes for this visit.
  }
  apply(resolve(pref), true);
  notify();
}

/** The theme on screen and a toggle (header button): switches to the other one and saves it. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current, (): Theme => "light");
  const toggle = () => setThemePreference(theme === "dark" ? "light" : "dark");
  return [theme, toggle] as const;
}

/** The saved choice, for the Sistema / Claro / Escuro control in Configurações. */
export function useThemePreference() {
  const pref = useSyncExternalStore(subscribe, readPreference, (): ThemePreference => "system");
  return [pref, setThemePreference] as const;
}
