import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatConversation, ChatMessage } from "./useChat";

export function useAdminChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data as unknown as ChatConversation[]);
  }, []);

  useEffect(() => {
    loadConversations();

    // Realtime for new conversations / updates
    const channel = supabase
      .channel("admin-chat-conversations")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_conversations",
      }, () => {
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as unknown as ChatMessage[]);

      // Mark visitor messages as read
      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", activeConversationId)
        .eq("sender_type", "visitor")
        .is("read_at", null);
    };
    loadMessages();

    const channel = supabase
      .channel(`admin-chat-msgs-${activeConversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        const newMsg = payload.new as unknown as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Auto-mark as read if visitor message
        if (newMsg.sender_type === "visitor") {
          supabase
            .from("chat_messages")
            .update({ read_at: new Date().toISOString() })
            .eq("id", newMsg.id)
            .then();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId]);

  // Unread count
  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_type", "visitor")
        .is("read_at", null);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    const channel = supabase
      .channel("admin-unread-count")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
      }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Admin presence
  const updatePresence = useCallback(async (online: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("chat_admin_presence")
      .upsert({
        user_id: session.user.id,
        is_online: online,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    setIsOnline(online);
  }, []);

  // Load initial presence state
  useEffect(() => {
    const loadPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("chat_admin_presence")
        .select("is_online")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setIsOnline(data.is_online);
    };
    loadPresence();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversationId || !content.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    const senderName = session?.user.email?.split("@")[0] || "Admin";

    await supabase.from("chat_messages").insert({
      conversation_id: activeConversationId,
      sender_type: "admin",
      sender_name: senderName,
      content: content.trim(),
    });

    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString(), status: "active" })
      .eq("id", activeConversationId);
  }, [activeConversationId]);

  const closeConversation = useCallback(async (id: string) => {
    await supabase
      .from("chat_conversations")
      .update({ status: "closed" })
      .eq("id", id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    loadConversations();
  }, [activeConversationId, loadConversations]);

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    unreadCount,
    isOnline,
    updatePresence,
    sendMessage,
    closeConversation,
  };
}
