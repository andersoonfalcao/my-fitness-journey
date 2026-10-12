import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Download, Loader2, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { today } from "@/lib/store";
import { useCloseCalendar } from "@/components/AppShell";
import { HealthPanel } from "@/components/HealthPanel";
import { InvitesPanel } from "@/components/InvitesPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { StravaCard } from "@/components/StravaCard";
import { logout, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — forma" },
      { name: "description", content: "Descanso entre séries, notificações, conta, Strava e convites." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const close = useCloseCalendar();
  const { user, isAdmin } = useAuth();
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Configurações</p>
          <h1 className="mt-1 text-4xl font-extrabold">Ajustes do app</h1>
        </div>
        <button type="button" onClick={close} aria-label="Fechar configurações" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
          <X className="h-6 w-6" />
        </button>
      </div>

      <SettingsPanel />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-6">
        <div>
          <h2 className="text-xl font-bold">Conta</h2>
          <p className="text-sm text-muted-foreground">{user?.email}{isAdmin ? " · administrador" : ""}</p>
        </div>
        <button onClick={() => { if (confirm("Sair da sua conta neste aparelho?")) void logout(); }}
          className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold">
          <LogOut className="h-4 w-4" />Sair
        </button>
      </section>

      <ExportData />

      <StravaCard />

      <HealthPanel />

      {isAdmin && <InvitesPanel />}
    </div>
  );
}

/** A file with every record of the account (the free Firebase plan has no automatic backups). */
function ExportData() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const snap = await getDocs(collection(db(), "users", user.uid, "data"));
      const data: Record<string, unknown> = {};
      snap.forEach((d) => {
        const json = d.data()["json"] as string | undefined;
        data[d.id] = json === undefined ? null : JSON.parse(json);
      });
      const text = JSON.stringify({ app: "forma", exportedAt: new Date().toISOString(), email: user.email, data }, null, 1);
      const file = new File([text], `forma-dados-${today()}.json`, { type: "application/json" });
      // The iPhone's home-screen app has no downloads: the share sheet saves to Arquivos.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meus dados do forma" });
      } else {
        const url = URL.createObjectURL(file);
        const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`Cópia gerada com ${snap.size} registros.`);
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") toast.error("Não foi possível gerar a cópia. Confira a conexão e tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-6">
      <div className="min-w-0">
        <h2 className="text-xl font-bold">Cópia dos seus dados</h2>
        <p className="text-sm text-muted-foreground">Um arquivo com tudo o que a conta guarda: perfil, refeições, pesagens, treinos e saúde.</p>
      </div>
      <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Baixar meus dados
      </button>
    </section>
  );
}
