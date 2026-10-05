import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { disconnectStrava, startStravaConnect, stravaStatus, syncStrava } from "@/lib/strava";

/** Perfil: connect, sync or disconnect the user's own Strava account. */
export function StravaCard() {
  const uid = useAuth().user?.uid;
  const [status, setStatus] = useState<{ connected: boolean; athlete?: { name: string } } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    stravaStatus().then(setStatus, () => setStatus({ connected: false }));
  }, []);

  const sync = async () => {
    if (!uid) return;
    setBusy(true);
    try {
      const added = await syncStrava(uid, true);
      toast.success(added === null ? "O Strava foi desconectado; conecte de novo." : `${added} atividade(s) nova(s) importada(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao sincronizar.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Desconectar o Strava? As atividades já importadas continuam no histórico.")) return;
    setBusy(true);
    try {
      setStatus(await disconnectStrava());
      toast.success("Strava desconectado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao desconectar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><StravaLogo />Strava</h2>
          <p className="text-sm text-muted-foreground">
            {status === null
              ? "Verificando…"
              : status.connected
                ? `Conectado${status.athlete?.name ? ` como ${status.athlete.name}` : ""}. Corridas, pedais e outras atividades aparecem em Treinos e no fechamento do dia.`
                : "Traga suas corridas, pedais e outras atividades para o app (somente leitura)."}
          </p>
        </div>
        {status?.connected ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void sync()} className="rounded-full">
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Sincronizar
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void disconnect()} className="rounded-full text-muted-foreground">Desconectar</Button>
          </div>
        ) : (
          <Button type="button" disabled={status === null} onClick={startStravaConnect} className="rounded-full bg-[#fc4c02] text-white hover:bg-[#e34402]">
            Conectar ao Strava
          </Button>
        )}
      </div>
    </section>
  );
}

function StravaLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="#fc4c02">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
