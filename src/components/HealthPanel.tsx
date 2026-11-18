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
    <section className="space-y-4 rounded-3xl surface-card p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"><HeartPulse className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Saúde do iPhone</h2>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${status?.hasKey ? "bg-success/15 text-success-text" : "bg-muted text-muted-foreground"}`}>
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
        <div className="space-y-2 rounded-2xl border border-brand-line bg-brand-soft p-4">
          <p className="text-sm font-semibold">Sua chave (aparece só agora; copie para o atalho):</p>
          <CopyField label="Valor do cabeçalho Authorization (já com Bearer)" value={`Bearer ${key}`} />
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

      <details className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Como montar o atalho</summary>
        <p className="mt-2 text-xs text-muted-foreground">No app Atalhos, cada “Obter Detalhes” e cada “Encontrar Amostras” vira uma variável com o nome indicado (toque no resultado → Renomear). Os nomes em azul no corpo JSON precisam ser escritos exatamente assim.</p>
        <ol className="mt-3 list-decimal space-y-3 pl-5 leading-snug">
          <li>No app <b>Atalhos</b>, toque em <b>+</b> e dê o nome <b>forma Saúde</b> (com esse nome: o botão de atualizar do forma procura por ele).</li>
          <li><b>Passos.</b> Adicione <b>Encontrar Amostras de Saúde</b>: tipo <b>Passos</b>, filtro <b>Data de Início é hoje</b>, sem agrupar nem somar. Depois, quatro vezes <b>Obter Detalhes de Amostras de Saúde</b> sobre esse resultado: <b>Valor</b> → <i>passosValor</i>, <b>Data de Início</b> → <i>passosInicio</i>, <b>Data de Fim</b> → <i>passosFim</i>, <b>Fonte</b> → <i>passosFonte</i>.</li>
          <li><b>Energia e distância.</b> Repita o passo 2 para <b>Energia Ativa</b> (<i>energiaValor</i>, <i>energiaInicio</i>, <i>energiaFim</i>, <i>energiaFonte</i>) e para <b>Distância de Caminhada + Corrida</b> (<i>distValor</i>, <i>distInicio</i>, <i>distFim</i>, <i>distFonte</i>).</li>
          <li><b>Batimentos.</b> <b>Encontrar Amostras de Saúde</b>: <b>Frequência Cardíaca</b>, filtro <b>Data de Início está no último 1 dia</b>, sem limite → <i>batimentos</i>.</li>
          <li><b>Sono.</b> <b>Encontrar Amostras de Saúde</b>: <b>Análise do Sono</b>, filtro <b>Data de Fim está no último 1 dia</b> (é a Data de <b>Fim</b>: o sono começa ontem à noite), sem limite, sem agrupar. Depois, quatro vezes <b>Obter Detalhes de Amostras de Saúde</b> sobre <b>esse mesmo resultado</b>: <b>Valor</b> → <i>sonoTipo</i>, <b>Data de Início</b> → <i>sonoInicio</i>, <b>Data de Fim</b> → <i>sonoFim</i>, <b>Fonte</b> → <i>sonoFonte</i>. Conta a noite que terminou entre 12h de ontem e 12h de hoje, só as fases de sono (Dormindo, Essencial, Profundo, REM); se mais de um app gravou a noite, vale o Zepp Life.</li>
          <li><b>VO2 máx.</b> <b>Encontrar Amostras de Saúde</b>: <b>Preparo Cardiovascular</b>, ordenar por <b>Data de Início</b>, <b>mais recente primeiro</b>, limite <b>1</b> → <i>vo2</i>.</li>
          <li><b>Envio.</b> <b>Obter Conteúdo do URL</b> com o <b>Endereço</b> acima, Método <b>POST</b>, Cabeçalho <b>Authorization</b> = o <b>Valor do cabeçalho</b> copiado acima, colado inteiro (já começa com <b>Bearer</b>; cada chave nova invalida a anterior). Corpo da requisição <b>JSON</b>, todos os campos do tipo <b>Texto</b>:
            <ul className="mt-1.5 grid gap-x-3 gap-y-0.5 font-mono text-xs sm:grid-cols-2">
              {([["stepValues", "passosValor"], ["stepStarts", "passosInicio"], ["stepEnds", "passosFim"], ["stepSources", "passosFonte"], ["kcalValues", "energiaValor"], ["kcalStarts", "energiaInicio"], ["kcalEnds", "energiaFim"], ["kcalSources", "energiaFonte"], ["distValues", "distValor"], ["distStarts", "distInicio"], ["distEnds", "distFim"], ["distSources", "distFonte"], ["heartRates", "batimentos"], ["sleepValues", "sonoTipo"], ["sleepStarts", "sonoInicio"], ["sleepEnds", "sonoFim"], ["sleepSources", "sonoFonte"], ["vo2max", "vo2"]] as const).map(([field, variable]) => (
                <li key={field}><span className="text-info-text">{field}</span> = {variable}</li>
              ))}
            </ul>
          </li>
          <li><b>Resultado.</b> Termine com <b>Mostrar Resultado</b> (o Conteúdo do URL). Rode uma vez e permita todos os acessos ao Saúde: deve aparecer “forma recebeu: sono …, passos …”.</li>
          <li><b>Automação.</b> Em <b>Automação</b> → <b>+</b> → <b>App</b> → <b>Mi Fitness</b> → <b>É Aberto</b> → <b>Executar Imediatamente</b> → atalho <b>forma Saúde</b>. Ele roda sempre que a Mi Band sincroniza, com o iPhone desbloqueado.</li>
          <li>Para mandar na hora, toque no botão de atualizar ao lado do calendário, no topo do forma.</li>
        </ol>
      </details>

      <details className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">O sono não chega?</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-snug">
          <li><b>O app da pulseira grava o sono no Saúde?</b> App <b>Saúde</b> → foto do perfil → <b>Apps</b> → <b>Zepp Life</b> (ou Mi Fitness): <b>Sono</b> ligado. Confira em Saúde → Navegar → Sono se a noite de hoje aparece lá.</li>
          <li><b>O atalho pode ler o sono?</b> <b>Ajustes</b> do iPhone → <b>Saúde</b> → <b>Acesso a Dados e Dispositivos</b> → <b>Atalhos</b>: <b>Análise do Sono</b> ligado. Quando o atalho foi criado, esse acesso pode ter ficado negado sem aviso.</li>
          <li><b>O filtro está certo?</b> No passo do sono, o filtro é <b>Data de Fim</b> no último 1 dia. “Data de Início é hoje” perde o sono que começou ontem à noite.</li>
          <li><b>As quatro variáveis vêm do mesmo resultado?</b> sonoTipo, sonoInicio, sonoFim e sonoFonte saem do mesmo “Encontrar Amostras” de Análise do Sono, e no JSON os nomes são <i>sleepValues</i>, <i>sleepStarts</i>, <i>sleepEnds</i> e <i>sleepSources</i>.</li>
          <li><b>Sincronizou antes?</b> Abra o app da pulseira e espere sincronizar; só então o sono da noite entra no Saúde. Rode o atalho de novo.</li>
          <li>A mensagem que o atalho mostra no fim traz uma linha “sono: …” com o total, a fonte usada e o horário (por exemplo “sono: 7h00 dormindo (Zepp Life · 23:30–06:50 · 4 fases)”), ou o motivo de o sono não ter entrado.</li>
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
