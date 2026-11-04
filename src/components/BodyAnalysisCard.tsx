import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { BodyAnalysis } from "@/lib/store";

const STATUS: Record<BodyAnalysis["items"][number]["status"], { label: string; className: string }> = {
  bom: { label: "Bom", className: "bg-[#3f9d6b]/15 text-[#3f9d6b]" },
  atencao: { label: "Atenção", className: "bg-[#f2b84b]/20 text-[#a86d00] dark:text-[#f2b84b]" },
  melhorar: { label: "Melhorar", className: "bg-destructive/15 text-destructive" },
};

/**
 * The AI's reading of a bioimpedance: each number with where it stands, the target and how to get there, then the
 * next steps. `onRedo` asks for a new analysis (also used when a reading has none yet).
 */
export function BodyAnalysisCard({ analysis, busy, onRedo }: { analysis?: BodyAnalysis | undefined; busy?: boolean; onRedo?: () => void }) {
  if (!analysis) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm">
        <p className="text-muted-foreground">Esta medição ainda não tem análise com metas e o que fazer para melhorar os números.</p>
        {onRedo && (
          <button type="button" onClick={onRedo} disabled={busy} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-bold text-accent-foreground disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? "Analisando…" : "Analisar com a IA"}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-2xl bg-accent/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent"><Sparkles className="h-4 w-4" aria-hidden />Análise da IA</div>
      {analysis.summary && <p className="text-sm">{analysis.summary}</p>}
      {analysis.items.length > 0 && (
        <ul className="space-y-2">
          {analysis.items.map((it) => (
            <li key={it.metric} className="rounded-2xl bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{it.metric}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[it.status].className}`}>{STATUS[it.status].label}</span>
              </div>
              <div className="mt-1 text-sm tabular-nums text-muted-foreground">
                Agora <b className="text-foreground">{it.current}</b>{it.target && <> · meta <b className="text-foreground">{it.target}</b></>}
              </div>
              {it.how && <p className="mt-1 text-sm">{it.how}</p>}
            </li>
          ))}
        </ul>
      )}
      {analysis.actions.length > 0 && (
        <div>
          <div className="text-sm font-bold">O que fazer nas próximas semanas</div>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {analysis.actions.map((a) => <li key={a}>{a}</li>)}
          </ol>
        </div>
      )}
      {analysis.timeline && <p className="text-sm"><b>Prazo estimado:</b> {analysis.timeline}</p>}
      {analysis.measuring && <p className="text-xs text-muted-foreground"><b>Na próxima medição:</b> {analysis.measuring}</p>}
      {analysis.extras?.length ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-semibold">Outros números do laudo</summary>
          <ul className="mt-1 list-disc pl-5">{analysis.extras.map((e) => <li key={e}>{e}</li>)}</ul>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Feita em {new Date(analysis.createdAt).toLocaleDateString("pt-BR")}. Orientação geral, não substitui avaliação profissional.</span>
        {onRedo && (
          <button type="button" onClick={onRedo} disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-foreground disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Analisar de novo
          </button>
        )}
      </div>
    </div>
  );
}
