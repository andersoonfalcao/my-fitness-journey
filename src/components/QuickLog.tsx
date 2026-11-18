import { Link } from "@tanstack/react-router";
import { ChevronRight, Droplets, HeartPulse, Pill, Ruler, Scale, Utensils } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Everything logged during a day, one tap from any screen (the "+" in the tab bar). Each opens the place it is logged. */
const ACTIONS = [
  { label: "Refeição", icon: Utensils, to: "/alimentacao", hash: "registrar", tone: "text-[var(--data-protein)]" },
  { label: "Peso", icon: Scale, to: "/corpo", hash: "pesagem", tone: "text-accent" },
  { label: "Água", icon: Droplets, to: "/alimentacao", hash: "agua", tone: "text-info" },
  { label: "Cardio", icon: HeartPulse, to: "/treinos", hash: "", tone: "text-danger-text", search: { aba: "cardio" as const } },
  { label: "Medidas", icon: Ruler, to: "/corpo", hash: "medidas", tone: "text-[var(--data-carbs)]" },
  { label: "Suplemento", icon: Pill, to: "/alimentacao", hash: "suplementos", tone: "text-[var(--data-fat)]" },
] as const;

export function QuickLog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const close = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 gap-4 rounded-b-none rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-[50%] sm:left-[50%] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl">
        <div className="mx-auto -mt-2 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div>
          <DialogTitle>Registrar</DialogTitle>
          <DialogDescription>O que você quer anotar agora?</DialogDescription>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map((a) => (
            <Link key={a.label} to={a.to} {...(a.hash ? { hash: a.hash } : {})} search={"search" in a ? a.search : {}} onClick={close}
              className="pressable flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-muted px-2 py-3 text-sm font-semibold hover:bg-surface-3">
              <a.icon className={`h-6 w-6 ${a.tone}`} aria-hidden />{a.label}
            </Link>
          ))}
        </div>
        <div className="grid gap-2 border-t border-border pt-4">
          {([["/alimentacao", "Alimentação", "Refeições, macros, água e jejum"], ["/corpo", "Corpo", "Pesagens, medidas e bioimpedância"]] as const).map(([to, title, sub]) => (
            <Link key={to} to={to} onClick={close} className="pressable flex min-h-14 items-center justify-between gap-3 rounded-2xl px-1 hover:bg-muted">
              <span><span className="block font-semibold">{title}</span><span className="block text-xs text-muted-foreground">{sub}</span></span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
