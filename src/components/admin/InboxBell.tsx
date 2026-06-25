import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminInbox } from "@/hooks/useAdminInbox";

/**
 * Pure alert button. Shows the unread count and links to the unified
 * Berichtencentrum. No dropdown — the message center itself is the
 * canonical place to triage incoming communication.
 */
export const InboxBell = () => {
  const navigate = useNavigate();
  const { data, markAllSeen } = useAdminInbox();
  const total = data?.totalUnread ?? 0;

  return (
    <button
      type="button"
      onClick={() => {
        markAllSeen();
        navigate("/admin/berichten");
      }}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        total > 0
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      )}
      title="Open berichtencentrum"
      aria-label={total > 0 ? `${total} nieuwe berichten` : "Berichtencentrum"}
    >
      <Bell className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Inbox</span>
      {total > 0 && (
        <Badge
          variant="secondary"
          className="h-4 min-w-4 px-1 text-[10px] bg-red-600 text-white hover:bg-red-700"
        >
          {total > 99 ? "99+" : total}
        </Badge>
      )}
    </button>
  );
};
