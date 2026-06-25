import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TERMINAL_COMPLETION_STATUSES } from "@/lib/projectActivity";


const SEEN_KEY = "admin_inbox_seen_at";
const LOOKBACK_DAYS = 14;

export type InboxEmail = {
  id: string;
  subject: string | null;
  contact_name: string | null;
  contact_email: string | null;
  content: string;
  created_at: string;
  request_id: string | null;
  accommodation_id: string | null;
};

export type InboxChatMessage = {
  id: string;
  conversation_id: string;
  content: string;
  sender_name: string;
  sender_type: string;
  created_at: string;
  source: string;
  request_id: string | null;
  accommodation_request_id: string | null;
  visitor_name: string;
};

export type InboxLiveChat = {
  conversation_id: string;
  visitor_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export type InboxData = {
  emails: InboxEmail[];
  chats: InboxChatMessage[];
  liveChats: InboxLiveChat[];
  chatUnreadConversations: number;
  liveChatUnreadTotal: number;
  totalUnread: number;
};

function getSeenAt(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

async function fetchInbox(): Promise<InboxData> {
  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  const seenAt = getSeenAt();

  const [emailsRes, msgsRes] = await Promise.all([
    supabase
      .from("project_communications")
      .select("id, subject, contact_name, contact_email, content, communication_date, request_id, accommodation_id, direction")
      .eq("direction", "inbound")
      .is("answered_at", null)
      .gte("communication_date", sinceIso)
      .order("communication_date", { ascending: false })
      .limit(20),
    supabase
      .from("chat_messages")
      .select("id, conversation_id, content, sender_name, sender_type, created_at, read_at")
      .neq("sender_type", "admin")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (emailsRes.error) throw emailsRes.error;
  if (msgsRes.error) throw msgsRes.error;

  const emails: InboxEmail[] = (emailsRes.data ?? []).map((e: any) => ({
    id: e.id,
    subject: e.subject,
    contact_name: e.contact_name,
    contact_email: e.contact_email,
    content: e.content,
    created_at: e.communication_date,
    request_id: e.request_id,
    accommodation_id: e.accommodation_id,
  }));

  // Fetch conversations for chat messages
  const convIds = Array.from(new Set((msgsRes.data ?? []).map((m: any) => m.conversation_id)));
  let convMap = new Map<string, any>();
  if (convIds.length > 0) {
    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("id, source, request_id, accommodation_request_id, visitor_name, last_message_at")
      .in("id", convIds);
    (convs ?? []).forEach((c: any) => convMap.set(c.id, c));
  }

  const allMsgs: (InboxChatMessage & { read_at: string | null })[] = (msgsRes.data ?? []).map((m: any) => {
    const conv = convMap.get(m.conversation_id) ?? {};
    return {
      id: m.id,
      conversation_id: m.conversation_id,
      content: m.content,
      sender_name: m.sender_name,
      sender_type: m.sender_type,
      created_at: m.created_at,
      read_at: m.read_at,
      source: conv.source ?? "unknown",
      request_id: conv.request_id ?? null,
      accommodation_request_id: conv.accommodation_request_id ?? null,
      visitor_name: conv.visitor_name ?? m.sender_name,
    };
  });

  // Split: widget chat (source="website") vs project/logies chat
  const isWidget = (s: string) => s === "website" || s === "widget" || s === "homepage";
  // Project/partner chat in "te beantwoorden": alleen ongelezen berichten
  const unreadProjectMsgs = allMsgs.filter((m) => !isWidget(m.source) && m.read_at === null);
  const chats = unreadProjectMsgs.slice(0, 15);
  const chatUnreadConversations = new Set(unreadProjectMsgs.map((m) => m.conversation_id)).size;

  // Live chat: group by conversation, only unread, only widget source
  const widgetMsgs = allMsgs.filter((m) => isWidget(m.source) && m.read_at === null);
  const liveMap = new Map<string, InboxLiveChat>();
  for (const m of widgetMsgs) {
    const cur = liveMap.get(m.conversation_id);
    if (cur) {
      cur.unread_count += 1;
      if (m.created_at > cur.last_message_at) {
        cur.last_message = m.content;
        cur.last_message_at = m.created_at;
      }
    } else {
      liveMap.set(m.conversation_id, {
        conversation_id: m.conversation_id,
        visitor_name: m.visitor_name,
        last_message: m.content,
        last_message_at: m.created_at,
        unread_count: 1,
      });
    }
  }
  const liveChats = Array.from(liveMap.values())
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
    .slice(0, 15);
  const liveChatUnreadTotal = liveChats.reduce((s, l) => s + l.unread_count, 0);

  // Unread e-mails = nieuwer dan watermerk (gemarkeerd als nieuw in bel)
  const newEmails = emails.filter((e) => e.created_at > seenAt).length;

  return {
    emails,
    chats: chats.map(({ read_at, ...rest }) => rest),
    liveChats,
    chatUnreadConversations,
    liveChatUnreadTotal,
    totalUnread: newEmails + chatUnreadConversations + liveChatUnreadTotal,
  };
}

export function useAdminInbox() {
  const queryClient = useQueryClient();
  const [, forceTick] = useState(0);

  const query = useQuery({
    queryKey: ["admin-inbox"],
    queryFn: fetchInbox,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
    const ch = supabase
      .channel("admin-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_communications" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  const markAllSeen = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {}
    forceTick((t) => t + 1);
    queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
  }, [queryClient]);

  const seenAt = getSeenAt();
  const isNew = (iso: string) => iso > seenAt;

  return { ...query, markAllSeen, isNew };
}
