import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Buttons of the design system (tokens in src/styles.css).
 * - default: the main action of a screen (emerald). One per screen or card.
 * - secondary: neutral filled; outline: bordered; ghost: text only; destructive: deletes.
 * Every size keeps a touch area of at least 44 px: the smaller ones extend it invisibly (::after).
 * States: hover, pressed (scales down), disabled, focus ring, and `loading` (spinner, not clickable).
 */
const baseButtonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold cursor-pointer transition-[background-color,border-color,color,transform,opacity] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed aria-busy:cursor-progress after:absolute after:-inset-1 after:content-[''] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-brand-hover",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-card text-foreground hover:bg-muted hover:border-line-strong",
        secondary: "bg-secondary text-secondary-foreground hover:bg-surface-3",
        ghost: "text-foreground hover:bg-muted",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/** Classes of a button, with the caller's className merged last (so "hidden sm:inline-flex" or "w-full" win). */
const buttonVariants = ({ className, ...rest }: VariantProps<typeof baseButtonVariants> & { className?: string | undefined } = {}) =>
  cn(baseButtonVariants(rest), className);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof baseButtonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks clicks while an action runs. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>{children}</Slot>;
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
