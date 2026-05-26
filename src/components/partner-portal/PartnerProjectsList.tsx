import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  Activity,
  BedDouble,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PartnerItem, PartnerAccommodationQuote } from "@/types/partner";
import { hasOpenAdminPriceChange, getNumberOfDays } from "@/lib/portalPricing";

interface ProjectGroup {
  key: string;
  href: string;
  type: "activities" | "accommodation";
  customerLabel: string;
  startDate: string;
  endDate?: string;
  numberOfPeople: number;
  itemCount: number;
  pendingCount: number;
  actionCount: number;
  status: "action" | "upcoming" | "done";
}

interface Props {
  items: PartnerItem[];
  accommodationQuotes: PartnerAccommodationQuote[];
}

const itemNeedsAction = (i: PartnerItem) => {
  if (i.status === "pending" || i.status === "counter_proposed") return true;
  const effPeople = i.override_people ?? i.program_requests.number_of_people ?? 1;
  const numDays = getNumberOfDays(i.program_requests.selected_dates);
  if (hasOpenAdminPriceChange(i as any, effPeople, numDays)) return true;
  const readyToInvoice =
    (i.status === "accepted" ||
      i.status === "executed" ||
      (i.status === "confirmed" && (i.customer_accepted_at || i.customer_approved_at))) &&
    !i.invoiced_number &&
    i.program_requests.terms_accepted_at;
  return !!readyToInvoice;
};

const quoteNeedsAction = (q: PartnerAccommodationQuote) =>
  q.status === "pending";

export const PartnerProjectsList = ({ items, accommodationQuotes }: Props) => {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  const urlSuffix = impersonate ? `?impersonate=${impersonate}` : "";

  const groups = useMemo<ProjectGroup[]>(() => {
    const result: ProjectGroup[] = [];

    // Group activity items by program request
    const byRequest = new Map<string, PartnerItem[]>();
    items.forEach((i) => {
      if (!byRequest.has(i.request_id)) byRequest.set(i.request_id, []);
      byRequest.get(i.request_id)!.push(i);
    });

    byRequest.forEach((groupItems, requestId) => {
      const first = groupItems[0];
      const req = first.program_requests;
      const dates = (req.selected_dates || []) as string[];
      const sortedDates = [...dates].sort();
      const startDate = sortedDates[0] || first.created_at;
      const endDate = sortedDates[sortedDates.length - 1];
      const customerLabel = req.customer_company || req.customer_name;

      const pendingCount = groupItems.filter((i) => i.status === "pending").length;
      const actionCount = groupItems.filter(itemNeedsAction).length;
      const allDone = groupItems.every((i) =>
        ["invoiced", "cancelled", "unavailable"].includes(i.status)
      );
      const start = startDate ? new Date(startDate) : null;
      const isPast = start ? differenceInDays(new Date(), start) > 1 : false;

      const status: ProjectGroup["status"] = actionCount > 0
        ? "action"
        : allDone || isPast
          ? "done"
          : "upcoming";

      result.push({
        key: `req-${requestId}`,
        href: `/partner/project/${requestId}${urlSuffix}`,
        type: "activities",
        customerLabel,
        startDate,
        endDate,
        numberOfPeople: req.number_of_people,
        itemCount: groupItems.length,
        pendingCount,
        actionCount,
        status,
      });
    });

    // Accommodation quotes — each is its own project
    accommodationQuotes.forEach((q) => {
      const req = q.accommodation_requests;
      const customerLabel = req.customer_company || req.customer_name;
      const start = req.arrival_date;
      const isPast = differenceInDays(new Date(), new Date(start)) > 1;
      const needsAction = quoteNeedsAction(q);
      const isClosed = ["selected", "rejected", "expired"].includes(q.status);

      const status: ProjectGroup["status"] = needsAction
        ? "action"
        : isClosed || isPast
          ? "done"
          : "upcoming";

      result.push({
        key: `acc-${q.id}`,
        href: `/partner/logies/${req.id}${urlSuffix}`,
        type: "accommodation",
        customerLabel,
        startDate: req.arrival_date,
        endDate: req.departure_date,
        numberOfPeople: req.number_of_guests,
        itemCount: 1,
        pendingCount: needsAction ? 1 : 0,
        actionCount: needsAction ? 1 : 0,
        status,
      });
    });

    return result.sort((a, b) =>
      (a.startDate || "").localeCompare(b.startDate || "")
    );
  }, [items, accommodationQuotes, urlSuffix]);

  const sections = {
    action: groups.filter((g) => g.status === "action"),
    upcoming: groups.filter((g) => g.status === "upcoming"),
    done: groups.filter((g) => g.status === "done"),
  };

  if (groups.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nog geen projecten.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Section
        title="Actie vereist"
        icon={AlertCircle}
        iconClass="text-amber-600"
        groups={sections.action}
        defaultOpen
      />
      <Section
        title="Aankomend"
        icon={Calendar}
        iconClass="text-blue-600"
        groups={sections.upcoming}
        defaultOpen
      />
      <Section
        title="Afgerond"
        icon={CheckCircle}
        iconClass="text-muted-foreground"
        groups={sections.done}
        defaultOpen={false}
      />
    </div>
  );
};

const Section = ({
  title,
  icon: Icon,
  iconClass,
  groups,
  defaultOpen,
}: {
  title: string;
  icon: typeof AlertCircle;
  iconClass: string;
  groups: ProjectGroup[];
  defaultOpen: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  if (groups.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Icon className={cn("h-4 w-4", iconClass)} />
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">({groups.length})</span>
        </div>
      </button>
      {open && (
        <div className="space-y-2">
          {groups.map((g) => (
            <ProjectCard key={g.key} group={g} />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectCard = ({ group }: { group: ProjectGroup }) => {
  const start = group.startDate ? parseISO(group.startDate) : null;
  const end = group.endDate ? parseISO(group.endDate) : null;
  const dateLabel = start
    ? end && group.endDate !== group.startDate
      ? `${format(start, "d MMM", { locale: nl })} – ${format(end, "d MMM yyyy", { locale: nl })}`
      : format(start, "EEE d MMM yyyy", { locale: nl })
    : "Datum onbekend";

  return (
    <Link to={group.href} className="block">
      <Card className="p-4 hover:shadow-md hover:border-primary/30 transition">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              group.type === "accommodation"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
            )}
          >
            {group.type === "accommodation" ? (
              <BedDouble className="h-5 w-5" />
            ) : (
              <Activity className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{group.customerLabel}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
              </div>
              {group.actionCount > 0 && (
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                  {group.actionCount} actie{group.actionCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {group.numberOfPeople}
              </span>
              <span>
                {group.type === "accommodation"
                  ? "Logies"
                  : `${group.itemCount} item${group.itemCount > 1 ? "s" : ""}`}
              </span>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
        </div>
      </Card>
    </Link>
  );
};
