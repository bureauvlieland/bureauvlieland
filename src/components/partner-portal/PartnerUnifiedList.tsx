import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Activity, 
  BedDouble, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  ArrowLeftRight,
  Receipt,
  Users,
  Calendar,
  FileSignature,
  Ban,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PartnerItem, PartnerAccommodationQuote } from "@/types/partner";
import { hasOpenAdminPriceChange } from "@/lib/portalPricing";

export interface UnifiedListItem {
  id: string;
  type: "activity" | "accommodation";
  name: string;
  customer: string;
  date: string;
  endDate?: string;
  status: string;
  urgencyScore: number;
  peopleCount: number;
  isNew?: boolean;
  isModified?: boolean;
  hasCounter?: boolean;
  canInvoice?: boolean;
  awaitingTerms?: boolean;
  isRecentlyCancelled?: boolean;
  isRecentlyRejected?: boolean;
  priceChangePending?: boolean;
  originalItem: PartnerItem | PartnerAccommodationQuote;
}

interface PartnerUnifiedListProps {
  items: PartnerItem[];
  accommodationQuotes: PartnerAccommodationQuote[];
  filter: "action" | "in_progress" | "expired" | "accepted" | "completed";
  onSelectItem: (item: PartnerItem) => void;
  onSelectQuote: (quote: PartnerAccommodationQuote) => void;
}

const getUrgencyScore = (status: string, canInvoice?: boolean): number => {
  const scores: Record<string, number> = {
    pending: 100,
    counter_proposed: 95,
    alternative: 50,
    confirmed: 40,
    submitted: 40,
    accepted: 30,
    executed: canInvoice ? 90 : 20,
    selected: 30,
    invoiced: 10,
    cancelled: 0,
    unavailable: 0,
    rejected: 0,
    expired: 0,
  };
  return scores[status] ?? 0;
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Nieuw", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-950/50" },
  confirmed: { label: "Voorstel verstuurd", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-950/50" },
  alternative: { label: "Wacht op klant", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-950/50" },
  counter_proposed: { label: "Tegenvoorstel", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-950/50" },
  accepted: { label: "Klant akkoord", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950/50" },
  executed: { label: "Uitgevoerd", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950/50" },
  invoiced: { label: "Gefactureerd", color: "text-muted-foreground", bgColor: "bg-muted" },
  unavailable: { label: "Niet beschikbaar", color: "text-destructive", bgColor: "bg-destructive/10" },
  cancelled: { label: "Geannuleerd", color: "text-destructive", bgColor: "bg-destructive/10" },
  submitted: { label: "Offerte verstuurd", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-950/50" },
  selected: { label: "Akkoord", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950/50" },
  rejected: { label: "Niet gekozen", color: "text-muted-foreground", bgColor: "bg-muted" },
  declined: { label: "Afgewezen (door u)", color: "text-muted-foreground", bgColor: "bg-muted" },
  expired: { label: "Verlopen", color: "text-muted-foreground", bgColor: "bg-muted" },
};

const isNewItem = (item: PartnerItem): boolean => {
  if (item.status !== "pending" || item.version > 1) return false;
  const hoursSinceCreation = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation < 24;
};

const isModifiedByCustomer = (item: PartnerItem): boolean => {
  if (item.status !== "pending" || item.version <= 1) return false;
  const hoursSinceUpdate = (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate < 48;
};

const isRecentlyUpdated = (updatedAt: string): boolean => {
  const hoursSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate < 48;
};

const canItemBeInvoiced = (item: PartnerItem): boolean => {
  const hasCustomerAccepted = !!item.customer_accepted_at || !!item.customer_approved_at;
  const effectiveStatus = (item.status === "confirmed" && hasCustomerAccepted) ? "accepted" : item.status;
  
  return (
    (effectiveStatus === "accepted" || effectiveStatus === "executed") &&
    !item.invoiced_number &&
    !!item.program_requests.terms_accepted_at
  );
};

export const PartnerUnifiedList = ({
  items,
  accommodationQuotes,
  filter,
  onSelectItem,
  onSelectQuote,
}: PartnerUnifiedListProps) => {
  // Transform and merge items
  const unified: UnifiedListItem[] = [
    ...items
      .filter((i) => i.day_index >= 0)
      .map((i) => {
      const dates = (i.program_requests.selected_dates || []) as string[];
      const activityDate = dates[i.day_index] || "";
      const canInvoice = canItemBeInvoiced(i);
      
      const hasCustomerAccepted = !!i.customer_accepted_at || !!i.customer_approved_at;
      const effectiveStatus = (i.status === "confirmed" && hasCustomerAccepted) ? "accepted" : i.status;
      
      const awaitingTerms = hasCustomerAccepted && 
        !i.invoiced_number && 
        !i.program_requests.terms_accepted_at;

      // Open admin price change → partner needs to acknowledge new price.
      // Only relevant when partner has previously quoted (quoted_price set) and item not finalised.
      const effPeople = i.override_people ?? i.program_requests.number_of_people ?? 1;
      const numDays = Array.isArray(i.program_requests.selected_dates) ? i.program_requests.selected_dates.length : 1;
      const priceChangePending =
        !!i.quoted_price &&
        !i.invoiced_number &&
        i.status !== "cancelled" &&
        i.status !== "executed" &&
        hasOpenAdminPriceChange(i as any, effPeople, numDays);

      return {
        id: i.id,
        type: "activity" as const,
        name: i.block_name,
        customer: i.program_requests.customer_company || i.program_requests.customer_name,
        date: activityDate,
        status: effectiveStatus,
        urgencyScore: getUrgencyScore(effectiveStatus, canInvoice) + (priceChangePending ? 80 : 0),
        peopleCount: i.program_requests.number_of_people,
        isNew: isNewItem(i),
        isModified: isModifiedByCustomer(i),
        hasCounter: i.status === "counter_proposed",
        canInvoice,
        awaitingTerms,
        isRecentlyCancelled: i.status === "cancelled" && isRecentlyUpdated(i.updated_at),
        priceChangePending,
        originalItem: i,
      };
    }),
    ...accommodationQuotes.map((q) => {
      const req = q.accommodation_requests;
      return {
        id: q.id,
        type: "accommodation" as const,
        name: q.accommodation_name || "Logies aanvraag",
        customer: req.customer_company || req.customer_name,
        date: req.arrival_date,
        endDate: req.departure_date,
        status: q.status,
        urgencyScore: getUrgencyScore(q.status),
        peopleCount: req.number_of_guests,
        isRecentlyRejected: (q.status === "rejected" || q.status === "declined") && isRecentlyUpdated(q.updated_at),
        originalItem: q,
      };
    }),
  ];

  // Filter based on tab
  const filterItem = (item: UnifiedListItem): boolean => {
    switch (filter) {
      case "action":
        return (
          item.status === "pending" ||
          item.status === "counter_proposed" ||
          item.canInvoice === true ||
          item.priceChangePending === true
        );
      case "in_progress":
        return ["confirmed", "alternative", "submitted"].includes(item.status) &&
          !item.canInvoice &&
          !item.priceChangePending;
      case "expired":
        return item.status === "expired";
      case "accepted":
        return ["accepted", "selected"].includes(item.status) &&
          !item.canInvoice &&
          !item.priceChangePending;
      case "completed":
        return ["invoiced", "cancelled", "unavailable", "rejected", "declined", "executed"].includes(item.status) &&
          !item.canInvoice;
      default:
        return true;
    }
  };

  const filteredItems = unified
    .filter(filterItem)
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  if (filteredItems.length === 0) {
    const emptyMessages: Record<string, string> = {
      action: "Geen openstaande acties",
      in_progress: "Geen items in behandeling",
      expired: "Geen verlopen offertes",
      accepted: "Geen akkoord items",
      completed: "Geen afgeronde items",
    };

    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessages[filter]}
        </CardContent>
      </Card>
    );
  }

  // For "completed" tab, split into subgroups
  if (filter === "completed") {
    const positiveItems = filteredItems.filter(i => 
      ["executed", "invoiced"].includes(i.status)
    );
    const negativeItems = filteredItems.filter(i => 
      ["cancelled", "unavailable", "rejected", "declined"].includes(i.status)
    );

    return (
      <div className="space-y-6">
        {positiveItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Uitgevoerd / Gefactureerd
            </h3>
            {positiveItems.map((item) => (
              <ItemCard key={`${item.type}-${item.id}`} item={item} onSelectItem={onSelectItem} onSelectQuote={onSelectQuote} />
            ))}
          </div>
        )}
        {negativeItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-destructive uppercase tracking-wide px-1 flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5" />
              Geannuleerd / Afgewezen
            </h3>
            {negativeItems.map((item) => (
              <ItemCard key={`${item.type}-${item.id}`} item={item} onSelectItem={onSelectItem} onSelectQuote={onSelectQuote} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredItems.map((item) => (
        <ItemCard key={`${item.type}-${item.id}`} item={item} onSelectItem={onSelectItem} onSelectQuote={onSelectQuote} />
      ))}
    </div>
  );
};

// Extracted card component
const ItemCard = ({
  item,
  onSelectItem,
  onSelectQuote,
}: {
  item: UnifiedListItem;
  onSelectItem: (item: PartnerItem) => void;
  onSelectQuote: (quote: PartnerAccommodationQuote) => void;
}) => {
  const statusInfo = statusConfig[item.status] || statusConfig.pending;
  const isActivity = item.type === "activity";
  const isRecentNegative = item.isRecentlyCancelled || item.isRecentlyRejected;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        item.isModified && "bg-amber-50 dark:bg-amber-950/20",
        isRecentNegative && "bg-destructive/5 border-destructive/30"
      )}
      onClick={() => {
        if (isActivity) {
          onSelectItem(item.originalItem as PartnerItem);
        } else {
          onSelectQuote(item.originalItem as PartnerAccommodationQuote);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Type icon */}
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              isActivity
                ? "bg-primary/10 text-primary"
                : "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
            )}
          >
            {isActivity ? (
              <Activity className="h-5 w-5" />
            ) : (
              <BedDouble className="h-5 w-5" />
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {item.isNew && (
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
              )}
              {item.isModified && (
                <RefreshCw className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              {item.hasCounter && (
                <ArrowLeftRight className="h-4 w-4 text-purple-500 shrink-0" />
              )}
              {item.canInvoice && (
                <Receipt className="h-4 w-4 text-purple-500 shrink-0" />
              )}
              {isRecentNegative && (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              <span className="font-medium truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="truncate">{item.customer}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {item.date
                  ? item.endDate
                    ? `${format(parseISO(item.date), "EEE d MMM", { locale: nl })} - ${format(parseISO(item.endDate), "EEE d MMM", { locale: nl })}`
                    : format(parseISO(item.date), "EEE d MMM yyyy", { locale: nl })
                  : "Geen datum"}
              </span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {item.peopleCount}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 shrink-0">
            {item.awaitingTerms && !item.canInvoice && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <FileSignature className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Wacht op AV</span>
              </div>
            )}
            {item.priceChangePending && (
              <Badge
                variant="outline"
                className="font-normal border-0 text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50"
              >
                Nieuwe prijs
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "font-normal border-0",
                statusInfo.color,
                statusInfo.bgColor
              )}
            >
              {item.canInvoice ? "Te factureren" : statusInfo.label}
            </Badge>
          </div>

          {/* Chevron */}
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};
