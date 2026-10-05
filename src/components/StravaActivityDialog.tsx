import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { ExternalLink, Loader2, Share2 } from "lucide-react";
import { ShareDialog, type ShareRequest } from "@/components/ShareDialog";
import { stravaCard } from "@/lib/share-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { decodePolyline, duration, km, pace, sportLabel, stravaActivityDetail, usesPace, type StravaActivity, type StravaDetail } from "@/lib/strava";

/** Full view of one Strava activity: numbers, route, per-km splits and extras, loaded on open. */
export function StravaActivityDialog({ activity, onClose }: { activity: StravaActivity | null; onClose: () => void }) {
  const uid = useAuth().user?.uid;
  const [detail, setDetail] = useState<StravaDetail | null>(null);
  const [error, setError] = useState("");
  const [share, setShare] = useState<ShareRequest | null>(null);

  useEffect(() => {
    setDetail(null);
    setError("");
    if (!activity || !uid) return;
    let alive = true;
    stravaActivityDetail(uid, activity).then(
      (d) => alive && (d ? setDetail(d) : setError("O Strava foi desconectado. Conecte de novo no Perfil.")),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : "Não foi possível carregar a atividade."),
    );
    return () => {
      alive = false;
    };
  }, [activity, uid]);

  return (
    <>
    <Dialog open={!!activity} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-lg">
        {activity && (
          <>
            <DialogHeader className="pr-8 text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-[#fc4c02]">
                {sportLabel(activity.sport)} ·{" "}
                {new Date(detail?.startLocal.replace("Z", "") ?? `${activity.date}T12:00:00`).toLocaleString("pt-BR", {
                  weekday: "long", day: "numeric", month: "long", ...(detail ? { hour: "2-digit", minute: "2-digit" } : {}),
                })}
              </div>
              <DialogTitle className="font-display text-2xl">{activity.name}</DialogTitle>
            </DialogHeader>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : !detail ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando os detalhes no Strava…</div>
            ) : (
              <DetailBody d={detail} onShare={() => setShare({ heading: "Sua atividade em uma imagem", title: `${detail.name} no forma.`, fileName: `forma-strava-${activity.date}.png`, make: (bg) => stravaCard(detail, bg) })} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    <ShareDialog request={share} onClose={() => setShare(null)} />
    </>
  );
}

function DetailBody({ d, onShare }: { d: StravaDetail; onShare: () => void }) {
  const paceSport = usesPace(d.sport);
  const speedOrPace = (mps: number | null) =>
    !mps ? null : paceSport ? pace(1000 / mps) : `${(mps * 3.6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/h`;
  const stats: [string, string | null][] = [
    ["Distância", d.distanceM ? `${km(d.distanceM)} km` : null],
    ["Tempo em movimento", duration(d.movingS)],
    [paceSport ? "Ritmo médio" : "Velocidade média", speedOrPace(d.avgSpeed)],
    [paceSport ? "Melhor ritmo" : "Velocidade máxima", speedOrPace(d.maxSpeed)],
    ["Tempo total", d.elapsedS !== d.movingS ? duration(d.elapsedS) : null],
    ["Elevação", d.elevationM ? `${d.elevationM} m` : null],
    ["FC média", d.avgHr ? `${d.avgHr} bpm` : null],
    ["FC máxima", d.maxHr ? `${d.maxHr} bpm` : null],
    ["Calorias", d.kcal ? `${d.kcal} kcal` : null],
    ["Cadência", d.avgCadence ? `${d.avgCadence} ${paceSport ? "ppm" : "rpm"}` : null],
    ["Potência média", d.avgWatts ? `${d.avgWatts} W` : null],
    ["Esforço relativo", d.sufferScore ? String(d.sufferScore) : null],
  ];
  // Memoized: a new array on every render would rebuild the map.
  const points = useMemo(() => (d.polyline ? decodePolyline(d.polyline) : []), [d.polyline]);

  return (
    <div className="space-y-5">
      {points.length > 1 && <RouteMap points={points} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.filter((s): s is [string, string] => !!s[1]).map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-muted/60 px-3 py-2">
            <div className="font-display text-lg font-bold leading-tight tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      {d.description && <p className="whitespace-pre-line rounded-2xl bg-secondary p-3 text-sm">{d.description}</p>}
      {d.splits.length > 1 && (
        <section>
          <h3 className="font-bold">Parciais por km</h3>
          <table className="mt-2 w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-1 font-semibold">Km</th><th className="font-semibold">{paceSport ? "Ritmo" : "Velocidade"}</th><th className="font-semibold">FC</th><th className="text-right font-semibold">Elev.</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.splits.map((s) => (
                <tr key={s.km}>
                  <td className="py-1.5">{s.distanceM < 950 ? km(s.distanceM) : s.km}</td>
                  <td>{speedOrPace(s.avgSpeed)}</td>
                  <td>{s.avgHr ? `${s.avgHr} bpm` : "—"}</td>
                  <td className="text-right">{s.elevationM > 0 ? "+" : ""}{s.elevationM} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          {[d.device, d.prCount ? `${d.prCount} recorde(s) pessoal(is)` : null, d.achievements ? `${d.achievements} conquista(s)` : null, d.kudos ? `${d.kudos} kudos` : null]
            .filter(Boolean).join(" · ")}
        </span>
        <button type="button" onClick={onShare} className="inline-flex items-center gap-1 font-bold text-accent">
          <Share2 className="h-3.5 w-3.5" />Compartilhar
        </button>
        <a href={`https://www.strava.com/activities/${d.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#fc4c02]">
          Ver no Strava<ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

/**
 * Street map (OpenStreetMap standard tiles: free, no key, attribution required; CARTO now needs a key) with the route
 * on top: start in green, finish in orange. Leaflet touches `window`, so it loads only in the browser.
 */
function RouteMap({ points }: { points: [number, number][] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false, zoomSnap: 0.25 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const route = L.polyline(points, { color: "#fc4c02", weight: 4, opacity: 0.95 }).addTo(map);
      const dot = (color: string) => ({ radius: 6, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 });
      L.circleMarker(points[0]!, dot("#1f4d3a")).addTo(map);
      L.circleMarker(points.at(-1)!, dot("#fc4c02")).addTo(map);
      map.fitBounds(route.getBounds(), { padding: [18, 18] });
      // The dialog animates open; measure again once it has its final size.
      setTimeout(() => {
        map?.invalidateSize();
        map?.fitBounds(route.getBounds(), { padding: [18, 18] });
      }, 300);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={container} role="img" aria-label="Mapa do percurso da atividade" className="z-0 h-60 w-full shrink-0 overflow-hidden rounded-2xl border border-border" />;
}
