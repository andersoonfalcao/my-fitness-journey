import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Card surface of the design system: surface-1, hairline border, 20 px radius, soft shadow in light
 * (in dark the lighter surface tone does the lifting). The same look is available as the `surface-card`
 * class (styles.css) for markup that is not a <Card>.
 * - default: content card · highlight: the hero of a screen (emerald edge) · muted: a quiet well inside a card.
 */
const cardVariants = cva("rounded-3xl text-card-foreground", {
  variants: {
    variant: {
      default: "surface-card",
      highlight: "surface-card border-brand-line bg-[linear-gradient(180deg,var(--accent-soft),transparent_60%)]",
      muted: "bg-muted",
    },
    padding: { none: "", sm: "p-4", md: "p-5 sm:p-6" },
  },
  defaultVariants: { variant: "default", padding: "md" },
});

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props} />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("type-h3", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-5 flex items-center gap-2", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

/** Small label above a title ("TREINO DE HOJE"). */
function Eyebrow({ className, tone = "brand", ...props }: React.HTMLAttributes<HTMLParagraphElement> & { tone?: "brand" | "muted" | "warning" | "success" }) {
  const color = { brand: "text-accent", muted: "text-muted-foreground", warning: "text-warning-text", success: "text-success-text" }[tone];
  return <p className={cn("type-overline", color, className)} {...props} />;
}

const calloutVariants = cva("flex items-start gap-3 rounded-3xl border p-4", {
  variants: {
    tone: {
      brand: "border-brand-line bg-brand-soft",
      info: "border-info/30 bg-info/10",
      warning: "border-warning/40 bg-warning/10",
      danger: "border-destructive/40 bg-destructive/10",
      neutral: "border-border bg-muted",
    },
  },
  defaultVariants: { tone: "brand" },
});
const calloutIcon = { brand: "text-accent", info: "text-info-text", warning: "text-warning-text", danger: "text-danger-text", neutral: "text-muted-foreground" } as const;

/** Notice inside a screen: an icon, a message and optional actions. Amber (warning) is for alerts only. */
function Callout({ tone = "brand", icon: Icon, className, children, ...props }: React.HTMLAttributes<HTMLElement> & VariantProps<typeof calloutVariants> & { icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <section className={cn(calloutVariants({ tone }), className)} {...props}>
      {Icon && <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", calloutIcon[tone ?? "brand"])} aria-hidden />}
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </section>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Eyebrow, Callout, cardVariants, calloutVariants };
