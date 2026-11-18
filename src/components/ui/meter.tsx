import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Progress of the design system: a bar and a ring. Colours are CSS colours from the tokens
 * (var(--data-protein), var(--accent-base)…); a goal reached turns the bar/ring to the success token
 * and gives it a short pop (off with prefers-reduced-motion).
 */
export function ProgressBar({ value, max, color = "var(--accent-base)", size = "md", className, label }: {
  value: number; max: number; color?: string; size?: "sm" | "md" | "lg"; className?: string; label?: string;
}) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const h = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" }[size];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)}
      className={cn("overflow-hidden rounded-full bg-muted", h, className)}>
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Activity-style ring with a big figure in the middle. */
export function ProgressRing({ value, max, size = 144, stroke = 12, color = "var(--accent-base)", track = "var(--muted)", children, className, label }: {
  value: number; max: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode; className?: string; label?: string;
}) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}
      role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

export type RingSpec = { value: number; max: number; color: string; label: string };

/**
 * Concentric rings (outer first), Apple-Fitness style. A ring past its goal wraps around once more, a little
 * darker, so going over shows; `closed` marks every ring done and plays the celebration (off with reduced motion).
 */
export function ActivityRings({ rings, size = 156, stroke = 14, gap = 3, className }: {
  rings: RingSpec[]; size?: number; stroke?: number; gap?: number; className?: string;
}) {
  const closed = rings.length > 0 && rings.every((r) => r.max > 0 && r.value >= r.max);
  return (
    <div className={cn("relative shrink-0", closed && "animate-pop", className)} style={{ width: size, height: size }}
      role="img" aria-label={rings.map((r) => `${r.label}: ${Math.round(r.max ? (r.value / r.max) * 100 : 0)}%`).join(", ")}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        {rings.map((ring, i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + gap);
          if (r <= stroke / 2) return null;
          const c = 2 * Math.PI * r;
          const pct = ring.max ? ring.value / ring.max : 0;
          const first = Math.min(1, pct);
          const extra = Math.min(1, Math.max(0, pct - 1));
          return (
            <g key={ring.label}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ring.color} strokeOpacity={0.16} strokeWidth={stroke} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ring.color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - first)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
              {extra > 0 && (
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`color-mix(in srgb, ${ring.color} 70%, black)`} strokeWidth={stroke}
                  strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - extra)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
              )}
            </g>
          );
        })}
      </svg>
      {closed && <span className="absolute inset-0 grid place-items-center text-2xl" aria-hidden>🎉</span>}
    </div>
  );
}
