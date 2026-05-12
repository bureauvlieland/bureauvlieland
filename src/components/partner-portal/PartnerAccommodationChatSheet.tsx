import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useAccommodationChat } from "@/hooks/useAccommodationChat";
import { format, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { ChatDateSeparator } from "@/components/chat/ChatDateSeparator";

interface PartnerAccommodationChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accommodationId: string;
  quoteId: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  referenceLabel?: string;
}

export function PartnerAccommodationChatSheet({
  open,
  onOpenChange,
  accommodationId,
  quoteId,
  partnerId,
  partnerName,
  partnerEmail,
  referenceLabel,
}: PartnerAccommodationChatSheetProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isSending, sendMessage, isLoading } = useAccommodationChat({
    accommodationId,
    quoteId,
    partnerId,
    partnerName,
    partnerEmail,
    senderRole: "partner",
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base">
            Berichten — Bureau Vlieland
          </SheetTitle>
          {referenceLabel && (
            <p className="text-sm text-muted-foreground">{referenceLabel}</p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 pr-3" ref={scrollRef as any}>
          <div className="space-y-3 py-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center">Laden...</p>
            )}
            {!isLoading && messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nog geen berichten over deze aanvraag.
              </p>
            )}
            {messages.map((msg, idx) => {
              const isPartner = msg.sender_type === "visitor";
              const msgDate = new Date(msg.created_at);
              const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at) : null;
              const showDateSep = !prevDate || !isSameDay(msgDate, prevDate);
              return (
                <div key={msg.id}>
                  {showDateSep && <ChatDateSeparator date={msgDate} />}
                  <div className={`flex ${isPartner ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isPartner 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-foreground"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isPartner ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {msg.sender_name} · {format(msgDate, "HH:mm", { locale: nl })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-3 border-t">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht..."
            className="min-h-[60px] max-h-[120px] resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="icon"
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
