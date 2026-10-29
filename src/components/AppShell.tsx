import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { CalendarDays, Home, Moon, RefreshCw, Utensils, Scale, Dumbbell, Settings, Sparkles, Sun, User } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useEffect, useState, type ReactNode } from "react";
import { syncPush, useSettings } from "@/lib/push";
import { PushNotice } from "@/components/PushNotice";
import { CoachChat } from "@/components/CoachChat";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { syncStrava } from "@/lib/strava";
import { healthKey, isIos, runHealthShortcut, type HealthMonth } from "@/lib/health";
import { today, useLocal } from "@/lib/store";

/** Leaves the calendar back to the screen it was opened from (or Hoje when opened directly). */
export function useCloseCalendar() {
  const router = useRouter();
  return () => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: "/" }));
}

const NAV = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/alimentacao", label: "Alimentação", icon: Utensils },
  { to: "/corpo", label: "Corpo", icon: Scale },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  // A device with notifications on is kept subscribed and its reminder settings and sign-in fresh at the server.
  const [settings, , settingsReady] = useSettings();
  useEffect(() => {
    if (!settingsReady) return;
    void syncPush(settings);
    // An installed app stays open for days: coming back to it is the moment to check the subscription again.
    const onVisible = () => document.visibilityState === "visible" && void syncPush(settings);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [settingsReady, settings.reminder, settings.reminderTime, JSON.stringify(settings.custom), settings.weeklySummary, settings.monthlyReview]); // eslint-disable-line react-hooks/exhaustive-deps

  // Links like /alimentacao#agua: the section only exists once the account data loads, so wait for it a little.
  const { pathname, hash } = useLocation();
  const closeCalendar = useCloseCalendar();
  const [theme, toggleTheme] = useTheme();
  const [coachOpen, setCoachOpen] = useState(false);
  // Tapping the calendar (or the gear) again while it is open closes it.
  const toggle = (to: string) => (event: { preventDefault: () => void }) => {
    if (pathname !== to) return;
    event.preventDefault();
    closeCalendar();
  };
  const toggleCalendar = toggle("/calendario");
  const toggleSettings = toggle("/configuracoes");
  useEffect(() => {
    if (!hash) return;
    let tries = 0;
    const id = setInterval(() => {
      const target = document.getElementById(hash.replace(/^#/, ""));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target || ++tries > 30) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [pathname, hash]);

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-2xl font-extrabold text-primary">
            forma<span className="text-accent">.</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {[...NAV.slice(0, 1), { to: "/calendario", label: "Calendário" } as const, ...NAV.slice(1)].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={n.to === "/calendario" ? toggleCalendar : undefined}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-primary !text-primary-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {/* Header icons are grey and turn orange only while their screen or panel is open. */}
            <button type="button" onClick={() => setCoachOpen(true)} aria-label="Pergunte ao forma" title="Pergunte ao forma" aria-expanded={coachOpen}
              className={`rounded-full p-2.5 hover:text-foreground ${coachOpen ? "text-accent" : "text-muted-foreground"}`}>
              <Sparkles className="h-6 w-6" />
            </button>
            <RefreshButton />
            <Link to="/calendario" onClick={toggleCalendar} aria-label={pathname === "/calendario" ? "Fechar calendário" : "Calendário"} className="rounded-full p-2.5 text-muted-foreground hover:text-foreground md:hidden" activeProps={{ className: "!text-accent" }}>
              <CalendarDays className="h-6 w-6" />
            </Link>
            <button type="button" onClick={toggleTheme} aria-pressed={theme === "dark"} aria-label={theme === "dark" ? "Desativar modo escuro" : "Ativar modo escuro"}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"} className="rounded-full p-2.5 text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>
            <Link to="/configuracoes" onClick={toggleSettings} aria-label={pathname === "/configuracoes" ? "Fechar configurações" : "Configurações"} title="Configurações" className="rounded-full p-2.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "!text-accent" }}>
              <Settings className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>
      <CoachChat open={coachOpen} onOpenChange={setCoachOpen} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {pathname === "/" && <PushNotice />}
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
        <div className="mx-auto flex max-w-md justify-around py-2">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
              activeProps={{ className: "!text-accent" }}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function Ring({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const pct = Math.min(1, max ? value / max : 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-all duration-700" />
      </svg>
      <div className="text-center">
        <div className="font-display text-3xl font-extrabold">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

export function MacroBar({ name, value, max, color }: { name: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-semibold">{name}</span>
        <span className="text-muted-foreground">{Math.round(value)} / {max} g</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, max ? (value / max) * 100 : 0)}%`, background: color }} />
      </div>
    </div>
  );
}

export function NeedProfile() {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 text-center">
      <h2 className="text-2xl font-bold">Vamos começar pelo seu perfil</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">
        Responda algumas perguntas sobre você e sua meta. Com isso calculo suas calorias, macros e monto seu plano de treino.
      </p>
      <Link to="/perfil" className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground">
        Preencher perfil
      </Link>
    </div>
  );
}

/**
 * Next to the calendar, data only: on an iPhone whose Shortcut already sends Health data this month, runs it first
 * (Mi Band), then brings Strava's new activities. Screens update live; new versions come by themselves or in Configurações.
 */
function RefreshButton() {
  const uid = useAuth().user?.uid;
  const [health] = useLocal<HealthMonth>(healthKey(today()), {});
  const usesShortcut = isIos() && Object.keys(health).length > 0;
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      if (usesShortcut) await runHealthShortcut();
      if (!navigator.onLine) throw new Error("Sem internet. Conecte e tente de novo.");
      const strava = uid ? await syncStrava(uid, true) : null;
      const health = usesShortcut ? "Mi Band enviada. " : "";
      toast.success(strava === null ? `${health}Strava não conectado.`
        : `${health}${strava ? `${strava} ${strava === 1 ? "atividade nova" : "atividades novas"} do Strava.` : "Nada novo no Strava."}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar os dados.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={() => void run()} disabled={busy} aria-label={`Atualizar os dados: ${usesShortcut ? "Mi Band e " : ""}Strava`} title="Atualizar os dados"
      className={`rounded-full p-2.5 hover:text-foreground ${busy ? "text-accent" : "text-muted-foreground"}`}>
      <RefreshCw className={`h-6 w-6 ${busy ? "animate-spin" : ""}`} />
    </button>
  );
}
