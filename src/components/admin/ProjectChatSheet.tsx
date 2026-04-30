import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProjectChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  customerName?: string;
  customerEmail?: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  created_at: string;
}

/**
 * Chat-sheet voor de admin om direct met de klant te chatten over een project.
 * Vindt of maakt een chat_conversation gekoppeld aan request_id en source = 'admin_project'.
 */
export function ProjectChatSheet({
  open,
  onOpenChange,
  requestId,
  customerName,
  customerEmail,
}: ProjectChatSheetProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load or create conversation when sheet opens
  useEffect(() => {
    if (!open || !requestId) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        // Find existing conversation linked to this project
        const { data: existing } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("request_id", requestId)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let convId = existing?.id;

        if (!convId) {
          const { data: created, error } = await supabase
            .from("chat_conversations")
            .insert({
              request_id: requestId,
              source: "admin_project",
              visitor_name: customerName || "",
              visitor_email: customerEmail || "",
              status: "active",
            })
            .select("id")
            .single();
          if (error) throw error;
          convId = created.id;
        }

        if (cancelled) return;
        setConversationId(convId);

        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });
        if (!cancelled) setMessages((msgs as unknown as ChatMessage[]) || []);
      } catch (err) {
        console.error("ProjectChatSheet load error:", err);
        if (!cancelled) toast.error("Kon chat niet laden");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, requestId, customerEmail, customerName]);

  // Realtime subscribe
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`project-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || isSending) return;
    const content = input.trim();
    setInput("");
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const senderName = session?.user.email?.split("@")[0] || "Bureau Vlieland";

      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "admin",
        sender_name: senderName,
        content,
      });

      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString(), status: "active" })
        .eq("id", conversationId);

      // Notify customer by email (fire & forget)
      supabase.functions
        .invoke("notify-new-chat-reply", { body: { conversation_id: conversationId } })
        .catch((err) => console.error("notify-new-chat-reply failed:", err));
    } catch (err) {
      console.error("send chat msg error:", err);
      toast.error("Versturen mislukt");
      setInput(content);
    } finally {
      setIsSending(false);
    }
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
            Chat met {customerName || "klant"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            De klant ontvangt een e-mail bij een nieuw bericht en kan reageren in zijn klantportaal.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-3 -mx-2 px-2" ref={scrollRef as any}>
          <div className="space-y-3 py-4">
            {isLoading && (
              <>
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-12 w-2/3 ml-auto" />
              </>
            )}
            {!isLoading && messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nog geen berichten. Stuur het eerste bericht naar {customerName || "de klant"}.
              </p>
            )}
            {messages.map((msg) => {
              const isAdmin = msg.sender_type === "admin";
              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", isAdmin ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      isAdmin
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {msg.sender_name} · {format(new Date(msg.created_at), "HH:mm", { locale: nl })}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t pt-3 mt-2 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht... (Enter om te sturen)"
            className="min-h-[70px] resize-none"
            disabled={!conversationId || isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !conversationId || isSending}
            className="w-full"
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Versturen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
