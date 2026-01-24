import { CheckCircle, Clock, XCircle, MessageSquare, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type ItemStatus, itemStatusConfig } from "@/types/programRequest";

interface ItemStatusBadgeProps {
  status: ItemStatus;
  className?: string;
  showLabel?: boolean;
}

const iconMap = {
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Ban,
};

export const ItemStatusBadge = ({
  status,
  className,
  showLabel = true,
}: ItemStatusBadgeProps) => {
  const config = itemStatusConfig[status];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium border-0",
        config.bgColor,
        config.color,
        className
      )}
    >
      <IconComponent className="h-3.5 w-3.5" />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
};
