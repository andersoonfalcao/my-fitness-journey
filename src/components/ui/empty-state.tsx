import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Nothing logged yet: an icon in a soft emerald disc, a motivating title, a line of help and the action
 * that fills the space. `compact` fits inside a card.
 */
export function EmptyState({ icon: Icon, title, children, action, compact = false, className }: {
  icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; action?: React.ReactNode; compact?: boolean; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "gap-2 py-6" : "gap-3 rounded-3xl border border-dashed border-line-strong px-6 py-10", className)}>
      {Icon && (
        <span className={cn("grid place-items-center rounded-full bg-brand-soft text-accent", compact ? "h-11 w-11" : "h-14 w-14")}>
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
        </span>
      )}
      <p className={cn("font-display font-semibold", compact ? "text-base" : "text-lg")}>{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
