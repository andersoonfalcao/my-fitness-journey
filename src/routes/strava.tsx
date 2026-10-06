import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { finishStravaConnect, syncStrava } from "@/lib/strava";

export const Route = createFileRoute("/strava")({
  head: () => ({ meta: [{ title: "Conectando ao Strava — forma" }] }),
  component: StravaCallback,
});

/** Strava sends the user back here with ?code=…&state=… (or ?error=access_denied). */
function StravaCallback() {
  const uid = useAuth().user?.uid;
  const navigate = useNavigate();
  const [message, setMessage] = useState("Conectando ao Strava…");
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
      done(params.get("error") === "access_denied" ? "Conexão com o Strava cancelada." : "O Strava não devolveu a autorização.", false);
      return;
    }
    finishStravaConnect(code, params.get("state"))
      .then(async ({ athlete }) => {
        setMessage("Buscando suas atividades…");
        const added = await syncStrava(uid, true).catch(() => 0);
        done(`Strava conectado${athlete.name ? ` (${athlete.name})` : ""}. ${added ?? 0} atividade(s) importada(s).`, true);
      })
      .catch((error: unknown) => done(error instanceof Error ? error.message : "Não foi possível conectar ao Strava.", false));
  }, [uid, navigate]);

  return (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      {message}
    </div>
  );
}
