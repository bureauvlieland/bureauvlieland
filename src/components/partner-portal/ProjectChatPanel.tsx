import { useEffect, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatDateSeparator } from "@/components/chat/ChatDateSeparator";
import { useProjectChat } from "@/hooks/useProjectChat";

interface Props {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  requestId?: string | null;
  accommodationId?: string | null;
}

export const ProjectChatPanel = ({
  partnerId,
  partnerName,
  partnerEmail,
  requestId,
  accommodationId,
}: Props) => {
  const { messages, isLoading, isSending, sendMessage } = useProjectChat({
    partnerId,
    partnerName,
    partnerEmail,
    requestId,
    accommodationId,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="border-b px-4 py-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-sm">Berichten met Bureau Vlieland</h3>
      </div>

      <ScrollArea className="flex-1 px-4" ref={scrollRef as any}>
        <div className="space-y-3 py-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center">Laden...</p>
          )}
          {!isLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nog geen berichten over dit project. Stel hier je vraag aan Bureau Vlieland.
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
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isPartner
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isPartner
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {msg.sender_name} · {format(msgDate, "HH:mm", { locale: nl })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
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
    </Card>
  );
};
