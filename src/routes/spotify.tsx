import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { finishSpotifyConnect } from "@/lib/spotify";

export const Route = createFileRoute("/spotify")({
  head: () => ({ meta: [{ title: "Conectando ao Spotify — forma" }] }),
  component: SpotifyCallback,
});

/** Spotify sends the person back here with ?code=…&state=… (or ?error=access_denied). */
function SpotifyCallback() {
  const uid = useAuth().user?.uid;
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (!uid || started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const done = (text: string, ok: boolean) => {
      if (ok) toast.success(text);
      else toast.error(text);
      void navigate({ to: "/configuracoes", replace: true });
    };
    if (!code) {
      done(params.get("error") === "access_denied" ? "Conexão com o Spotify cancelada." : "O Spotify não devolveu a autorização.", false);
      return;
    }
    finishSpotifyConnect(uid, code, params.get("state"))
      .then((auth) => done(`Spotify conectado${auth.name ? ` (${auth.name})` : ""}. A música aparece na barra do treino.`, true))
      .catch((error: unknown) => done(error instanceof Error && !("kind" in error) ? error.message : "Não foi possível conectar ao Spotify.", false));
  }, [uid, navigate]);

  return (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      Conectando ao Spotify…
    </div>
  );
}
