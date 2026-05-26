import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectChatMessage {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface UseProjectChatOptions {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  requestId?: string | null;
  accommodationId?: string | null;
}

/**
 * Project-scoped chat thread for a partner.
 * One conversation per (partner_id, request_id) OR (partner_id, accommodation_id).
 * Uses chat_conversations + chat_messages with realtime via the partner-authenticated client.
 */
export function useProjectChat({
  partnerId,
  partnerName,
  partnerEmail,
  requestId,
  accommodationId,
}: UseProjectChatOptions) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Find or create the project-scoped conversation
  useEffect(() => {
    if (!partnerId || (!requestId && !accommodationId)) return;
    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      let query = supabase
        .from("chat_conversations")
        .select("id")
        .eq("source", "partner_portal")
        .eq("source_partner_id", partnerId)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (requestId) {
        query = query.eq("request_id", requestId).is("accommodation_id", null);
      } else if (accommodationId) {
        query = query.eq("accommodation_id", accommodationId);
      }

      const { data } = await query;
      let convId = data?.[0]?.id as string | undefined;

      if (!convId) {
        const { data: inserted } = await supabase
          .from("chat_conversations")
          .insert({
            source: "partner_portal",
            source_partner_id: partnerId,
            visitor_name: partnerName,
            visitor_email: partnerEmail,
            request_id: requestId ?? null,
            accommodation_id: accommodationId ?? null,
            status: "active",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        convId = inserted?.id;
      }

      if (cancelled || !convId) {
        setIsLoading(false);
        return;
      }
      setConversationId(convId);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (!cancelled && msgs) setMessages(msgs as unknown as ProjectChatMessage[]);
      setIsLoading(false);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [partnerId, requestId, accommodationId, partnerName, partnerEmail]);

  // Realtime
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
          const newMsg = payload.new as unknown as ProjectChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !conversationId) return;
      setIsSending(true);
      try {
        await supabase.from("chat_messages").insert({
          conversation_id: conversationId,
          sender_type: "visitor",
          sender_name: partnerName,
          content: content.trim(),
        });
        await supabase
          .from("chat_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
        try {
          await supabase.functions.invoke("notify-new-chat", {
            body: { conversation_id: conversationId },
          });
        } catch {
          /* non-critical */
        }
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, partnerName]
  );

  return { conversationId, messages, isLoading, isSending, sendMessage };
}
