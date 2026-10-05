import { useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deviceId, disablePush, enablePush, pushSupported, sendTestReminder, useSettings, type Settings } from "@/lib/push";

const RESTS = [30, 45, 60, 75, 90, 120, 150, 180];
const restLabel = (s: number) => (s < 60 ? `${s} segundos` : s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)} min ${s % 60}s`);

/** Perfil → Ajustes: rest between sets and the notifications of this device. */
export function SettingsPanel() {
  const [settings, update] = useSettings();
  const [subscribed, setSubscribed] = useState(() => typeof window !== "undefined" && !!deviceId() && pushSupported() && Notification.permission === "granted");
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não deu certo. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  // On a subscribed device, AppShell sends reminder changes to the server as soon as they are saved.
  const change = (patch: Partial<Settings>) => update(patch);

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">Ajustes</h2>

      <label className="block">
        <span className="text-sm font-semibold">Descanso entre séries</span>
        <select value={settings.restSeconds} onChange={(e) => update({ restSeconds: Number(e.target.value) })}
          className="mt-1 block w-full rounded-xl border border-input bg-card px-3 py-2.5 sm:w-56">
          {RESTS.map((s) => <option key={s} value={s}>{restLabel(s)}{s === 60 ? " (padrão)" : ""}</option>)}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">Vale para todos os exercícios. Depois da última série de um exercício não há contagem.</span>
      </label>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold">Notificações neste aparelho</h3>
            <p className="text-sm text-muted-foreground">
              {subscribed
                ? "Ativadas: o fim do descanso avisa mesmo com a tela desligada."
                : "Ative para ser avisado do fim do descanso com a tela desligada e receber o lembrete do dia."}
            </p>
          </div>
          {subscribed ? (
            <Button type="button" variant="secondary" disabled={busy} className="rounded-full"
              onClick={() => run(async () => { await disablePush(); setSubscribed(false); toast.success("Notificações desativadas neste aparelho."); })}>
              {busy ? <Loader2 className="animate-spin" /> : <BellOff />}Desativar
            </Button>
          ) : (
            <Button type="button" disabled={busy} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => run(async () => { await enablePush(settings); setSubscribed(true); toast.success("Notificações ativadas neste aparelho."); })}>
              {busy ? <Loader2 className="animate-spin" /> : <Bell />}Ativar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="inline-flex items-center gap-3 text-sm font-semibold">
            <Switch checked={settings.reminder} onCheckedChange={(on) => change({ reminder: on })} />
            Lembrete do que falta preencher
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            às
            <input type="time" step={300} value={settings.reminderTime} disabled={!settings.reminder}
              onChange={(e) => e.target.value && change({ reminderTime: e.target.value })}
              className="rounded-xl border border-input bg-card px-3 py-2 disabled:opacity-50" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Todo dia nesse horário: refeições sem registro, água abaixo da meta, treino da semana e fechar o dia.
          {!subscribed && " Ative as notificações acima para receber."}
        </p>
        {subscribed && settings.reminder && (
          <Button type="button" variant="secondary" size="sm" disabled={busy} className="rounded-full"
            onClick={() => run(async () => { await sendTestReminder(); toast.success("Lembrete enviado. Confira as notificações."); })}>
            <Send />Ver o lembrete agora
          </Button>
        )}
      </div>
    </section>
  );
}
