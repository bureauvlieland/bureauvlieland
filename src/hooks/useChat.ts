import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin" | "customer";
  sender_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
  twilio_message_sid?: string | null;
}

export interface ChatConversation {
  id: string;
  source: "customer_portal" | "partner_portal" | "whatsapp";
  source_token: string | null;
  source_partner_id: string | null;
  visitor_name: string;
  visitor_email: string;
  request_id: string | null;
  accommodation_request_id: string | null;
  status: "active" | "waiting" | "closed";
  last_message_at: string;
  created_at: string;
  phone_number?: string | null;
  whatsapp_contact_id?: string | null;
}

interface UseChatOptions {
  source: "customer_portal" | "partner_portal";
  sourceToken?: string;
  sourcePartnerId?: string;
  visitorName: string;
  visitorEmail: string;
  requestId?: string;
  accommodationRequestId?: string;
}

/**
 * useChat
 * - customer_portal (anon, token-based): all reads/writes via edge functions + polling (5s).
 * - partner_portal (authenticated): direct supabase client + Realtime, governed by partner RLS.
 */
export function useChat(options: UseChatOptions) {
  const isVisitor = options.source === "customer_portal";

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- VISITOR (customer_portal) flow: edge function + polling ----------
  const fetchVisitorThread = useCallback(async () => {
    if (!options.sourceToken) return;
    try {
      const { data } = await supabase.functions.invoke("chat-visitor-thread", {
        body: { source: "customer_portal", sourceToken: options.sourceToken },
      });
      if (!data) return;
      if (data.conversation) setConversation(data.conversation as ChatConversation);
      if (Array.isArray(data.messages)) {
        setMessages((prev) => {
          const next = data.messages as ChatMessage[];
          // If admin replied since last poll, clear waiting
          if (next.some((m) => m.sender_type === "admin")) {
            const hadAdminBefore = prev.some((m) => m.sender_type === "admin");
            if (!hadAdminBefore) {
              setWaitingForReply(false);
              if (waitingTimerRef.current) {
                clearTimeout(waitingTimerRef.current);
                waitingTimerRef.current = null;
              }
            }
          }
          return next;
        });
      }
      setIsAdminOnline(!!data.isAdminOnline);
    } catch (err) {
      console.error("chat-visitor-thread error", err);
    }
  }, [options.sourceToken]);

  useEffect(() => {
    if (!isVisitor || !options.sourceToken) return;
    fetchVisitorThread();
    pollRef.current = setInterval(fetchVisitorThread, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [isVisitor, options.sourceToken, fetchVisitorThread]);

  // ---------- PARTNER (authenticated) flow: direct supabase + Realtime ----------
  useEffect(() => {
    if (isVisitor) return; // visitor handled above
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
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_admin_presence" }, fetchPresence)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isVisitor]);

  useEffect(() => {
    if (isVisitor) return;
    const findConversation = async () => {
      let query = supabase
        .from("chat_conversations")
        .select("*")
        .eq("source", options.source)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1);
      if (options.sourcePartnerId) query = query.eq("source_partner_id", options.sourcePartnerId);
      const { data } = await query;
      if (data && data.length > 0) setConversation(data[0] as unknown as ChatConversation);
    };
    findConversation();
  }, [isVisitor, options.source, options.sourcePartnerId]);

  useEffect(() => {
    if (isVisitor || !conversation) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as unknown as ChatMessage[]);
    };
    loadMessages();
    const channel = supabase
      .channel(`chat-messages-${conversation.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const newMsg = payload.new as unknown as ChatMessage;
        setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
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
  }, [isVisitor, conversation?.id]);

  // ---------- sendMessage ----------
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsLoading(true);

    if (isVisitor) {
      try {
        const { data, error } = await supabase.functions.invoke("chat-visitor-send", {
          body: {
            source: "customer_portal",
            sourceToken: options.sourceToken,
            visitorName: options.visitorName,
            visitorEmail: options.visitorEmail,
            content: content.trim(),
            requestId: options.requestId || null,
          },
        });
        if (error) throw error;
        if (data?.conversation) setConversation(data.conversation as ChatConversation);
        if (data?.message) {
          setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message as ChatMessage]));
        }
        // Start waiting timer (2 min)
        setWaitingForReply(false);
        if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
        waitingTimerRef.current = setTimeout(() => setWaitingForReply(true), 2 * 60 * 1000);
        // Refresh quickly after send
        fetchVisitorThread();
      } catch (err) {
        console.error("send visitor message failed", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Partner (authenticated) flow
    let conv = conversation;
    if (!conv) {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          source: options.source,
          source_partner_id: options.sourcePartnerId || null,
          visitor_name: options.visitorName,
          visitor_email: options.visitorEmail,
          request_id: options.requestId || null,
          accommodation_request_id: options.accommodationRequestId || null,
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

    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      sender_type: "visitor",
      sender_name: options.visitorName,
      content: content.trim(),
    });
    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    setWaitingForReply(false);
    if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    waitingTimerRef.current = setTimeout(() => setWaitingForReply(true), 2 * 60 * 1000);

    try {
      await supabase.functions.invoke("notify-new-chat", { body: { conversation_id: conv.id } });
    } catch {
      // non-critical
    }

    setIsLoading(false);
  }, [isVisitor, conversation, options, fetchVisitorThread]);

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
