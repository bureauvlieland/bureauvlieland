import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { User, Building2, Clock, FileText, MessageCircle, BedDouble } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ChatConversation } from "@/hooks/useChat";
import type { ConversationProjectRef } from "@/hooks/useConversationProjects";

interface ChatConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  projectRef?: ConversationProjectRef;
  unreadCount?: number;
  onClick: () => void;
}

export function ChatConversationItem({ conversation: conv, isActive, projectRef, unreadCount = 0, onClick }: ChatConversationItemProps) {
  const navigate = useNavigate();
  const isUnread = unreadCount > 0;
  const isClosed = conv.status === "closed";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition-colors relative",
        isActive && "bg-slate-100",
        isUnread && !isActive && "bg-rose-50/50"
      )}
    >
      {isUnread && (
        <span
          aria-hidden
          className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-600"
        />
      )}
      <div className="flex items-center gap-2 mb-1">
        {conv.source === "whatsapp" ? (
          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" aria-label="WhatsApp" />
        ) : conv.source === "partner_portal" ? (
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className={cn("text-sm truncate", isUnread ? "font-semibold text-slate-900" : "font-medium")}>
          {conv.visitor_name || conv.phone_number || "Bezoeker"}
        </span>
        {isUnread ? (
          <Badge variant="destructive" className="ml-auto text-[10px] px-1.5">
            {unreadCount} nieuw
          </Badge>
        ) : isClosed ? (
          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
            Gesloten
          </Badge>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {conv.source === "whatsapp" ? (conv.phone_number || "WhatsApp") : conv.visitor_email}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: nl })}
        </p>
        {projectRef?.program && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/aanvragen/${projectRef.program!.id}`);
            }}
            className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5 hover:bg-primary/20 transition-colors"
          >
            <FileText className="h-2.5 w-2.5" />
            {projectRef.program.reference}
          </button>
        )}
        {projectRef?.accommodation && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/logies/${projectRef.accommodation!.id}`);
            }}
            className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 hover:bg-amber-200 transition-colors"
          >
            <BedDouble className="h-2.5 w-2.5" />
            {projectRef.accommodation.label}
          </button>
        )}
      </div>
    </button>
  );
}
