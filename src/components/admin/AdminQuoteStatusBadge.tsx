import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  MessageCircle,
  Send,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
} from "lucide-react";
import {
  type QuoteStatus,
  type ItemQuoteStatus,
  quoteStatusConfig,
  itemQuoteStatusConfig,
} from "@/types/programRequest";

const quoteIconMap = {
  FileEdit,
  MessageCircle,
  Send,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
};

interface AdminQuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
  showDescription?: boolean;
}

export const AdminQuoteStatusBadge = ({
  status,
  className,
  showDescription = false,
}: AdminQuoteStatusBadgeProps) => {
  const config = quoteStatusConfig[status];
  const IconComponent = quoteIconMap[config.icon as keyof typeof quoteIconMap];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 font-medium border-0 w-fit",
          config.bgColor,
          config.color
        )}
      >
        <IconComponent className="h-3.5 w-3.5" />
        <span>{config.label}</span>
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{config.description}</span>
      )}
    </div>
  );
};

interface AdminItemQuoteStatusBadgeProps {
  status: ItemQuoteStatus;
  className?: string;
}

export const AdminItemQuoteStatusBadge = ({
  status,
  className,
}: AdminItemQuoteStatusBadgeProps) => {
  const config = itemQuoteStatusConfig[status];
  const IconComponent = quoteIconMap[config.icon as keyof typeof quoteIconMap];

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
      <span>{config.label}</span>
    </Badge>
  );
};
