import { cn } from "@/lib/utils";

/** Loading placeholder with a soft shimmer (still under prefers-reduced-motion). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-shimmer rounded-xl", className)} aria-hidden {...props} />;
}

/** Whole-screen placeholder while the account data arrives: a title and a few cards. */
function ScreenSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-44 w-full rounded-3xl" />
      {Array.from({ length: cards - 1 }, (_, i) => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
    </div>
  );
}

export { Skeleton, ScreenSkeleton };
