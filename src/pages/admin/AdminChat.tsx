import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
} from "lucide-react";

const AdminChat = () => {
  const {
    conversations,
    filteredConversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    unreadCount,
    unreadConversationIds,
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message;
    setMessage("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const handleSaveToProject = async () => {
    if (!activeConversationId) return;
    setSaving(true);
    const success = await saveChatToProject(activeConversationId);
    setSaving(false);
    if (success) {
      toast.success("Chatgeschiedenis opgeslagen bij project");
    } else {
      toast.error("Kon chatgeschiedenis niet opslaan");
    }
  };

  // Inbox badge = unread conversations (not total active)
  const inboxUnreadCount = unreadConversationIds.size;

  // Helper for date separators
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return "Vandaag";
    if (isYesterday(date)) return "Gisteren";
    return formatNL(date, "EEEE d MMMM yyyy");
  };
  

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-56px)] lg:h-screen flex">
        {/* Sidebar */}
        <div className="w-80 border-r bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Chat</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {isOnline ? "Online" : "Offline"}
              </span>
              <Switch
                checked={isOnline}
                onCheckedChange={(v) => updatePresence(v)}
              />
            </div>
          </div>

          {/* Status tabs */}
          <div className="px-3 pt-3">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ChatStatusFilter)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="waiting" className="flex-1 text-xs gap-1">
                  Inbox
                  {inboxUnreadCount > 0 && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                      {inboxUnreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="closed" className="flex-1 text-xs">
                  Gesloten
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Geen gesprekken
              </div>
            )}
            {filteredConversations.map((conv) => (
              <ChatConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversationId === conv.id}
                projectRef={conv.request_id ? projectRefs[conv.request_id] : undefined}
                onClick={() => setActiveConversationId(conv.id)}
              />
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-slate-50">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecteer een gesprek</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">
                      {activeConversation.visitor_name || "Bezoeker"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeConversation.visitor_email} •{" "}
                      {activeConversation.source === "partner_portal"
                        ? "Partnerportaal"
                        : "Klantportaal"}
                    </p>
                  </div>
                  {activeConversation.request_id && projectRefs[activeConversation.request_id] && (
                    <button
                      onClick={() => navigate(`/admin/aanvragen/${activeConversation.request_id}`)}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1 hover:bg-primary/20 transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      {projectRefs[activeConversation.request_id]}
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
                            {projectRefs[activeConversation.request_id!] && (
                              <> ({projectRefs[activeConversation.request_id!]})</>
                            )}
                            . Dit is zichtbaar in de projecttijdlijn.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSaveToProject}>
                            Opslaan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {activeConversation.status !== "closed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => closeConversation(activeConversation.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Sluiten
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <ChatMessageBubble key={msg.id} message={msg} />
                ))}
              </div>

              {/* Input */}
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
    </AdminLayout>
  );
};

export default AdminChat;
