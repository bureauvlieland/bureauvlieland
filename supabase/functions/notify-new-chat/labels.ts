// Pure hulpfuncties voor de bureaumelding bij een nieuw chatbericht, los van
// Deno.serve zodat de test ze kan importeren.

/** Hoe het gesprek binnenkwam (chat_conversations.source, zie src/hooks/useChat.ts). */
export type ChatSource = "customer_portal" | "partner_portal" | "whatsapp" | "presales" | string | null | undefined;

/**
 * Leesbaar bronlabel voor het bureau. Een logieschat (accommodation_id gevuld)
 * komt van een logiespartner, ongeacht de source-kolom.
 */
export function sourceLabelFor(conv: { source?: ChatSource; accommodation_id?: string | null }): string {
  if (conv.accommodation_id) return "Logiespartner";
  switch (conv.source) {
    case "partner_portal":
      return "Partnerportaal";
    case "whatsapp":
      return "WhatsApp";
    case "presales":
      return "Website";
    case "customer_portal":
      return "Klantportaal";
    default:
      return "Chat";
  }
}

/**
 * Deeplink naar het gesprek in het Berichtencentrum. AdminMessages leest
 * `?gesprek=chat:<id>` (src/pages/admin/AdminMessages.tsx, parseConversationParam).
 */
export function chatConversationUrl(baseUrl: string, conversationId: string): string {
  return `${baseUrl}/admin/berichten?gesprek=chat:${encodeURIComponent(conversationId)}`;
}
