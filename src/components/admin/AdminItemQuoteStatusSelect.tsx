import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileEdit,
  MessageCircle,
  CheckCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ItemQuoteStatus,
  itemQuoteStatusConfig,
} from "@/types/programRequest";

const iconMap = {
  FileEdit,
  MessageCircle,
  CheckCircle,
  HelpCircle,
};

interface AdminItemQuoteStatusSelectProps {
  status: ItemQuoteStatus | null;
  onStatusChange: (status: ItemQuoteStatus) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const AdminItemQuoteStatusSelect = ({
  status,
  onStatusChange,
  disabled = false,
  className,
}: AdminItemQuoteStatusSelectProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const currentStatus = status || "concept";
  const config = itemQuoteStatusConfig[currentStatus];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus as ItemQuoteStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const statuses: ItemQuoteStatus[] = ["concept", "in_afstemming", "bevestigd", "optioneel"];

  return (
    <Select
      value={currentStatus}
      onValueChange={handleChange}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-[150px] text-xs font-medium border-0",
          config.bgColor,
          config.color,
          className
        )}
      >
        {isUpdating ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Opslaan...</span>
          </div>
        ) : (
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <IconComponent className="h-3.5 w-3.5" />
              <span>{config.label}</span>
            </div>
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => {
          const sConfig = itemQuoteStatusConfig[s];
          const SIcon = iconMap[sConfig.icon as keyof typeof iconMap];
          
          return (
            <SelectItem key={s} value={s}>
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded", sConfig.bgColor)}>
                  <SIcon className={cn("h-3.5 w-3.5", sConfig.color)} />
                </div>
                <div>
                  <span className="font-medium">{sConfig.label}</span>
                  <p className="text-xs text-muted-foreground">{sConfig.description}</p>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
