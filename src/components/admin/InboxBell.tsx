import { useNavigate } from "react-router-dom";
import { Bell, Mail, MessageSquare, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAdminInbox, type InboxEmail, type InboxChatMessage, type InboxLiveChat } from "@/hooks/useAdminInbox";

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: nl });
  } catch {
    return "";
  }
}

function truncate(s: string, n = 80) {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

export const InboxBell = () => {
  const navigate = useNavigate();
  const { data, markAllSeen, isNew } = useAdminInbox();

  const total = data?.totalUnread ?? 0;
  const emails = data?.emails ?? [];
  const chats = data?.chats ?? [];
  const liveChats = data?.liveChats ?? [];
  const hasAny = emails.length + chats.length + liveChats.length > 0;

  const goToEmail = (e: InboxEmail) => {
    if (e.request_id) navigate(`/admin/projecten/${e.request_id}?tab=communicatie`);
    else if (e.accommodation_id) navigate(`/admin/projecten/${e.accommodation_id}?tab=communicatie`);
    else navigate(`/admin/berichten`);
  };

  const goToChat = (c: InboxChatMessage) => {
    if (c.request_id) navigate(`/admin/projecten/${c.request_id}?tab=communicatie`);
    else if (c.accommodation_request_id) navigate(`/admin/projecten/${c.accommodation_request_id}?tab=communicatie`);
    else navigate(`/admin/berichten`);
  };

  const goToLive = (l: InboxLiveChat) => {
    navigate(`/admin/berichten?conversation=${l.conversation_id}`);
  };

  return (
    <Popover onOpenChange={(open) => { if (!open) markAllSeen(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            total > 0
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
          )}
          title="Inkomende berichten en e-mails"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Inbox</span>
          {total > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] bg-red-600 text-white hover:bg-red-700">
              {total > 99 ? "99+" : total}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Inbox</p>
            <p className="text-[11px] text-muted-foreground">Laatste 14 dagen</p>
          </div>
          {total > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
              {total} nieuw
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[480px]">
          {!hasAny && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Niets nieuws. 🎉
            </div>
          )}

          {emails.length > 0 && (
            <Section icon={<Mail className="h-3.5 w-3.5" />} title="Inkomende e-mails" count={emails.length}>
              {emails.slice(0, 8).map((e) => (
                <Row
                  key={e.id}
                  highlighted={isNew(e.created_at)}
                  title={e.subject || "(geen onderwerp)"}
                  subtitle={e.contact_name || e.contact_email || "Onbekend"}
                  preview={truncate(e.content, 90)}
                  time={timeAgo(e.created_at)}
                  onClick={() => goToEmail(e)}
                />
              ))}
            </Section>
          )}

          {chats.length > 0 && (
            <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Berichten klant/partner" count={chats.length}>
              {chats.slice(0, 8).map((c) => (
                <Row
                  key={c.id}
                  highlighted={isNew(c.created_at)}
                  title={c.visitor_name || c.sender_name}
                  subtitle={c.sender_type === "partner" ? "Partner" : c.sender_type === "customer" ? "Klant" : c.sender_type}
                  preview={truncate(c.content, 90)}
                  time={timeAgo(c.created_at)}
                  onClick={() => goToChat(c)}
                />
              ))}
            </Section>
          )}

          {liveChats.length > 0 && (
            <Section icon={<MessageCircle className="h-3.5 w-3.5" />} title="Live chat (website)" count={liveChats.length}>
              {liveChats.slice(0, 8).map((l) => (
                <Row
                  key={l.conversation_id}
                  highlighted
                  title={l.visitor_name || "Bezoeker"}
                  subtitle={`${l.unread_count} ongelezen`}
                  preview={truncate(l.last_message, 90)}
                  time={timeAgo(l.last_message_at)}
                  onClick={() => goToLive(l)}
                />
              ))}
            </Section>
          )}
        </ScrollArea>

        <div className="border-t px-3 py-2">
          <button
            type="button"
            onClick={() => navigate("/admin/berichten")}
            className="w-full text-center text-xs font-medium text-primary hover:underline py-1"
          >
            Bekijk alle berichten →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const Section = ({
  icon, title, count, children,
}: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) => (
  <div className="border-b last:border-b-0">
    <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
      {icon}
      <span>{title}</span>
      <span className="text-muted-foreground/70">({count})</span>
    </div>
    <div>{children}</div>
  </div>
);

const Row = ({
  highlighted, title, subtitle, preview, time, onClick,
}: {
  highlighted?: boolean;
  title: string;
  subtitle?: string;
  preview: string;
  time: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex gap-2",
      highlighted && "bg-blue-50/40",
    )}
  >
    <span
      className={cn(
        "mt-1.5 h-2 w-2 rounded-full shrink-0",
        highlighted ? "bg-blue-500" : "bg-transparent",
      )}
      aria-hidden
    />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
        <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
      </div>
      {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{preview}</p>
    </div>
  </button>
);
