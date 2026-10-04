import { Link } from "@tanstack/react-router";
import { Home, Utensils, Scale, Dumbbell, User } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/alimentacao", label: "Alimentação", icon: Utensils },
  { to: "/peso", label: "Peso", icon: Scale },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-2xl font-extrabold text-primary">
            forma<span className="text-accent">.</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-primary !text-primary-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
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
