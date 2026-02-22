import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  source: "customer_portal" | "partner_portal";
  source_token: string | null;
  source_partner_id: string | null;
  visitor_name: string;
  visitor_email: string;
  request_id: string | null;
  status: "active" | "waiting" | "closed";
  last_message_at: string;
  created_at: string;
}

interface UseChatOptions {
  source: "customer_portal" | "partner_portal";
  sourceToken?: string;
  sourcePartnerId?: string;
  visitorName: string;
  visitorEmail: string;
  requestId?: string;
}

export function useChat(options: UseChatOptions) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check admin online status
  useEffect(() => {
    const fetchPresence = async () => {
      const { data } = await supabase
        .from("chat_admin_presence")
        .select("is_online")
        .eq("is_online", true)
        .limit(1);
      setIsAdminOnline(!!data && data.length > 0);
    };
    fetchPresence();

    const channel = supabase
      .channel("chat-admin-presence")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_admin_presence",
      }, () => {
        fetchPresence();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Find existing conversation
  useEffect(() => {
    const findConversation = async () => {
      let query = supabase
        .from("chat_conversations")
        .select("*")
        .eq("source", options.source)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (options.sourceToken) {
        query = query.eq("source_token", options.sourceToken);
      } else if (options.sourcePartnerId) {
        query = query.eq("source_partner_id", options.sourcePartnerId);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setConversation(data[0] as unknown as ChatConversation);
      }
    };
    findConversation();
  }, [options.source, options.sourceToken, options.sourcePartnerId]);

  // Load messages when conversation exists
  useEffect(() => {
    if (!conversation) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as unknown as ChatMessage[]);
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-messages-${conversation.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const newMsg = payload.new as unknown as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // If admin replies, clear waiting state
        if (newMsg.sender_type === "admin") {
          setWaitingForReply(false);
          if (waitingTimerRef.current) {
            clearTimeout(waitingTimerRef.current);
            waitingTimerRef.current = null;
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsLoading(true);

    let conv = conversation;

    // Create conversation if needed
    if (!conv) {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          source: options.source,
          source_token: options.sourceToken || null,
          source_partner_id: options.sourcePartnerId || null,
          visitor_name: options.visitorName,
          visitor_email: options.visitorEmail,
          request_id: options.requestId || null,
          status: "active",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !data) {
        setIsLoading(false);
        return;
      }
      conv = data as unknown as ChatConversation;
      setConversation(conv);
    }

    // Send message
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      sender_type: "visitor",
      sender_name: options.visitorName,
      content: content.trim(),
    });

    // Update last_message_at
    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    // Start waiting timer (2 min)
    setWaitingForReply(false);
    if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    waitingTimerRef.current = setTimeout(() => {
      setWaitingForReply(true);
    }, 2 * 60 * 1000);

    // Trigger email notification
    try {
      await supabase.functions.invoke("notify-new-chat", {
        body: { conversation_id: conv.id },
      });
    } catch {
      // Non-critical
    }

    setIsLoading(false);
  }, [conversation, options]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    };
  }, []);

  return {
    conversation,
    messages,
    isAdminOnline,
    isLoading,
    waitingForReply,
    sendMessage,
  };
}
