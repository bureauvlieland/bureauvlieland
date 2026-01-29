import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronRight, Sparkles, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PartnerItem } from "@/types/partner";

interface PartnerItemRowProps {
  item: PartnerItem;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Nieuw", color: "text-primary", bgColor: "bg-primary/10" },
  confirmed: { label: "Bevestigd", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950/50" },
  accepted: { label: "Klantakkoord", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-950/50" },
  executed: { label: "Uitgevoerd", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-950/50" },
  invoiced: { label: "Gefactureerd", color: "text-muted-foreground", bgColor: "bg-muted" },
  unavailable: { label: "Niet beschikbaar", color: "text-destructive", bgColor: "bg-destructive/10" },
  cancelled: { label: "Geannuleerd", color: "text-muted-foreground", bgColor: "bg-muted" },
  alternative: { label: "Wacht op klant", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-950/50" },
  counter_proposed: { label: "Tegenvoorstel klant", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-950/50" },
};

// Check if newly added (within 24 hours and pending)
const isNewlyAdded = (item: PartnerItem): boolean => {
  if (item.status !== "pending" || item.version > 1) return false;
  const hoursSinceCreation = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation < 24;
};

// Check if modified by customer (version > 1 and status reset to pending)
const isModifiedByCustomer = (item: PartnerItem): boolean => {
  if (item.status !== "pending" || item.version <= 1) return false;
  const hoursSinceUpdate = (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate < 48;
};

// Check if customer has submitted a counter proposal
const hasCounterProposal = (item: PartnerItem): boolean => {
  return item.status === "counter_proposed";
};

export const PartnerItemRow = ({ item, onClick }: PartnerItemRowProps) => {
  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];
  const statusInfo = statusConfig[item.status] || statusConfig.pending;
  const isNew = isNewlyAdded(item);
  const isModified = isModifiedByCustomer(item);
  const hasCounter = hasCounterProposal(item);

  return (
    <TableRow 
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        isModified && "bg-amber-50 dark:bg-amber-950/20"
      )}
      onClick={onClick}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {isNew && (
            <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
          )}
          {isModified && (
            <RefreshCw className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          {hasCounter && (
            <ArrowLeftRight className="h-4 w-4 text-purple-500 shrink-0" />
          )}
          <span className="truncate max-w-[200px]">{item.block_name}</span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <span className="truncate max-w-[150px] block">
          {request.customer_company || request.customer_name}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {activityDate
          ? format(parseISO(activityDate), "d MMM", { locale: nl })
          : `Dag ${item.day_index + 1}`}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-center">
        {request.number_of_people}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("font-normal", statusInfo.color, statusInfo.bgColor, "border-0")}>
          {statusInfo.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};
