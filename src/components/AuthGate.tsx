import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, LogOut, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  authErrorMessage,
  logout,
  resendVerification,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  useAuth,
} from "@/lib/auth";

/** Shows the app only to signed-in, verified and invited users; everyone else gets the matching screen. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "ready") return <>{children}</>;
  if (status === "loading") {
    return (
      <Screen>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </Screen>
    );
  }
  if (status === "unverified") return <VerifyEmail />;
  if (status === "not-invited") return <NotInvited />;
  return <LoginForm />;
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center font-display text-5xl font-extrabold text-primary">
          forma<span className="text-accent">.</span>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

type Mode = "entrar" | "criar" | "esqueci";

function LoginForm() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Invite links open straight on "create password" with the invited e-mail filled in.
  useEffect(() => {
    const invited = new URLSearchParams(window.location.search).get("convite");
    if (invited) {
      setMode("criar");
      setEmail(invited);
    }
  }, []);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "entrar") void run(() => signInWithEmail(email, password));
    else if (mode === "criar") void run(() => signUpWithEmail(email, password));
    else void run(async () => {
      await resetPassword(email);
      setSent(true);
    });
  };

  const titles: Record<Mode, [string, string]> = {
    entrar: ["Entrar", "Use o e-mail do seu convite."],
    criar: ["Criar sua senha", "Só para e-mails convidados. Use o mesmo e-mail do convite."],
    esqueci: ["Esqueci a senha", "Enviamos um link para você criar uma nova senha."],
  };

  return (
    <Screen>
      <h1 className="text-2xl font-bold">{titles[mode][0]}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{titles[mode][1]}</p>

      {mode === "esqueci" && sent ? (
        <div className="mt-5 rounded-2xl bg-secondary p-4 text-sm">
          Se existir uma conta para <b>{email}</b>, o e-mail de redefinição chega em instantes. Confira também o spam.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold">E-mail</span>
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </label>
          {mode !== "esqueci" && (
            <label className="block">
              <span className="text-sm font-semibold">Senha</span>
              <Input
                type="password"
                autoComplete={mode === "criar" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </label>
          )}
          <Button type="submit" disabled={busy} className="w-full rounded-full">
            {busy && <Loader2 className="animate-spin" />}
            {mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>
      )}

      {mode === "entrar" && (
        <button type="button" onClick={() => setMode("esqueci")} className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Esqueci a senha
        </button>
      )}

      {mode !== "esqueci" && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void run(signInWithGoogle)} className="w-full rounded-full">
            <GoogleIcon />Entrar com Google
          </Button>
        </>
      )}

      <div className="mt-5 border-t border-border pt-4 text-center text-sm">
        {mode === "entrar" ? (
          <>Recebeu um convite? <button type="button" onClick={() => setMode("criar")} className="font-semibold text-primary underline-offset-4 hover:underline">Criar senha</button></>
        ) : (
          <button type="button" onClick={() => { setMode("entrar"); setSent(false); }} className="font-semibold text-primary underline-offset-4 hover:underline">Voltar para entrar</button>
        )}
      </div>
    </Screen>
  );
}

function VerifyEmail() {
  const { user, recheck } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <MailCheck className="h-8 w-8 text-accent" />
      <h1 className="mt-2 text-2xl font-bold">Confirme seu e-mail</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enviamos um link para <b>{user?.email}</b>. Abra o e-mail, toque no link e volte aqui. Confira também o spam.
      </p>
      <Button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await recheck();
          setBusy(false);
        }}
        className="mt-5 w-full rounded-full"
      >
        {busy && <Loader2 className="animate-spin" />}Já confirmei
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => resendVerification().then(() => toast.success("E-mail reenviado"), (e) => toast.error(authErrorMessage(e)))}
        className="mt-2 w-full rounded-full"
      >
        Reenviar e-mail
      </Button>
      <SignOutLink />
    </Screen>
  );
}

function NotInvited() {
  const { user } = useAuth();
  return (
    <Screen>
      <h1 className="text-2xl font-bold">E-mail sem convite</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <b>{user?.email}</b> ainda não foi convidado para o app. Peça o convite ao administrador e entre de novo.
      </p>
      <SignOutLink />
    </Screen>
  );
}

function SignOutLink() {
  return (
    <button type="button" onClick={() => void logout()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <LogOut className="h-4 w-4" />Sair e usar outro e-mail
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
