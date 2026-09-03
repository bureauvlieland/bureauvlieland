const CHAT_DRAFT_PREFIX = "bureau-vlieland:chat-draft:";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorage(storage?: DraftStorage): DraftStorage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getChatDraftKey(conversationId: string): string {
  return `${CHAT_DRAFT_PREFIX}${conversationId}`;
}

export function readChatDraft(conversationId: string, storage?: DraftStorage): string {
  try {
    return getStorage(storage)?.getItem(getChatDraftKey(conversationId)) ?? "";
  } catch {
    return "";
  }
}

export function saveChatDraft(conversationId: string, content: string, storage?: DraftStorage): void {
  try {
    const target = getStorage(storage);
    if (!target) return;
    if (content) target.setItem(getChatDraftKey(conversationId), content);
    else target.removeItem(getChatDraftKey(conversationId));
  } catch {
    // Draft persistence must never block typing or sending.
  }
}

export function clearChatDraft(conversationId: string, storage?: DraftStorage): void {
  try {
    getStorage(storage)?.removeItem(getChatDraftKey(conversationId));
  } catch {
    // A successful send remains successful even if local cleanup fails.
  }
}