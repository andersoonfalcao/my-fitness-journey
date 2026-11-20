import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, ListMusic, Loader2, Music, Pause, Play, Search, SkipBack, SkipForward, Smartphone, Speaker } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useLocal } from "@/lib/store";
import {
  control, devices, myPlaylists, nowPlaying, playContext, searchSpotify, SPOTIFY_KEY, SpotifyError, spotifyMessage, transfer,
  type Collection, type Device, type NowPlaying, type SpotifyAuth,
} from "@/lib/spotify";

const POLL_MS = 5000;

/** What is playing, refreshed every few seconds while the screen is visible; `null` = nothing playing. */
function useNowPlaying(uid: string | undefined, enabled: boolean) {
  const [now, setNow] = useState<NowPlaying | null | undefined>(undefined);
  const [error, setError] = useState<SpotifyError | null>(null);
  const refresh = useCallback(async () => {
    if (!uid) return;
    try {
      setNow(await nowPlaying(uid));
      setError(null);
    } catch (e) {
      setError(e instanceof SpotifyError ? e : new SpotifyError("network", String(e)));
    }
  }, [uid]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [enabled, refresh]);

  return { now, setNow, error, refresh };
}

/** Progress of the song, moving each second between two readings. */
function useProgress(now: NowPlaying | null | undefined) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!now?.playing) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [now]);
  if (!now?.durationMs) return 0;
  const ms = now.progressMs + (now.playing ? Date.now() - now.at : 0);
  return Math.min(1, ms / now.durationMs);
}

/**
 * Mini player in the workout bar (and in focus mode's top bar): cover, song, previous/play/next.
 * Tapping the song opens the picker with the person's playlists and a search. Hidden until Spotify is connected.
 */
export function SpotifyBar({ className = "" }: { className?: string }) {
  const uid = useAuth().user?.uid;
  const [auth] = useLocal<SpotifyAuth | null>(SPOTIFY_KEY, null);
  const connected = !!auth?.refresh;
  const { now, setNow, error, refresh } = useNowPlaying(uid, connected);
  const progress = useProgress(now);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!connected || !uid) return null;

  const act = async (action: "play" | "pause" | "next" | "previous") => {
    setBusy(true);
    if (now && (action === "play" || action === "pause")) setNow({ ...now, playing: action === "play", progressMs: now.progressMs + (now.playing ? Date.now() - now.at : 0), at: Date.now() });
    try {
      await control(uid, action);
    } catch (e) {
      if (e instanceof SpotifyError && e.kind === "no-device") setPicker(true);
      toast.error(spotifyMessage(e));
    } finally {
      setBusy(false);
      setTimeout(() => void refresh(), 600);
    }
  };

  const nothing = now === null || (now !== undefined && !now.title);
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-surface-2 ${className}`}>
      <div className="flex items-center gap-2 py-1.5 pl-1.5 pr-1">
        <button type="button" onClick={() => setPicker(true)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left pressable"
          aria-label={now?.title ? `Tocando ${now.title}, de ${now.artist}. Trocar a música` : "Escolher o que tocar no Spotify"}>
          {now?.image
            ? <img src={now.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted-foreground"><Music className="h-5 w-5" aria-hidden /></span>}
          <span className="min-w-0 flex-1">
            {now === undefined && !error ? (
              <span className="block text-sm text-muted-foreground">Spotify…</span>
            ) : error && now === undefined ? (
              <span className="block truncate text-sm text-muted-foreground">{spotifyMessage(error)}</span>
            ) : nothing ? (
              <><span className="block text-sm font-semibold">Spotify</span><span className="block text-xs text-muted-foreground">Toque para escolher uma playlist</span></>
            ) : (
              <><span className="block truncate text-sm font-semibold">{now!.title}</span><span className="block truncate text-xs text-muted-foreground">{now!.artist}{now!.device ? ` · ${now!.device}` : ""}</span></>
            )}
          </span>
        </button>
        {!nothing && now && (
          <div className="flex shrink-0 items-center">
            <button type="button" disabled={busy} onClick={() => void act("previous")} aria-label="Música anterior" className="grid h-11 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50"><SkipBack className="h-5 w-5" /></button>
            <button type="button" disabled={busy} onClick={() => void act(now.playing ? "pause" : "play")} aria-label={now.playing ? "Pausar" : "Tocar"}
              className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-background disabled:opacity-50">{now.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}</button>
            <button type="button" disabled={busy} onClick={() => void act("next")} aria-label="Próxima música" className="grid h-11 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50"><SkipForward className="h-5 w-5" /></button>
          </div>
        )}
      </div>
      {!nothing && now && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-3" aria-hidden><div className="h-full bg-brand transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} /></div>}
      <SpotifyPicker open={picker} onClose={() => setPicker(false)} uid={uid} playingUri={now?.contextUri ?? null}
        onPlayed={() => { setTimeout(() => void refresh(), 800); }} />
    </div>
  );
}

/** Bottom sheet: the person's playlists, a search (playlists and albums) and, when nothing is playing, the devices. */
function SpotifyPicker({ open, onClose, uid, playingUri, onPlayed }: { open: boolean; onClose: () => void; uid: string; playingUri: string | null; onPlayed: () => void }) {
  const [tab, setTab] = useState<"minhas" | "buscar">("minhas");
  const [mine, setMine] = useState<Collection[] | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Collection[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [deviceList, setDeviceList] = useState<Device[] | null>(null);
  const [needDevice, setNeedDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchId = useRef(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    myPlaylists(uid).then(setMine, (e: unknown) => { setMine([]); setError(spotifyMessage(e)); });
    devices(uid).then(setDeviceList, () => setDeviceList([]));
  }, [open, uid]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setFound(null); return; }
    const id = ++searchId.current;
    setSearching(true);
    const timer = setTimeout(() => {
      searchSpotify(uid, q)
        .then((list) => { if (id === searchId.current) setFound(list); }, (e: unknown) => { if (id === searchId.current) { setFound([]); setError(spotifyMessage(e)); } })
        .finally(() => { if (id === searchId.current) setSearching(false); });
    }, 350);
    return () => clearTimeout(timer);
  }, [query, uid]);

  const play = async (c: Collection) => {
    setStarting(c.uri);
    setError(null);
    try {
      await playContext(uid, c.uri);
      toast.success(`Tocando ${c.name}`);
      onPlayed();
      onClose();
    } catch (e) {
      if (e instanceof SpotifyError && e.kind === "no-device") setNeedDevice(true);
      setError(spotifyMessage(e));
    } finally {
      setStarting(null);
    }
  };

  const playOn = async (d: Device) => {
    setStarting(d.id);
    try {
      await transfer(uid, d.id);
      setNeedDevice(false);
      setError(null);
      onPlayed();
      toast.success(`Tocando em ${d.name}`);
    } catch (e) {
      setError(spotifyMessage(e));
    } finally {
      setStarting(null);
    }
  };

  const list = tab === "minhas" ? mine : found;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-auto bottom-0 left-0 flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-b-none rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-[50%] sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:pb-0">
        <div className="shrink-0 px-5 pb-3 pt-5">
          <DialogTitle className="flex items-center gap-2 pr-10 text-xl"><ListMusic className="h-5 w-5 text-accent" aria-hidden />Música do treino</DialogTitle>
          <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {([["minhas", "Suas playlists"], ["buscar", "Buscar"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`min-h-10 rounded-full text-sm font-semibold transition-colors ${tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>
            ))}
          </div>
          {tab === "buscar" && (
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Playlist, álbum ou artista" aria-label="Buscar no Spotify" className="h-11 rounded-full pl-9" />
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {(error || needDevice) && (
            <div className="mx-2 mb-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm">
              {error && <p className="font-semibold text-warning-text">{error}</p>}
              {needDevice && (
                <>
                  {deviceList && deviceList.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {deviceList.map((d) => (
                        <li key={d.id}>
                          <button type="button" onClick={() => void playOn(d)} className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-card px-3 text-left font-semibold">
                            {d.type === "Smartphone" ? <Smartphone className="h-4 w-4" aria-hidden /> : <Speaker className="h-4 w-4" aria-hidden />}
                            <span className="flex-1 truncate">Tocar em {d.name}</span>
                            {starting === d.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <a href="spotify:" className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent underline-offset-4 hover:underline">
                    <ExternalLink className="h-4 w-4" aria-hidden />Abrir o Spotify
                  </a>
                </>
              )}
            </div>
          )}

          {list === null ? (
            tab === "buscar" && !searching
              ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">Busque playlists e álbuns do Spotify.</p>
              : <div className="grid place-items-center py-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando" /></div>
          ) : list.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{tab === "minhas" ? "Nenhuma playlist salva na sua conta." : searching ? "Buscando…" : "Nada encontrado."}</p>
          ) : (
            <ul>
              {list.map((c) => (
                <li key={c.uri}>
                  <button type="button" disabled={!!starting} onClick={() => void play(c)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left hover:bg-muted disabled:opacity-60">
                    {c.image
                      ? <img src={c.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted-foreground"><Music className="h-5 w-5" aria-hidden /></span>}
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-semibold ${c.uri === playingUri ? "text-accent" : ""}`}>{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.uri === playingUri ? "Tocando agora" : c.subtitle}</span>
                    </span>
                    {starting === c.uri ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" /> : <Play className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
