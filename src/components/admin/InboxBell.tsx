import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOpenConversations } from "@/hooks/useOpenConversations";

/**
 * Knop naar het Berichtencentrum met het aantal gesprekken dat op een
 * antwoord wacht. Zelfde getal als de zijbalk en de tabbladen; er is geen
 * "gezien"-stand meer, het getal zakt pas als er geantwoord of gelezen is.
 */
export const InboxBell = () => {
  const navigate = useNavigate();
  const { data } = useOpenConversations();
  const total = data.counts.total;

  return (
    <button
      type="button"
      onClick={() => navigate("/admin/berichten")}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        total > 0
          ? "border-destructive/30 bg-destructive-soft text-destructive-ink hover:bg-destructive-soft/80"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
      title="Open berichtencentrum"
      aria-label={total > 0 ? `${total} gesprekken wachten op antwoord` : "Berichtencentrum"}
    >
      <Bell className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Te beantwoorden</span>
      {total > 0 && (
        <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
          {total > 99 ? "99+" : total}
        </Badge>
      )}
    </button>
  );
};
