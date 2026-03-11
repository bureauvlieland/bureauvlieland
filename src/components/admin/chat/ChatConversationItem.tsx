import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { User, Building2, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ChatConversation } from "@/hooks/useChat";

interface ChatConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  projectRef?: string;
  onClick: () => void;
}

export function ChatConversationItem({ conversation: conv, isActive, projectRef, onClick }: ChatConversationItemProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition-colors",
        isActive && "bg-slate-100"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {conv.source === "partner_portal" ? (
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="font-medium text-sm truncate">
          {conv.visitor_name || "Bezoeker"}
        </span>
        <Badge
          variant={conv.status === "active" ? "default" : "secondary"}
          className="ml-auto text-[10px] px-1.5"
        >
          {conv.status === "active" ? "Actief" : conv.status === "waiting" ? "Wacht" : "Gesloten"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground truncate">{conv.visitor_email}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: nl })}
        </p>
        {projectRef && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/aanvragen/${conv.request_id}`);
            }}
            className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5 hover:bg-primary/20 transition-colors"
          >
            <FileText className="h-2.5 w-2.5" />
            {projectRef}
          </button>
        )}
      </div>
    </button>
  );
}
