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
  }[] = [
    {
      key: "pending",
      label: "Nieuw",
      value: pending,
      icon: Bell,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-950/50",
    },
    {
      key: "waiting",
      label: "Wacht op klant",
      value: waitingOnCustomer,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950/50",
    },
    {
      key: "accepted",
      label: "Klant akkoord",
      value: accepted,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-950/50",
    },
    {
      key: "invoice",
      label: "Te factureren",
      value: toInvoice,
      icon: Receipt,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-950/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <button
          key={stat.label}
          onClick={() => onStatClick?.(stat.key)}
          className={cn(
            "bg-card border rounded-lg p-4 flex items-center gap-3 text-left transition-colors",
            onStatClick && "hover:bg-muted/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
};
