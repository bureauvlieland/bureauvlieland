import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getProjectPhase,
  projectPhaseConfig,
  type ProjectForLifecycle,
  type ItemForLifecycle,
} from "@/lib/lifecycle";

interface PrimaryAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

interface NextStepBannerProps {
  project: ProjectForLifecycle;
  items: ItemForLifecycle[];
  /** When set, overrides the auto-derived primary action (e.g. publish, send-to-partners, status-mail). */
  primaryAction?: PrimaryAction | null;
  /** Optional subtitle override (e.g. "5 onderdelen klaar"). */
  detail?: string;
  className?: string;
}

/**
 * Single source-of-truth "Volgende stap"-banner shown on the admin
 * project detail page. Replaces the previous fragmented banners
 * (waiting-for-customer, ready-to-send, concept) with one consolidated
 * panel that follows the canonical lifecycle.
 */
export const NextStepBanner = ({
  project,
  items,
  primaryAction,
  detail,
  className,
}: NextStepBannerProps) => {
  const phase = getProjectPhase(project, items);
  const config = projectPhaseConfig[phase];
  const Icon = config.icon;

  // Hide the banner entirely once everything is wrapped up
  if (phase === "afgerond" || phase === "geannuleerd") return null;

  return (
    <Card className={cn("border-0", config.bgColor, className)}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn("rounded-full p-2 bg-background/60", config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={cn("text-xs font-medium uppercase tracking-wide", config.color)}>
                Volgende stap
              </p>
              <p className={cn("font-semibold", config.color)}>
                {config.adminLabel}
              </p>
              <p className={cn("text-sm mt-0.5", config.color, "opacity-90")}>
                {detail || config.nextAction || config.description}
              </p>
            </div>
          </div>
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              className="shrink-0"
            >
              {primaryAction.icon}
              {primaryAction.loading ? "Bezig…" : primaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
