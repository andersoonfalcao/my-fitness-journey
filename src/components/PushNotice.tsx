import { useState } from "react";
import { BellOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enablePush, usePushState, useSettings } from "@/lib/push";

const DISMISSED_KEY = "forma.push.dismissed";
const dismissedBefore = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Warns, on every screen, that this device gets nothing while the app is closed: notifications were never turned
 * on here, the phone dropped the subscription (a reinstalled home-screen app starts empty) or they are blocked.
 * Without it the app would fall back to its own in-page notice, which only runs while it is open, and say nothing.
 * Only "never turned on" can be dismissed; a subscription that stopped keeps asking until it is fixed.
 */
export function PushNotice() {
  const state = usePushState();
  const [settings, , ready] = useSettings();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(dismissedBefore);

  if (state !== "off" && state !== "broken" && state !== "blocked") return null;
  if (state === "off" && dismissed) return null;

  const activate = async () => {
    setBusy(true);
    try {
      await enablePush(settings);
      toast.success("Notificações ativadas neste aparelho.", { description: "Em Configurações dá para testar com o app fechado." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não deu certo. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: it just shows again next time.
    }
  };

  const title = state === "broken" ? "As notificações pararam neste aparelho" : state === "blocked" ? "Notificações bloqueadas" : "Notificações desligadas neste aparelho";
  const text =
    state === "blocked"
      ? "Libere nos ajustes do aparelho (Notificações → forma). Sem isso, nada chega com o app fechado."
      : "Com o app fechado, o fim do descanso e os lembretes não chegam.";

  return (
    <div role="status" className="mb-5 rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
        </div>
        {state === "off" && (
          <button type="button" onClick={dismiss} aria-label="Dispensar aviso" className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {state !== "blocked" && (
        <Button type="button" disabled={busy || !ready} onClick={activate} className="mt-3 min-h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
          {busy && <Loader2 className="animate-spin" />}
          {state === "broken" ? "Reativar notificações" : "Ativar notificações"}
        </Button>
      )}
    </div>
  );
}
