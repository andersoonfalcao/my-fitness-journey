import { useEffect, useState } from "react";

/** Light or dark, chosen per device with the button in the header (kept in this browser only). */
export type Theme = "light" | "dark";

const STORAGE_KEY = "forma.theme";
// Status bar / browser chrome colour for each theme: the page background, so the top of the screen matches the app.
const BAR_COLOR: Record<Theme, string> = { light: "#fbf6ec", dark: "#0d1913" };

/**
 * Runs inline in <head> before the page paints, so a dark device never flashes the light theme.
 * Kept as a string because it goes into the document as is.
 */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="dark"){document.documentElement.classList.add("dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${BAR_COLOR.dark}")}}catch(e){}`;

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOR[theme]);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the theme still changes for this visit.
    }
  };
  return [theme, toggle] as const;
}
