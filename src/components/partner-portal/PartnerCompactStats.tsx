import { Bell, Clock, CheckCircle, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatType = "pending" | "waiting" | "accepted" | "invoice";

interface PartnerCompactStatsProps {
  pending: number;
  waitingOnCustomer: number;
  accepted: number;
  toInvoice: number;
  onStatClick?: (stat: StatType) => void;
}

export const PartnerCompactStats = ({
  pending,
  waitingOnCustomer,
  accepted,
  toInvoice,
  onStatClick,
}: PartnerCompactStatsProps) => {
  const stats: {
    key: StatType;
    label: string;
    value: number;
    icon: typeof Bell;
    color: string;
    bgColor: string;
    ariaSuffix: string;
  }[] = [
    {
      key: "pending",
      label: "Nieuw",
      value: pending,
      icon: Bell,
      color: "text-warning",
      bgColor: "bg-warning-soft",
      ariaSuffix: "nieuwe aanvragen die actie vragen",
    },
    {
      key: "waiting",
      label: "Wacht op klant",
      value: waitingOnCustomer,
      icon: Clock,
      color: "text-info",
      bgColor: "bg-info-soft",
      ariaSuffix: "items in afwachting van de klant",
    },
    {
      key: "accepted",
      label: "Bevestigd door klant",
      value: accepted,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success-soft",
      ariaSuffix: "items bevestigd door de klant",
    },
    {
      key: "invoice",
      label: "Te factureren",
      value: toInvoice,
      icon: Receipt,
      color: "text-invoice",
      bgColor: "bg-invoice-soft",
      ariaSuffix: "items klaar voor facturatie",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const isZero = stat.value === 0;
        return (
          <button
            key={stat.label}
            onClick={() => onStatClick?.(stat.key)}
            aria-label={`${stat.value} ${stat.ariaSuffix}`}
            className={cn(
              "bg-card border rounded-lg p-4 flex items-center gap-3 text-left transition-colors",
              onStatClick && "hover:bg-muted/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isZero && "opacity-60"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                stat.bgColor
              )}
            >
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums">
                {isZero ? <span className="text-muted-foreground">–</span> : stat.value}
              </p>
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
