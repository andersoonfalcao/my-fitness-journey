import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { NeedProfile, useCloseCalendar } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { askForma, CHAT_KEEP, CHAT_KEY, STARTERS, type ChatMessage } from "@/lib/ask";
import type { Plan } from "@/lib/plan";
import { KEYS, today, useHistory, useLocal, type Profile, type WeightEntry } from "@/lib/store";

export const Route = createFileRoute("/pergunte")({
  head: () => ({
    meta: [
      { title: "Pergunte ao forma — forma" },
      { name: "description", content: "Perguntas sobre treino, alimentação e sono respondidas com os seus próprios dados." },
    ],
  }),
  component: AskPage,
});

const time = (at: number) => new Date(at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function AskPage() {
  const close = useCloseCalendar();
  const uid = useAuth().user?.uid;
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [plan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog] = useLocal<string[]>(KEYS.done, []);
  const [cycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [history] = useHistory();
  const [messages, setMessages] = useLocal<ChatMessage[]>(CHAT_KEY, []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length || busy) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  if (!ready) return null;
  if (!profile) return <NeedProfile />;

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy || !uid) return;
    const mine: ChatMessage = { role: "eu", text: q.slice(0, 400), at: Date.now() };
    const past = messages;
    setMessages((m) => [...m, mine].slice(-CHAT_KEEP));
    setText("");
    setBusy(true);
    try {
      const answer = await askForma({ uid, date: today(), profile, weights, history, plan, doneCount: doneLog.length, cycleStart }, q, past);
      setMessages((m) => [...m, { role: "forma" as const, text: answer, at: Date.now() }].slice(-CHAT_KEEP));
    } catch (error) {
      // The question stays out so it can be sent again as it was.
      setMessages((m) => m.filter((x) => x !== mine));
      setText(q);
      toast.error(error instanceof Error ? error.message : "A IA não respondeu. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Com os seus dados</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Pergunte ao forma</h1>
        </div>
        <button type="button" onClick={close} aria-label="Fechar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Responde olhando o seu peso, refeições, treinos, sono e Mi Band dos últimos 30 dias. Toque numa pergunta pronta ou escreva a sua.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => void send(s)}
            className="min-h-11 rounded-full border border-border bg-card px-4 text-left text-sm font-semibold disabled:opacity-50">{s}</button>
        ))}
      </div>

      <div className="space-y-3" aria-live="polite">
        {messages.map((m) => m.role === "eu" ? (
          <div key={m.at} className="ml-auto w-fit max-w-[85%] rounded-[1.25rem] rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">{m.text}</div>
        ) : (
          <div key={m.at} className="max-w-[94%] space-y-3 rounded-[1.25rem] rounded-bl-md border border-border bg-card px-4 py-3 leading-relaxed">
            {m.text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
            <p className="text-xs text-muted-foreground">{time(m.at)}</p>
          </div>
        ))}
        {busy && (
          <div className="flex w-fit items-center gap-2 rounded-[1.25rem] rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Lendo os seus dados…
          </div>
        )}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-5 pr-1.5">
        <Sparkles className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={400} placeholder="Treino, dieta, sono…" aria-label="Sua pergunta"
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar pergunta"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Usa a mesma cota diária da IA do Fechar o dia e da foto do prato.</span>
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} className="inline-flex min-h-11 items-center gap-1.5 font-semibold">
            <Trash2 className="h-4 w-4" />Apagar conversa
          </button>
        )}
      </div>
    </div>
  );
}
