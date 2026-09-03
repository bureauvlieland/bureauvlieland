import { describe, expect, it } from "vitest";
import { clearChatDraft, getChatDraftKey, readChatDraft, saveChatDraft, sendChatDraft } from "@/lib/chatDraft";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("chat drafts", () => {
  it("bewaart concepten per gesprek", () => {
    const storage = memoryStorage();
    saveChatDraft("gesprek-1", "Lang antwoord", storage);
    saveChatDraft("gesprek-2", "Ander antwoord", storage);

    expect(readChatDraft("gesprek-1", storage)).toBe("Lang antwoord");
    expect(readChatDraft("gesprek-2", storage)).toBe("Ander antwoord");
  });

  it("wist een concept pas na expliciete succesvolle afronding", () => {
    const storage = memoryStorage();
    saveChatDraft("gesprek-1", "Niet verliezen", storage);

    expect(storage.getItem(getChatDraftKey("gesprek-1"))).toBe("Niet verliezen");
    clearChatDraft("gesprek-1", storage);
    expect(readChatDraft("gesprek-1", storage)).toBe("");
  });

  it("faalt veilig als browseropslag niet beschikbaar is", () => {
    const brokenStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };

    expect(() => saveChatDraft("gesprek-1", "Tekst", brokenStorage)).not.toThrow();
    expect(readChatDraft("gesprek-1", brokenStorage)).toBe("");
    expect(() => clearChatDraft("gesprek-1", brokenStorage)).not.toThrow();
  });

  it("behoudt het concept als verzenden mislukt", async () => {
    const storage = memoryStorage();
    saveChatDraft("gesprek-1", "Niet verliezen", storage);

    await expect(sendChatDraft({
      conversationId: "gesprek-1",
      content: "Niet verliezen",
      storage,
      send: async () => { throw new Error("provider weigert"); },
    })).rejects.toThrow("provider weigert");

    expect(readChatDraft("gesprek-1", storage)).toBe("Niet verliezen");
  });

  it("wist het concept uitsluitend na bevestigde verzending", async () => {
    const storage = memoryStorage();
    saveChatDraft("gesprek-1", "Wel verzonden", storage);

    await sendChatDraft({
      conversationId: "gesprek-1",
      content: "Wel verzonden",
      storage,
      send: async () => undefined,
    });

    expect(readChatDraft("gesprek-1", storage)).toBe("");
  });
});