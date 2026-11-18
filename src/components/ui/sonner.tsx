import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Toasts on the design tokens: raised surface, a coloured icon per kind, the app's fonts. */
const Toaster = ({ ...props }: ToasterProps) => {
  const [theme] = useTheme();
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={{
        "--normal-bg": "var(--popover)", "--normal-text": "var(--popover-foreground)", "--normal-border": "var(--border)",
        "--success-bg": "var(--popover)", "--success-text": "var(--popover-foreground)", "--success-border": "var(--border)",
        "--error-bg": "var(--popover)", "--error-text": "var(--popover-foreground)", "--error-border": "var(--border)",
        "--border-radius": "1rem",
      } as React.CSSProperties}
      offset={{ top: "max(16px, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(12px, env(safe-area-inset-top))", left: 16, right: 16 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:shadow-lg group-[.toaster]:font-sans group-[.toaster]:gap-3 group-[.toaster]:px-4 group-[.toaster]:py-3.5",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-full group-[.toast]:!font-semibold group-[.toast]:!h-9 group-[.toast]:!px-4",
          cancelButton: "group-[.toast]:!bg-muted group-[.toast]:!text-muted-foreground group-[.toast]:!rounded-full",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-danger-text",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
