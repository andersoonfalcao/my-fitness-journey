import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Bell, Download, Dumbbell, Info, Link2, Loader2, LogOut, Moon, RefreshCw, UserRound, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { today } from "@/lib/store";
import { useCloseCalendar } from "@/components/AppShell";
import { HealthPanel } from "@/components/HealthPanel";
import { InvitesPanel } from "@/components/InvitesPanel";
import { NotificationSettings, ReminderSettings, RestSetting } from "@/components/SettingsPanel";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/lib/theme";
import { StravaCard } from "@/components/StravaCard";
import { logout, useAuth } from "@/lib/auth";
import { updateApp, useAppVersion } from "@/lib/offline";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — forma" },
      { name: "description", content: "Descanso entre séries, notificações, conta, Strava e convites." },
    ],
  }),
  component: ConfiguracoesPage,
});

const GROUPS = [
  { id: "treino", label: "Treino", icon: Dumbbell },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "aparencia", label: "Aparência", icon: Moon },
  { id: "conexoes", label: "Conexões", icon: Link2 },
  { id: "conta", label: "Conta e dados", icon: UserRound },
  { id: "sobre", label: "Sobre o app", icon: Info },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

/** One category of the settings: a small heading (the target of the shortcuts at the top) and its cards. */
function Group({ id, title, children }: { id: GroupId; title?: string; children: ReactNode }) {
  const group = GROUPS.find((g) => g.id === id)!;
  const Icon: LucideIcon = group.icon;
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-24 space-y-3">
      <h2 id={`${id}-titulo`} className="flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />{title ?? group.label}
      </h2>
      {children}
    </section>
  );
}

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

      <nav aria-label="Categorias" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {GROUPS.filter((g) => g.id !== "sobre").map(({ id, label, icon: Icon }) => (
          <a key={id} href={`#${id}`} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-semibold">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />{label}
          </a>
        ))}
      </nav>

      <Group id="treino">
        <RestSetting />
      </Group>

      <Group id="notificacoes" title="Notificações e lembretes">
        <NotificationSettings />
        <ReminderSettings />
      </Group>

      <Group id="aparencia">
        <ThemeSetting />
      </Group>

      <Group id="conexoes">
        <StravaCard />
        <HealthPanel />
      </Group>

      <Group id="conta">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-6">
          <div className="min-w-0">
            <h3 className="text-xl font-bold">Conta</h3>
            <p className="text-sm text-muted-foreground">{user?.email}{isAdmin ? " · administrador" : ""}</p>
          </div>
          <button onClick={() => { if (confirm("Sair da sua conta neste aparelho?")) void logout(); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold">
            <LogOut className="h-4 w-4" />Sair
          </button>
        </section>
        <ExportData />
        {isAdmin && <InvitesPanel />}
      </Group>

      <Group id="sobre">
        <AppVersion />
      </Group>
    </div>
  );
}

/** Aparência: the same light/dark switch as the moon/sun in the header. */
function ThemeSetting() {
  const [theme, toggle] = useTheme();
  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <label className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xl font-bold">Modo escuro</span>
          <span className="block text-sm text-muted-foreground">Vale para este aparelho. Também dá para trocar pela lua no topo.</span>
        </span>
        <Switch checked={theme === "dark"} onCheckedChange={toggle} />
      </label>
    </section>
  );
}

/** Which build this device runs, and a button to fetch the newest one right away. */
function AppVersion() {
  const version = useAppVersion();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      if ((await updateApp()) === "nova") toast("Baixando a versão nova…", { description: "O app recarrega sozinho em alguns segundos." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível procurar atualização.");
      setBusy(false);
    }
  };
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-6">
      <div className="min-w-0">
        <h3 className="text-xl font-bold">Versão do app</h3>
        <p className="text-sm text-muted-foreground">
          Neste aparelho: <span className="font-mono text-foreground">{version ?? "—"}</span>. O app também procura sozinho sempre que é aberto.
        </p>
      </div>
      <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />Atualizar o app
      </button>
    </section>
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
        <h3 className="text-xl font-bold">Cópia dos seus dados</h3>
        <p className="text-sm text-muted-foreground">Um arquivo com tudo o que a conta guarda: perfil, refeições, pesagens, treinos e saúde.</p>
      </div>
      <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Baixar meus dados
      </button>
    </section>
  );
}
