import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useLocal } from "@/lib/store";
import { disconnectSpotify, redirectUri, SPOTIFY_APP_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_KEY, startSpotifyConnect, type SpotifyApp, type SpotifyAuth } from "@/lib/spotify";

/** Configurações: connect the person's Spotify, used as a remote control during the workout. */
export function SpotifyCard() {
  const uid = useAuth().user?.uid;
  const [auth, , ready] = useLocal<SpotifyAuth | null>(SPOTIFY_KEY, null);
  const [app, setApp] = useLocal<SpotifyApp | null>(SPOTIFY_APP_KEY, null);
  const clientId = SPOTIFY_CLIENT_ID || app?.clientId || "";
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = !!auth?.refresh;

  const connect = async () => {
    setBusy(true);
    try {
      await startSpotifyConnect(clientId);
    } catch {
      setBusy(false);
      toast.error("Não foi possível abrir o Spotify.");
    }
  };

  const saveId = () => {
    const id = draft.trim();
    if (!/^[0-9a-f]{32}$/i.test(id)) { toast.error("O Client ID tem 32 letras e números (painel do Spotify > seu app > Settings)."); return; }
    setApp({ clientId: id });
    setDraft("");
  };

  return (
    <section className="rounded-3xl surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold"><SpotifyLogo />Spotify</h2>
          <p className="text-sm text-muted-foreground">
            {!ready
              ? "Verificando…"
              : connected
                ? `Conectado${auth.name ? ` como ${auth.name}` : ""}. Durante o treino, o que está tocando aparece na barra do treino, com a troca de playlist.`
                : "Veja e troque a música durante o treino. A música toca no app do Spotify; controlar pede Premium."}
          </p>
        </div>
        {connected ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => { if (uid && confirm("Desconectar o Spotify?")) { disconnectSpotify(uid); toast.success("Spotify desconectado."); } }} className="rounded-full text-muted-foreground">Desconectar</Button>
        ) : clientId ? (
          <Button type="button" loading={busy} disabled={!ready} onClick={() => void connect()} className="rounded-full">Conectar ao Spotify</Button>
        ) : null}
      </div>
      {ready && !connected && !clientId && (
        <div className="mt-4 rounded-2xl bg-muted p-4 text-sm">
          <p>Para ligar, crie um app em <b>developer.spotify.com</b> (Web API), com esta Redirect URI:</p>
          <code className="mt-1 block break-all rounded-lg bg-card px-2 py-1.5 text-xs">{redirectUri()}</code>
          <p className="mt-2">Depois cole aqui o Client ID do app:</p>
          <div className="mt-2 flex gap-2">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Client ID" aria-label="Client ID do app Spotify" className="h-11 rounded-full font-mono" />
            <Button type="button" onClick={saveId} className="h-11 rounded-full">Salvar</Button>
          </div>
        </div>
      )}
      {ready && !connected && !SPOTIFY_CLIENT_ID && app?.clientId && (
        <button type="button" onClick={() => setApp(null)} className="mt-3 min-h-11 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Trocar o Client ID</button>
      )}
    </section>
  );
}

function SpotifyLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-accent" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
    </svg>
  );
}
