import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { KEYS, today, useHistory, useLocal, type Profile, type WeightEntry } from "@/lib/store";
import type { Plan } from "@/lib/plan";
import { askCoach, COACH_STORAGE_KEY, type CoachMessage } from "@/lib/coach";

const SUGGESTIONS = [
  "Minhas cargas estão evoluindo?",
  "Estou comendo proteína suficiente?",
  "Como foi minha semana?",
  "O que devo melhorar agora?",
];

function loadConversation(): CoachMessage[] {
  try {
    const saved = JSON.parse(localStorage.getItem(COACH_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(saved) ? (saved as CoachMessage[]).filter((m) => (m.role === "user" || m.role === "coach") && typeof m.text === "string") : [];
  } catch {
    return [];
  }
}

/**
 * "Pergunte ao forma": a chat opened from the header, answering about the person's own workouts, weight and food
 * with their real numbers (src/lib/coach.ts).
 */
export function CoachChat({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const uid = useAuth().user?.uid;
  const [profile] = useLocal<Profile | null>(KEYS.profile, null);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [plan] = useLocal<Plan | null>(KEYS.plan, null);
  const [history] = useHistory();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setMessages(loadConversation());
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // Private mode or blocked storage: the conversation lasts while the chat is open.
    }
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy || !uid || !profile) return;
    const past = messages;
    setMessages([...past, { role: "user", text: q }]);
    setText("");
    setError(null);
    setBusy(true);
    try {
      const answer = await askCoach(q, past, { uid, date: today(), profile, weights, history, plan });
      setMessages((all) => [...all, { role: "coach", text: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível falar com a IA. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[92dvh] max-w-2xl flex-col rounded-t-3xl border-t border-border bg-background text-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-6 sm:h-[80dvh] sm:rounded-3xl sm:border"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-display text-lg font-bold leading-tight">Pergunte ao forma</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">Treinos, cargas, peso e alimentação, com os seus registros</DialogPrimitive.Description>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={() => { setMessages([]); setError(null); }} aria-label="Começar nova conversa" title="Nova conversa"
                className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:text-foreground"><RotateCcw className="h-5 w-5" /></button>
            )}
            <DialogPrimitive.Close aria-label="Fechar" className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Pergunte o que quiser sobre o seu treino e a sua alimentação. As respostas usam os seus números: cargas, séries, peso, calorias, proteína e sono.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => void send(s)} disabled={!profile}
                      className="min-h-11 rounded-2xl border border-border bg-card px-4 py-2.5 text-left text-sm font-semibold hover:border-primary">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <li key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <span className={`max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user" ? "rounded-br-lg bg-primary text-primary-foreground" : "rounded-bl-lg bg-muted"}`}>
                      {m.role === "coach" && <span className="sr-only">forma: </span>}{m.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {busy && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-3xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />Olhando seus registros…
              </p>
            )}
            {error && <p role="alert" className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm">{error}</p>}
            <div ref={end} />
          </div>

          <form
            onSubmit={(event) => { event.preventDefault(); void send(text); }}
            className="flex items-end gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <label htmlFor="coach-question" className="sr-only">Sua pergunta</label>
            <textarea
              id="coach-question"
              rows={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(text); } }}
              placeholder={profile ? "Sua pergunta" : "Preencha o perfil primeiro"}
              disabled={!profile}
              maxLength={500}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button type="submit" disabled={busy || !text.trim() || !profile} aria-label="Enviar pergunta"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
            </button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
