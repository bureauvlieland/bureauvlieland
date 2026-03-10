import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useChat, type ChatMessage } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ChatWidgetProps {
  source: "customer_portal" | "partner_portal";
  sourceToken?: string;
  sourcePartnerId?: string;
  visitorName: string;
  visitorEmail: string;
  requestId?: string;
  defaultOpen?: boolean;
}

export const ChatWidget = ({
  source,
  sourceToken,
  sourcePartnerId,
  visitorName,
  visitorEmail,
  requestId,
  defaultOpen = false,
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isAdminOnline,
    isLoading,
    waitingForReply,
    sendMessage,
  } = useChat({
    source,
    sourceToken,
    sourcePartnerId,
    visitorName,
    visitorEmail,
    requestId,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    const text = message;
    setMessage("");
    await sendMessage(text);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const unreadCount = messages.filter(
    (m) => m.sender_type === "admin" && !m.read_at
  ).length;

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground bg-card px-2 py-0.5 rounded-full shadow-sm border">
            Hulp nodig?
          </span>
          <button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center relative"
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <MessageCircle className="h-5 w-5" />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-primary",
                    isAdminOnline ? "bg-green-400" : "bg-muted-foreground"
                  )}
                />
              </div>
              <div>
                <p className="font-medium text-sm">Bureau Vlieland</p>
                <p className="text-xs opacity-80">
                  {isAdminOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/10 rounded-full p-1 transition-colors"
              aria-label="Sluit chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p className="font-medium mb-1">Welkom! 👋</p>
                <p>Hoe kunnen we je helpen? Stel gerust je vraag.</p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {waitingForReply && (
              <div className="bg-muted/60 rounded-xl px-4 py-3 text-sm text-muted-foreground">
                <p>We kijken of er iemand beschikbaar is. Laat gerust een bericht achter, dan nemen we zo snel mogelijk contact op.</p>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Typ je bericht..."
                className="min-h-[40px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                className="flex-shrink-0 h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isVisitor = message.sender_type === "visitor";

  return (
    <div className={cn("flex", isVisitor ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isVisitor
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        {!isVisitor && (
          <p className="text-xs font-medium mb-1 text-muted-foreground">
            {message.sender_name || "Bureau Vlieland"}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isVisitor ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.created_at), "HH:mm", { locale: nl })}
        </p>
      </div>
    </div>
  );
};
