import {
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Ban,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type ItemDisplayStatus,
  itemDisplayStatusConfig,
} from "@/lib/itemStatus";

const iconMap = {
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Ban,
  XCircle,
  ExternalLink,
};

interface ItemDisplayStatusBadgeProps {
  status: ItemDisplayStatus;
  audience?: "admin" | "customer";
  className?: string;
}

/**
 * Eén badge die overal hetzelfde label toont. Dezelfde key, andere woorden
 * voor klant vs admin (zie itemDisplayStatusConfig).
 */
export const ItemDisplayStatusBadge = ({
  status,
  audience = "admin",
  className,
}: ItemDisplayStatusBadgeProps) => {
  const cfg = itemDisplayStatusConfig[status];
  const Icon = iconMap[cfg.icon];
  const label = audience === "customer" ? cfg.customerLabel : cfg.adminLabel;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium border-0",
        cfg.bgColor,
        cfg.color,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Badge>
  );
};
