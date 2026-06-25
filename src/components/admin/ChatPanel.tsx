import { useState, useRef, useEffect } from "react";
import { useAdminChat, type ChatStatusFilter } from "@/hooks/useAdminChat";
import { formatNL } from "@/lib/dateFormat";
import { isToday, isYesterday, isSameDay } from "date-fns";
import { useConversationProjects } from "@/hooks/useConversationProjects";
import { ChatConversationItem } from "@/components/admin/chat/ChatConversationItem";
import { ChatMessageBubble } from "@/components/admin/chat/ChatMessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Send,
  X,
  FileText,
  Save,
  User,
  Building2,
  Phone,
  ArrowLeft,
  BedDouble,
} from "lucide-react";

type ChannelFilter = "all" | "customer_portal" | "partner_portal" | "whatsapp";

interface ChatPanelProps {
  /** Optionally pin a specific conversation when the panel mounts. */
  initialConversationId?: string | null;
  /** Tailwind height utility for the outer wrapper. Defaults to a sane embed height. */
  heightClassName?: string;
}

/**
 * Embeddable chat workspace (split list / conversation). Extracted from the old
 * /admin/chat page so it can live as a tab inside the unified message center.
 */
export function ChatPanel({ initialConversationId, heightClassName = "h-[calc(100vh-220px)]" }: ChatPanelProps) {
  const {
    conversations,
    filteredConversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    unreadCount,
    unreadConversationIds,
    unreadByConversation,
    isOnline,
    statusFilter,
    setStatusFilter,
    updatePresence,
    sendMessage,
    closeConversation,
    saveChatToProject,
  } = useAdminChat();

  const projectRefs = useConversationProjects(conversations);
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(false);

  useEffect(() => {
    if (!pinnedRef.current && initialConversationId) {
      setActiveConversationId(initialConversationId);
      pinnedRef.current = true;
    }
  }, [initialConversationId, setActiveConversationId]);

  const channelFiltered = (
    channelFilter === "all"
      ? filteredConversations
      : filteredConversations.filter((c) => c.source === channelFilter)
  )
    .slice()
    .sort((a, b) => {
      const ua = unreadByConversation.get(a.id) ?? 0;
      const ub = unreadByConversation.get(b.id) ?? 0;
      if ((ua > 0) !== (ub > 0)) return ua > 0 ? -1 : 1;
      return b.last_message_at.localeCompare(a.last_message_at);
    });

  const handleSendWithToast = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Versturen mislukt");
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message;
    setMessage("");
    await handleSendWithToast(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSaveToProject = async () => {
    if (!activeConversationId) return;
    setSaving(true);
    const success = await saveChatToProject(activeConversationId);
    setSaving(false);
    if (success) toast.success("Chatgeschiedenis opgeslagen bij project");
    else toast.error("Kon chatgeschiedenis niet opslaan");
  };

  const inboxUnreadCount = unreadConversationIds.size;

  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return "Vandaag";
    if (isYesterday(date)) return "Gisteren";
    return formatNL(date, "EEEE d MMMM yyyy");
  };

  return (
    <div className={cn(heightClassName, "flex border rounded-lg overflow-hidden bg-white")}>
      {/* Conversation list */}
      <div
        className={cn(
          "w-full lg:w-80 border-r bg-white flex-col",
          activeConversationId ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Gesprekken</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
            <Switch checked={isOnline} onCheckedChange={(v) => updatePresence(v)} />
          </div>
        </div>

        <div className="px-3 pt-3">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ChatStatusFilter)}>
            <TabsList className="w-full">
              <TabsTrigger value="waiting" className="flex-1 text-xs gap-1">
                Inbox
                {inboxUnreadCount > 0 && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                    {inboxUnreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="flex-1 text-xs">Gesloten</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="px-3 pt-2 pb-1">
          <Tabs value={channelFilter} onValueChange={(v) => setChannelFilter(v as ChannelFilter)}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="all" className="flex-1 text-[11px] px-1">Alle</TabsTrigger>
              <TabsTrigger value="customer_portal" className="flex-1 text-[11px] px-1 gap-1">
                <User className="h-3 w-3" /> Klant
              </TabsTrigger>
              <TabsTrigger value="partner_portal" className="flex-1 text-[11px] px-1 gap-1">
                <Building2 className="h-3 w-3" /> Partner
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex-1 text-[11px] px-1 gap-1">
                <MessageCircle className="h-3 w-3 text-emerald-600" /> WhatsApp
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto">
          {channelFiltered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Geen gesprekken
            </div>
          )}
          {channelFiltered.map((conv) => (
            <ChatConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeConversationId === conv.id}
              projectRef={projectRefs[conv.id]}
              unreadCount={unreadByConversation.get(conv.id) ?? 0}
              onClick={() => setActiveConversationId(conv.id)}
            />
          ))}
        </div>
      </div>

      {/* Conversation view */}
      <div className={cn("flex-1 flex-col bg-slate-50", activeConversation ? "flex" : "hidden lg:flex")}>
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecteer een gesprek</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-white border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8 flex-shrink-0"
                  onClick={() => setActiveConversationId(null)}
                  aria-label="Terug naar gesprekken"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2">
                    {activeConversation.source === "whatsapp" && (
                      <MessageCircle className="h-4 w-4 text-emerald-600" aria-label="WhatsApp" />
                    )}
                    {activeConversation.visitor_name || activeConversation.phone_number || "Bezoeker"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {activeConversation.source === "whatsapp" ? (
                      <>
                        <Phone className="h-3 w-3" />
                        {activeConversation.phone_number || "WhatsApp"}
                      </>
                    ) : (
                      <>
                        {activeConversation.visitor_email} •{" "}
                        {activeConversation.source === "partner_portal" ? "Partnerportaal" : "Klantportaal"}
                      </>
                    )}
                  </p>
                </div>
                {activeConversation.source_partner_id && (
                  <button
                    onClick={() => navigate(`/admin/partners/${activeConversation.source_partner_id}`)}
                    className="text-xs bg-secondary/40 text-foreground px-2 py-1 rounded-full flex items-center gap-1 hover:bg-secondary/60 transition-colors"
                  >
                    <Building2 className="h-3 w-3" />
                    Partner
                  </button>
                )}
                {projectRefs[activeConversation.id]?.program && (
                  <button
                    onClick={() => navigate(`/admin/aanvragen/${projectRefs[activeConversation.id]!.program!.id}`)}
                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1 hover:bg-primary/20 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    {projectRefs[activeConversation.id]!.program!.reference}
                  </button>
                )}
                {projectRefs[activeConversation.id]?.accommodation && (
                  <button
                    onClick={() => navigate(`/admin/logies/${projectRefs[activeConversation.id]!.accommodation!.id}`)}
                    className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-amber-200 transition-colors"
                  >
                    <BedDouble className="h-3 w-3" />
                    {projectRefs[activeConversation.id]!.accommodation!.label}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeConversation.request_id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={saving}>
                        <Save className="h-4 w-4 mr-1" />
                        Opslaan bij project
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Chat opslaan bij project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          De volledige chatgeschiedenis wordt opgeslagen als notitie bij het project
                          {projectRefs[activeConversation.id]?.program && (
                            <> ({projectRefs[activeConversation.id]!.program!.reference})</>
                          )}
                          . Dit is zichtbaar in de projecttijdlijn.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveToProject}>Opslaan</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {activeConversation.status !== "closed" && (
                  <Button variant="ghost" size="sm" onClick={() => closeConversation(activeConversation.id)}>
                    <X className="h-4 w-4 mr-1" />
                    Sluiten
                  </Button>
                )}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => {
                const msgDate = new Date(msg.created_at);
                const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at) : null;
                const showDateSep = !prevDate || !isSameDay(msgDate, prevDate);
                return (
                  <div key={msg.id}>
                    {showDateSep && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] text-muted-foreground font-medium capitalize">
                          {getDateLabel(msgDate)}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <ChatMessageBubble message={msg} />
                  </div>
                );
              })}
            </div>

            {activeConversation.status !== "closed" && (
              <div className="border-t bg-white p-3">
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Typ je antwoord..."
                    className="min-h-[40px] max-h-[100px] resize-none text-sm"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="flex-shrink-0 h-10 w-10"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
