import { useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CustomReminders } from "@/components/CustomReminders";
import { CLOSED_TEST_SECONDS, disablePush, enablePush, sendClosedAppTest, sendTestReminder, usePushState, useSettings, type Settings } from "@/lib/push";

const RESTS = [30, 45, 60, 75, 90, 120, 150, 180];
const restLabel = (s: number) => (s < 60 ? `${s} segundos` : s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)} min ${s % 60}s`);

/** Configurações (gear in the header): rest between sets and the notifications of this device. */
export function SettingsPanel() {
  const [settings, update] = useSettings();
  // "broken": turned on here before, but the phone no longer has the subscription (nothing arrives until reactivated).
  const state = usePushState();
  const subscribed = state === "on";
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

      <div className="space-y-4 border-t border-border pt-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${subscribed ? "bg-[#3f9d6b]/15 text-[#3f9d6b]" : "bg-muted text-muted-foreground"}`}>
            {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">Notificações</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${subscribed ? "bg-[#3f9d6b]/15 text-[#3f9d6b]" : "bg-muted text-muted-foreground"}`}>
                {subscribed ? "Ativadas" : state === "broken" ? "Pararam" : state === "blocked" ? "Bloqueadas" : "Desativadas"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {subscribed
                ? "Neste aparelho, o fim do descanso e os lembretes chegam mesmo com o app fechado ou a tela desligada."
                : state === "broken"
                ? "Este aparelho deixou de receber os avisos. Reative para voltarem a chegar com o app fechado."
                : state === "blocked"
                ? "Estão bloqueadas nos ajustes do aparelho (Notificações → forma). Libere lá e volte aqui."
                : "Avisam o fim do descanso com a tela desligada e trazem o lembrete do dia. Valem só para este aparelho."}
            </p>
          </div>
        </div>
        {subscribed ? (
          <Button type="button" variant="secondary" disabled={busy} className="min-h-11 w-full rounded-full"
            onClick={() => run(async () => { await disablePush(); toast.success("Notificações desativadas neste aparelho."); })}>
            {busy ? <Loader2 className="animate-spin" /> : <BellOff />}Desativar notificações
          </Button>
        ) : (
          <Button type="button" disabled={busy || state === "blocked"} className="min-h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => run(async () => { await enablePush(settings); toast.success("Notificações ativadas neste aparelho."); })}>
            {busy ? <Loader2 className="animate-spin" /> : <Bell />}{state === "broken" ? "Reativar notificações" : "Ativar notificações"}
          </Button>
        )}

        {subscribed && (
          <div className="rounded-2xl bg-muted/60 px-4 py-3">
            <Button type="button" variant="secondary" disabled={busy} className="min-h-11 w-full rounded-full"
              onClick={() => run(async () => { await sendClosedAppTest(); toast.success(`Saia do app agora: o aviso chega em ${CLOSED_TEST_SECONDS} segundos.`, { duration: 8000 }); })}>
              <Send />Testar com o app fechado
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">Toque e volte para a tela de início. Se o aviso não chegar, desative e ative as notificações aqui.</p>
          </div>
        )}

        <div className="divide-y divide-border rounded-2xl bg-muted/60">
          <label className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Lembrete diário</span>
              <span className="block text-xs text-muted-foreground">Avisa o que falta preencher no dia</span>
            </span>
            <Switch checked={settings.reminder} onCheckedChange={(on) => change({ reminder: on })} />
          </label>
          <label className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${settings.reminder ? "" : "opacity-50"}`}>
            <span className="text-sm font-semibold">Horário</span>
            <input type="time" step={300} value={settings.reminderTime} disabled={!settings.reminder}
              onChange={(e) => e.target.value && change({ reminderTime: e.target.value })}
              className="w-32 rounded-xl border border-input bg-card px-3 py-2 text-center" />
          </label>
        </div>
        <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Resumo da semana</span>
            <span className="block text-xs text-muted-foreground">Domingo às 20:00, abre a semana comparada com a anterior</span>
          </span>
          <Switch checked={settings.weeklySummary} onCheckedChange={(on) => change({ weeklySummary: on })} />
        </label>
        <p className="text-xs text-muted-foreground">
          O lembrete aponta refeições sem registro, água abaixo da meta, o treino da semana e se falta fechar o dia.
          {!subscribed && " Para recebê-lo, ative as notificações."}
        </p>
        {subscribed && settings.reminder && (
          <Button type="button" variant="secondary" size="sm" disabled={busy} className="rounded-full"
            onClick={() => run(async () => { await sendTestReminder(); toast.success("Lembrete enviado. Confira as notificações."); })}>
            <Send />Ver o lembrete agora
          </Button>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <CustomReminders list={settings.custom} onChange={(custom) => change({ custom })} subscribed={subscribed} />
      </div>
    </section>
  );
}
