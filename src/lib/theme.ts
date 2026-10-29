import { useSyncExternalStore } from "react";

/** Light or dark, chosen per device with the button in the header (kept in this browser only). */
export type Theme = "light" | "dark";

const STORAGE_KEY = "forma.theme";
// Status bar / browser chrome colour for each theme: the page background, so the top of the screen matches the app.
const BAR_COLOR: Record<Theme, string> = { light: "#fbf6ec", dark: "#0d1913" };

/**
 * Runs inline in <head> before the page paints, so a dark device never flashes the light theme.
 * It also creates the theme-color tag itself: one left to the route head would be added again on hydration
 * with the light colour, and the iPhone follows the last one.
 * Kept as a string because it goes into the document as is.
 */
export const THEME_BOOT_SCRIPT = `try{var d=localStorage.getItem("${STORAGE_KEY}")==="dark";if(d)document.documentElement.classList.add("dark");var m=document.createElement("meta");m.name="theme-color";m.content=d?"${BAR_COLOR.dark}":"${BAR_COLOR.light}";document.head.appendChild(m)}catch(e){}`;

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  let bar = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!bar) {
    bar = document.createElement("meta");
    bar.name = "theme-color";
    document.head.appendChild(bar);
  }
  bar.content = BAR_COLOR[theme];
}

// The <html> class is the single source: every useTheme (the header button, the switch in Configurações) reads it.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const current = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current, (): Theme => "light");
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    listeners.forEach((listener) => listener());
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the theme still changes for this visit.
    }
  };
  return [theme, toggle] as const;
}
