import { Link } from "@tanstack/react-router";
import { Camera, X } from "lucide-react";
import { useState } from "react";
import { today, useLocal } from "@/lib/store";
import { addDays } from "@/lib/week";
import { PHOTO_EVERY_DAYS, PHOTOS_KEY, type PhotoEntry } from "@/lib/photos";

const DISMISS_KEY = "forma.photos.notice";

/**
 * Avisos: two weeks after the last progress photo, a reminder to take the next one. Only for someone who has taken
 * at least one (nobody is asked to start); closing it waits another two weeks.
 */
export function PhotosNotice() {
  const [photos, , ready] = useLocal<PhotoEntry[]>(PHOTOS_KEY, []);
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) ?? ""; } catch { return ""; } });
  if (!ready || photos.length === 0) return null;
  const last = photos.map((p) => p.date).sort().at(-1)!;
  if (last > addDays(today(), -PHOTO_EVERY_DAYS)) return null;
  if (dismissed && dismissed > addDays(today(), -PHOTO_EVERY_DAYS)) return null;
  const days = Math.round((new Date(`${today()}T12:00:00`).getTime() - new Date(`${last}T12:00:00`).getTime()) / 86_400_000);
  return (
    <section role="status" className="flex items-center gap-3 rounded-3xl surface-card py-1 pl-4 pr-2">
      <Camera className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <Link to="/fotos" className="flex min-h-12 min-w-0 flex-1 flex-col justify-center py-1.5">
        <span className="text-sm font-bold">Hora da foto de progresso</span>
        <span className="text-xs text-muted-foreground">A última foi há {days} dias. Mesma luz, mesmo lugar.</span>
      </Link>
      <button type="button" aria-label="Lembrar daqui a duas semanas" onClick={() => { const d = today(); setDismissed(d); try { localStorage.setItem(DISMISS_KEY, d); } catch { /* private mode */ } }}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground"><X className="h-5 w-5" /></button>
    </section>
  );
}
