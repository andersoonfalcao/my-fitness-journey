import { useEffect, useState } from "react";
import { Check, Copy, HeartPulse, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { today, useLocal } from "@/lib/store";
import { createHealthKey, DEFAULT_STEPS_GOAL, HEALTH_INGEST_URL, healthKey, healthStatus, revokeHealthKey, STEPS_GOAL_KEY, type HealthMonth } from "@/lib/health";

/** Configurações: the personal key and the steps of the iPhone Shortcut that brings Health (Mi Band) data. */
export function HealthPanel() {
  const [status, setStatus] = useState<{ hasKey: boolean } | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [month] = useLocal<HealthMonth>(healthKey(today()), {});
  const last = Math.max(0, ...Object.values(month).map((d) => d.at));
  const [stepsGoal, setStepsGoal] = useLocal<number>(STEPS_GOAL_KEY, DEFAULT_STEPS_GOAL);
  // Typed freely and saved on leaving the field, so clearing it to type a new number doesn't fight back.
  const [stepsDraft, setStepsDraft] = useState<string | null>(null);

  useEffect(() => {
    healthStatus().then(setStatus, () => setStatus({ hasKey: false }));
  }, []);

  const make = async () => {
    if (status?.hasKey && !confirm("Gerar uma chave nova? A atual para de funcionar e o atalho precisa receber a nova.")) return;
    setBusy(true);
    try {
      setKey((await createHealthKey()).key);
      setStatus({ hasKey: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a chave.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!confirm("Desligar a chave? O atalho para de enviar até você gerar outra. Os dados já recebidos continuam.")) return;
    setBusy(true);
    try {
      await revokeHealthKey();
      setKey(null);
      setStatus({ hasKey: false });
      toast.success("Chave desligada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível desligar a chave.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"><HeartPulse className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Saúde do iPhone</h2>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${status?.hasKey ? "bg-[#3f9d6b]/15 text-[#3f9d6b]" : "bg-muted text-muted-foreground"}`}>
              {status === null ? "…" : status.hasKey ? "Ligada" : "Desligada"}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sono, passos, energia ativa, batimento em repouso e VO2 máx da sua Mi Band, pelo app Saúde. Um atalho do iPhone envia os dados ao forma.
          </p>
          {last > 0 && <p className="mt-1 text-xs font-semibold">Último envio: {new Date(last).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>}
        </div>
      </div>

      {key ? (
        <div className="space-y-2 rounded-2xl border-2 border-accent bg-accent/5 p-4">
          <p className="text-sm font-semibold">Sua chave (aparece só agora; copie para o atalho):</p>
          <CopyField label="Chave" value={key} />
          <CopyField label="Endereço" value={HEALTH_INGEST_URL} />
        </div>
      ) : (
        <Button type="button" disabled={busy || status === null} onClick={() => void make()} className="min-h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}{status?.hasKey ? "Gerar chave nova" : "Gerar chave"}
        </Button>
      )}

      <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Meta de passos por dia</span>
          <span className="block text-xs text-muted-foreground">Aparece no quadro da Mi Band, na tela Hoje</span>
        </span>
        <input type="number" inputMode="numeric" min={1000} max={50000} step={500} value={stepsDraft ?? stepsGoal}
          onChange={(e) => setStepsDraft(e.target.value)}
          onBlur={() => { const n = Number(stepsDraft); if (stepsDraft !== null && n >= 1000 && n <= 50000) setStepsGoal(Math.round(n)); setStepsDraft(null); }}
          className="w-28 rounded-xl border border-input bg-card px-3 py-2 text-center tabular-nums" />
      </label>

      <p className="text-xs text-muted-foreground">
        O lembrete “Sincronize a Mi Band” das 21:45 está em <b>Ajustes → Lembretes personalizados</b>, no topo desta tela, onde dá para mudar o horário.
      </p>

      <details className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">Como montar o atalho</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-snug">
          <li>No app <b>Atalhos</b>, toque em <b>+</b> e dê o nome <b>forma Saúde</b>.</li>
          <li>Adicione <b>Encontrar Amostras de Saúde</b>: tipo <b>Passos</b>, Data de Início <b>é hoje</b>. Depois <b>Calcular Estatísticas</b> → <b>Soma</b> e <b>Definir Variável</b> <i>passos</i>.</li>
          <li>Repita para <b>Energia Ativa</b> (Soma) → variável <i>energia</i>.</li>
          <li><b>Encontrar Amostras de Saúde</b>: <b>Frequência Cardíaca</b>, Data de Início <b>está no último 1 dia</b> → variável <i>batimentos</i>.</li>
          <li><b>Encontrar Amostras de Saúde</b>: <b>Análise do Sono</b>, Data de Fim <b>está no último 1 dia</b>. Em seguida, três vezes <b>Obter Detalhes de Amostras de Saúde</b> sobre esse resultado: <b>Valor</b> → <i>sonoTipo</i>, <b>Data de Início</b> → <i>sonoInicio</i>, <b>Data de Fim</b> → <i>sonoFim</i>.</li>
          <li><b>Encontrar Amostras de Saúde</b>: <b>Preparo Cardiovascular</b>, ordenar por <b>Data de Início</b>, <b>mais recente primeiro</b>, limite <b>1</b> → variável <i>vo2</i>.</li>
          <li><b>Obter Conteúdo do URL</b> com o <b>Endereço</b> acima, Método <b>POST</b>, Cabeçalho <b>Authorization</b> = <b>Bearer</b> + espaço + a <b>Chave</b>. Corpo <b>JSON</b>, todos como Texto: <i>steps</i> = passos, <i>activeKcal</i> = energia, <i>heartRates</i> = batimentos, <i>sleepValues</i> = sonoTipo, <i>sleepStarts</i> = sonoInicio, <i>sleepEnds</i> = sonoFim, <i>vo2max</i> = vo2.</li>
          <li>Termine com <b>Mostrar Resultado</b> (o conteúdo do URL). Rode uma vez e permita o acesso ao Saúde: deve aparecer “forma recebeu: …”.</li>
          <li>Em <b>Automação</b> → <b>+</b> → <b>App</b> → <b>Mi Fitness</b> → <b>É Aberto</b> → <b>Executar Imediatamente</b> → atalho <b>forma Saúde</b>. Assim ele roda sempre que a Mi Band sincroniza, com o iPhone desbloqueado.</li>
        </ol>
      </details>

      {status?.hasKey && !key && (
        <button type="button" onClick={() => void revoke()} disabled={busy} className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">
          Desligar a chave
        </button>
      )}
    </section>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não deu para copiar; toque e segure no texto para copiar.");
    }
  };
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="select-all break-all font-mono text-xs">{value}</div>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={() => void copy()} className="min-h-11 shrink-0 rounded-full" aria-label={`Copiar ${label.toLowerCase()}`}>
        {copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}
