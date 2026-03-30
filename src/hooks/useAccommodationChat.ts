import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AccommodationChatMessage {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface UseAccommodationChatOptions {
  accommodationId: string;
  quoteId: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  /** "admin" = admin is sending, "partner" = partner is sending */
  senderRole: "admin" | "partner";
}

export function useAccommodationChat(options: UseAccommodationChatOptions) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AccommodationChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const initialLoadDone = useRef(false);

  // Find or load existing conversation
  useEffect(() => {
    if (!options.quoteId) return;
    initialLoadDone.current = false;

    const findConversation = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("quote_id", options.quoteId)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setConversationId(data[0].id);
      }
      setIsLoading(false);
      initialLoadDone.current = true;
    };
    findConversation();
  }, [options.quoteId]);

  // Load messages when conversation exists
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as unknown as AccommodationChatMessage[]);
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`acc-chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as unknown as AccommodationChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsSending(true);

    let convId = conversationId;

    // Create conversation if needed
    if (!convId) {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          source: "partner_portal",
          source_partner_id: options.partnerId,
          accommodation_id: options.accommodationId,
          quote_id: options.quoteId,
          visitor_name: options.partnerName,
          visitor_email: options.partnerEmail,
          status: "active",
          last_message_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error || !data) {
        setIsSending(false);
        return;
      }
      convId = data.id;
    }

    const senderType = options.senderRole === "admin" ? "admin" : "visitor";
    const senderName = options.senderRole === "admin" ? "Bureau Vlieland" : options.partnerName;

    // Send message and get it back
    const { data: newMsg } = await supabase.from("chat_messages").insert({
      conversation_id: convId,
      sender_type: senderType,
      sender_name: senderName,
      content: content.trim(),
    }).select().single();

    // Optimistically add to local state
    if (newMsg) {
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg as unknown as AccommodationChatMessage]);
    }

    // Set conversationId AFTER insert so realtime subscription picks up future messages
    if (!conversationId) {
      setConversationId(convId);
    }

    // Update last_message_at
    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", convId);

    // Trigger email notification
    try {
      const fnName = senderType === "admin" ? "notify-new-chat-reply" : "notify-new-chat";
      await supabase.functions.invoke(fnName, {
        body: { conversation_id: convId },
      });
    } catch {
      // Non-critical
    }

    setIsSending(false);
  }, [conversationId, options]);

  return {
    conversationId,
    messages,
    isLoading,
    isSending,
    sendMessage,
    hasConversation: !!conversationId,
  };
}
