import { createFileRoute } from "@tanstack/react-router";
import { LogOut, X } from "lucide-react";
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

      <StravaCard />

      <HealthPanel />

      {isAdmin && <InvitesPanel />}
    </div>
  );
}
