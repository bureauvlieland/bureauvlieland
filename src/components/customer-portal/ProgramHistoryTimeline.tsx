import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
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
  History
} from "lucide-react";
import type { ProgramRequestHistory } from "@/types/programRequest";

interface ProgramHistoryTimelineProps {
  history: ProgramRequestHistory[];
  className?: string;
}

const actionConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  created: { icon: Send, label: "Aanvraag ingediend", color: "text-primary" },
  status_changed: { icon: CheckCircle, label: "Status gewijzigd", color: "text-green-600" },
  confirmed: { icon: CheckCircle, label: "Bevestigd door aanbieder", color: "text-green-600" },
  unavailable: { icon: XCircle, label: "Niet beschikbaar", color: "text-red-600" },
  alternative: { icon: MessageSquare, label: "Alternatief voorgesteld", color: "text-blue-600" },
  time_changed: { icon: Clock, label: "Tijd gewijzigd", color: "text-amber-600" },
  day_changed: { icon: Calendar, label: "Dag gewijzigd", color: "text-amber-600" },
  notes_changed: { icon: Edit, label: "Opmerking gewijzigd", color: "text-muted-foreground" },
  removed: { icon: Ban, label: "Activiteit verwijderd", color: "text-red-600" },
  cancelled: { icon: Ban, label: "Geannuleerd", color: "text-red-600" },
  people_changed: { icon: Users, label: "Aantal personen gewijzigd", color: "text-amber-600" },
  dates_changed: { icon: Calendar, label: "Datums gewijzigd", color: "text-amber-600" },
};

const getActionDetails = (action: string) => {
  return actionConfig[action] || { icon: History, label: action, color: "text-muted-foreground" };
};

export const ProgramHistoryTimeline = ({ history, className = "" }: ProgramHistoryTimelineProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (history.length === 0) return null;

  // Sort by most recent first
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Show first 3 items when collapsed
  const previewItems = sortedHistory.slice(0, 3);
  const hasMore = sortedHistory.length > 3;

  return (
    <div className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Geschiedenis
          </h3>
          {hasMore && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? "Minder tonen" : `Toon alles (${sortedHistory.length})`}
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

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
      </Collapsible>
    </div>
  );
};

interface TimelineItemProps {
  item: ProgramRequestHistory;
  isFirst?: boolean;
}

const TimelineItem = ({ item, isFirst = false }: TimelineItemProps) => {
  const { icon: Icon, label, color } = getActionDetails(item.action);
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
      <div className={`absolute left-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center ${isFirst ? "border-primary" : "border-muted"}`}>
        <Icon className={`h-4 w-4 ${isFirst ? "text-primary" : color}`} />
      </div>

      {/* Content */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {format(date, "d MMM yyyy, HH:mm", { locale: nl })}
          </span>
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
