import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminChat } from "@/hooks/useAdminChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  MessageCircle,
  Send,
  X,
  User,
  Building2,
  Clock,
  CheckCheck,
} from "lucide-react";

const AdminChat = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    unreadCount,
    isOnline,
    updatePresence,
    sendMessage,
    closeConversation,
  } = useAdminChat();

  const [message, setMessage] = useState("");
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

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-56px)] lg:h-screen flex">
        {/* Sidebar: conversations list */}
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

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Geen gesprekken
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition-colors",
                  activeConversationId === conv.id && "bg-slate-100"
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
                    {conv.status === "active"
                      ? "Actief"
                      : conv.status === "waiting"
                      ? "Wacht"
                      : "Gesloten"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {conv.visitor_email}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(conv.last_message_at), {
                    addSuffix: true,
                    locale: nl,
                  })}
                </p>
              </button>
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

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isAdmin = msg.sender_type === "admin";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        isAdmin ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                          isAdmin
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-white border rounded-bl-md"
                        )}
                      >
                        {!isAdmin && (
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className={cn(
                              "text-[10px]",
                              isAdmin
                                ? "text-primary-foreground/60"
                                : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          {isAdmin && msg.read_at && (
                            <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
