import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { Bell, CalendarDays, Dumbbell, Home, Moon, Plus, RefreshCw, Settings, Sparkles, Sun, TrendingUp, User, UserRound } from "lucide-react";
import { ProgressBar, ProgressRing } from "@/components/ui/meter";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useEffect, useState, type ReactNode } from "react";
import { syncPush, useSettings } from "@/lib/push";
import { NoticeList, useNoticeCount } from "@/components/NoticeCenter";
import { QuickLog } from "@/components/QuickLog";
import { CoachChat } from "@/components/CoachChat";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { syncStrava } from "@/lib/strava";
import { healthKey, isIos, runHealthShortcut, type HealthMonth } from "@/lib/health";
import { KEYS, today, useLocal, type Profile } from "@/lib/store";

/** Leaves the calendar back to the screen it was opened from (or Hoje when opened directly). */
export function useCloseCalendar() {
  const router = useRouter();
  return () => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: "/" }));
}

/** Header icon buttons: 44 px round targets, grey until their screen or panel is open. */
// 40 px circles that still answer a 44 px touch (::after), so six fit beside the logo on a 360 px phone.
const HEADER_ICON = "pressable relative grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground after:absolute after:-inset-0.5 after:content-['']";

/** Tab bar (phones and tablets): four screens around the "+", which opens the quick log. */
const TABS = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
  { to: "/avisos", label: "Avisos", icon: Bell },
] as const;
/** Top menu on wide screens: every main screen. */
const MENU = [
  { to: "/", label: "Hoje" },
  { to: "/calendario", label: "Calendário" },
  { to: "/alimentacao", label: "Alimentação" },
  { to: "/corpo", label: "Corpo" },
  { to: "/treinos", label: "Treinos" },
  { to: "/evolucao", label: "Evolução" },
  { to: "/avisos", label: "Avisos" },
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
  const [logOpen, setLogOpen] = useState(false);
  const [profile] = useLocal<Profile | null>(KEYS.profile, null);
  const [probe, setProbe] = useState<HTMLDivElement | null>(null);
  const notices = useNoticeCount(probe);
  const badge = (to: string) => to === "/avisos" && notices > 0 && pathname !== "/avisos" ? notices : 0;
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

  // Tapping the "rest is over" notice with the app open (sw.js): the workout opens on the exercise being done.
  const navigate = useNavigate();
  useEffect(() => {
    const worker = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "descanso") void navigate({ to: "/treinos", search: {}, hash: "exercicio-atual" });
    };
    worker?.addEventListener("message", onMessage);
    return () => worker?.removeEventListener("message", onMessage);
  }, [navigate]);

  // iPhone: after the keyboard closes, Safari can leave the page shifted by the keyboard's height and the
  // fixed tab bar floats above the bottom of the screen. Re-applying the scroll once the keyboard is gone
  // makes it lay the fixed elements out again.
  useEffect(() => {
    const realign = () => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.matches("input, textarea, select, [contenteditable='true']")) return;
      window.scrollTo(window.scrollX, window.scrollY);
    };
    const onFocusOut = () => setTimeout(realign, 100);
    const vv = window.visualViewport;
    document.addEventListener("focusout", onFocusOut);
    vv?.addEventListener("resize", realign);
    return () => {
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", realign);
    };
  }, []);

  return (
    <div className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 py-1.5 pl-4 pr-2 md:px-4">
          <Link to="/" aria-label="forma, início" className="font-display text-2xl font-bold tracking-tight text-foreground">
            forma<span className="text-brand">.</span>
          </Link>
          <nav className="hidden gap-1 lg:flex">
            {MENU.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={n.to === "/calendario" ? toggleCalendar : undefined}
                activeOptions={{ exact: n.to === "/" }}
                className="pressable rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "!bg-brand-soft !text-accent" }}
              >
                {n.label}
                {badge(n.to) > 0 && <span className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1 text-xs font-bold text-on-warning tabular-nums">{badge(n.to)}</span>}
              </Link>
            ))}
          </nav>
          <div className="flex items-center">
            {/* Header icons are grey and turn emerald only while their screen or panel is open. */}
            <button type="button" onClick={() => setCoachOpen(true)} aria-label="Pergunte ao forma" title="Pergunte ao forma" aria-expanded={coachOpen}
              className={`${HEADER_ICON} ${coachOpen ? "!text-accent bg-brand-soft" : ""}`}>
              <Sparkles className="h-[22px] w-[22px]" />
            </button>
            <RefreshButton />
            <Link to="/calendario" onClick={toggleCalendar} aria-label={pathname === "/calendario" ? "Fechar calendário" : "Calendário"} className={`${HEADER_ICON} lg:hidden`} activeProps={{ className: "!text-accent bg-brand-soft" }}>
              <CalendarDays className="h-[22px] w-[22px]" />
            </Link>
            <button type="button" onClick={toggleTheme} aria-pressed={theme === "dark"} aria-label={theme === "dark" ? "Desativar modo escuro" : "Ativar modo escuro"}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"} className={HEADER_ICON}>
              {theme === "dark" ? <Sun className="h-[22px] w-[22px]" /> : <Moon className="h-[22px] w-[22px]" />}
            </button>
            <Link to="/configuracoes" onClick={toggleSettings} aria-label={pathname === "/configuracoes" ? "Fechar configurações" : "Configurações"} title="Configurações" className={HEADER_ICON} activeProps={{ className: "!text-accent bg-brand-soft" }}>
              <Settings className="h-[22px] w-[22px]" />
            </Link>
            <Link to="/perfil" aria-label="Perfil" title="Perfil" className={`${HEADER_ICON} ml-0.5`} activeProps={{ className: "ring-2 ring-brand" }}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft font-display text-sm font-bold uppercase text-accent">{(profile?.name || "").trim().charAt(0) || <User className="h-4 w-4" />}</span>
            </Link>
          </div>
        </div>
      </header>
      <CoachChat open={coachOpen} onOpenChange={setCoachOpen} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
      {/* The notices live in Avisos; this hidden copy only counts them for the badge (fresh on every screen change). */}
      <div hidden aria-hidden key={pathname} ref={setProbe}>{pathname !== "/avisos" && <NoticeList profile={profile} />}</div>
      <nav aria-label="Principal" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/90 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-start px-1 pt-1.5">
          {TABS.slice(0, 2).map((n: (typeof TABS)[number]) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="group flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200"
              activeProps={{ className: "!text-accent", "aria-current": "page" }}
            >
              <span className="relative grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 group-aria-[current=page]:bg-brand-soft">
                <n.icon className="h-[22px] w-[22px]" aria-hidden />
                {badge(n.to) > 0 && (
                  <span className="absolute right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-warning px-1 text-xs font-bold leading-none text-on-warning ring-2 ring-card tabular-nums animate-pop">
                    {badge(n.to)}<span className="sr-only"> {badge(n.to) === 1 ? "aviso" : "avisos"}</span>
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-0.5">{n.label}</span>
            </Link>
          ))}
          <div className="flex justify-center">
            <button type="button" onClick={() => setLogOpen(true)} aria-label="Registrar" aria-expanded={logOpen}
              className={`pressable -mt-5 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background hover:bg-brand-hover ${["/alimentacao", "/corpo"].includes(pathname) ? "outline-2 outline-offset-2 outline-brand" : ""}`}>
              <Plus className={`h-7 w-7 transition-transform duration-200 ${logOpen ? "rotate-45" : ""}`} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          {TABS.slice(2).map((n: (typeof TABS)[number]) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="group flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200"
              activeProps={{ className: "!text-accent", "aria-current": "page" }}
            >
              <span className="relative grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 group-aria-[current=page]:bg-brand-soft">
                <n.icon className="h-[22px] w-[22px]" aria-hidden />
                {badge(n.to) > 0 && (
                  <span className="absolute right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-warning px-1 text-xs font-bold leading-none text-on-warning ring-2 ring-card tabular-nums animate-pop">
                    {badge(n.to)}<span className="sr-only"> {badge(n.to) === 1 ? "aviso" : "avisos"}</span>
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-0.5">{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <QuickLog open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}

/** Calorie ring of Hoje: the figure in the middle in the display font. */
export function Ring({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const over = max > 0 && value > max;
  return (
    <ProgressRing value={value} max={max} size={152} stroke={12} color={over ? "var(--warning)" : "var(--accent-base)"} label={`${label} ${sub}`}>
      <div className="type-number text-3xl leading-none">{label}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{sub}</div>
    </ProgressRing>
  );
}

export function MacroBar({ name, value, max, color }: { name: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />{name}</span>
        <span className="tabular-nums text-muted-foreground"><b className="font-semibold text-foreground">{Math.round(value)}</b> / {max} g</span>
      </div>
      <ProgressBar value={value} max={max} color={color} label={name} />
    </div>
  );
}

export function NeedProfile() {
  return (
    <EmptyState icon={UserRound} title="Vamos começar pelo seu perfil"
      action={<Link to="/perfil" className={buttonVariants({ size: "lg" })}>Preencher perfil</Link>}>
      Responda algumas perguntas sobre você e sua meta. Com isso calculo suas calorias, macros e monto seu plano de treino.
    </EmptyState>
  );
}

/**
 * Next to the calendar, data only: on an iPhone whose Shortcut already sends Health data this month, runs it first
 * (Mi Band), then brings Strava's new activities. Screens update live; new versions come by themselves or in Configurações.
 */
function RefreshButton() {
  const uid = useAuth().user?.uid;
  const [health] = useLocal<HealthMonth>(healthKey(today()), {});
  // Only days the Shortcut sent (at > 0) count: a sleep typed in the app is no sign of the Shortcut.
  const usesShortcut = isIos() && Object.values(health).some((d) => d.at > 0);
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
      className={`${HEADER_ICON} ${busy ? "!text-accent" : ""}`}>
      <RefreshCw className={`h-[22px] w-[22px] ${busy ? "animate-spin" : ""}`} />
    </button>
  );
}
