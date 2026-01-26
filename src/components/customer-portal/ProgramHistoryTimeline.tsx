import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Send,
  Edit,
  Calendar,
  Users,
  Ban,
  History,
  FileText,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestHistory } from "@/types/programRequest";

interface ProgramHistoryTimelineProps {
  history: ProgramRequestHistory[];
  className?: string;
  variant?: "default" | "embedded";
}

const actionConfig: Record<string, { icon: typeof Clock; label: string; color: string; bgColor: string }> = {
  created: { icon: Send, label: "Aanvraag ingediend", color: "text-primary", bgColor: "bg-primary/10" },
  status_changed: { icon: CheckCircle, label: "Status gewijzigd", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
  confirmed: { icon: CheckCircle, label: "Bevestigd door aanbieder", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
  unavailable: { icon: XCircle, label: "Niet beschikbaar", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900" },
  alternative: { icon: MessageSquare, label: "Alternatief voorgesteld", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900" },
  time_changed: { icon: Clock, label: "Tijd gewijzigd", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900" },
  day_changed: { icon: Calendar, label: "Dag gewijzigd", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900" },
  notes_changed: { icon: Edit, label: "Opmerking gewijzigd", color: "text-muted-foreground", bgColor: "bg-muted" },
  removed: { icon: Ban, label: "Activiteit verwijderd", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900" },
  cancelled: { icon: Ban, label: "Geannuleerd", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900" },
  people_changed: { icon: Users, label: "Aantal personen gewijzigd", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900" },
  dates_changed: { icon: Calendar, label: "Datums gewijzigd", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900" },
  billing_updated: { icon: FileText, label: "Facturatiegegevens bijgewerkt", color: "text-muted-foreground", bgColor: "bg-muted" },
  terms_accepted: { icon: CreditCard, label: "Voorwaarden geaccepteerd", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
};

const getActionDetails = (action: string) => {
  return actionConfig[action] || { icon: History, label: action, color: "text-muted-foreground", bgColor: "bg-muted" };
};

export const ProgramHistoryTimeline = ({ history, className = "", variant = "default" }: ProgramHistoryTimelineProps) => {
  const [isOpen, setIsOpen] = useState(variant === "embedded");

  if (history.length === 0) return null;

  // Sort by most recent first
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Show first 3 items when collapsed
  const previewItems = sortedHistory.slice(0, 3);
  const hasMore = sortedHistory.length > 3;

  // Count recent activity (last 7 days)
  const recentCount = sortedHistory.filter(
    item => new Date(item.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  // Embedded variant - no card wrapper, simpler layout
  if (variant === "embedded") {
    return (
      <div className={cn("", className)}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {/* Preview items (always visible) */}
            <div className="space-y-4">
              {previewItems.map((item, index) => (
                <TimelineItem key={item.id} item={item} isFirst={index === 0} />
              ))}
            </div>

            {/* Collapsible items */}
            <CollapsibleContent className="space-y-4 mt-4">
              {sortedHistory.slice(3).map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
            </CollapsibleContent>
          </div>

          {hasMore && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-3 w-full">
                {isOpen ? "Minder tonen" : `Toon alles (${sortedHistory.length})`}
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          )}

          {/* Summary */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{sortedHistory.length} gebeurtenissen</span>
            <span>
              Aangemaakt op {format(new Date(sortedHistory[sortedHistory.length - 1].created_at), "d MMMM yyyy", { locale: nl })}
            </span>
          </div>
        </Collapsible>
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Geschiedenis
              {recentCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {recentCount} recent
                </Badge>
              )}
            </CardTitle>
            {hasMore && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? "Minder tonen" : `Toon alles (${sortedHistory.length})`}
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {/* Preview items (always visible) */}
            <div className="space-y-4">
              {previewItems.map((item, index) => (
                <TimelineItem key={item.id} item={item} isFirst={index === 0} />
              ))}
            </div>

            {/* Collapsible items */}
            <CollapsibleContent className="space-y-4 mt-4">
              {sortedHistory.slice(3).map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
            </CollapsibleContent>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{sortedHistory.length} gebeurtenissen</span>
            <span>
              Aangemaakt op {format(new Date(sortedHistory[sortedHistory.length - 1].created_at), "d MMMM yyyy", { locale: nl })}
            </span>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

interface TimelineItemProps {
  item: ProgramRequestHistory;
  isFirst?: boolean;
}

const TimelineItem = ({ item, isFirst = false }: TimelineItemProps) => {
  const { icon: Icon, label, color, bgColor } = getActionDetails(item.action);
  const date = new Date(item.created_at);

  // Format the change details
  const getChangeDescription = () => {
    const parts: string[] = [];

    // Actor info
    if (item.actor === "customer") {
      parts.push("door jou");
    } else if (item.actor === "provider" && item.actor_name) {
      parts.push(`door ${item.actor_name}`);
    } else if (item.actor === "system") {
      parts.push("automatisch");
    }

    // Value changes
    if (item.old_value && item.new_value) {
      const oldVal = typeof item.old_value === "string" ? item.old_value : JSON.stringify(item.old_value);
      const newVal = typeof item.new_value === "string" ? item.new_value : JSON.stringify(item.new_value);
      if (oldVal !== newVal) {
        parts.push(`${oldVal} → ${newVal}`);
      }
    }

    return parts.join(" • ");
  };

  return (
    <div className="relative pl-10">
      {/* Icon circle */}
      <div className={cn(
        "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2",
        isFirst ? "border-primary bg-primary/10" : "border-muted bg-background",
        bgColor
      )}>
        <Icon className={cn("h-4 w-4", isFirst ? "text-primary" : color)} />
      </div>

      {/* Content */}
      <div className={cn(
        "rounded-lg p-3 transition-colors",
        isFirst ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
      )}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {format(date, "d MMM yyyy, HH:mm", { locale: nl })}
          </span>
          {isFirst && (
            <Badge variant="outline" className="text-xs">Nieuwste</Badge>
          )}
        </div>

        {getChangeDescription() && (
          <p className="text-sm text-muted-foreground mt-1">{getChangeDescription()}</p>
        )}

        {item.notes && (
          <p className="text-sm mt-2 italic">"{item.notes}"</p>
        )}
      </div>
    </div>
  );
};
