import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lege en ladende staat, één vorm voor de hele site (ontwerpsysteem fase 2).
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn("rounded-lg border border-dashed border-border px-4 py-8 text-center", className)}>
    {icon && <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
    <p className="text-sm font-medium text-foreground">{title}</p>
    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState = ({ label = "Laden…", className }: LoadingStateProps) => (
  <div className={cn("flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground", className)} role="status" aria-live="polite">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    {label}
  </div>
);
