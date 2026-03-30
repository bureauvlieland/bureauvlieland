

## Plan: Fix chathistorie niet zichtbaar in accommodation chat

### Probleem
Het bericht is succesvol opgeslagen in de database, maar de UI toont "Nog geen berichten" door twee timing-problemen in `useAccommodationChat.ts`:

1. **Na eerste bericht:** `setConversationId()` wordt aangeroepen vóórdat het bericht is ingevoegd. React kan de re-render (en dus `loadMessages`) uitvoeren vóór de insert klaar is → 0 berichten gevonden. De realtime subscription is op dat moment ook nog niet actief.

2. **Bij heropenen sheet:** De `findConversation` query werkt correct, maar na het laden van berichten wordt geen optimistische update gedaan als berichten via `sendMessage` worden verstuurd.

### Oplossing
Twee aanpassingen in `src/hooks/useAccommodationChat.ts`:

**A) Optimistische message-update na insert**
Na het succesvol inserten van een bericht, dit direct toevoegen aan de lokale `messages` state (zonder te wachten op realtime of een re-fetch):

```ts
const { data: newMsg } = await supabase.from("chat_messages").insert({...}).select().single();
if (newMsg) {
  setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
}
```

**B) Volgorde fixen bij nieuwe conversatie**
Bij het aanmaken van een nieuwe conversatie: eerst het bericht inserten, dan pas `setConversationId` aanroepen. Of: de volgorde behouden maar na alle inserts een expliciete `loadMessages` doen.

### Bestand
| Bestand | Actie |
|---|---|
| `src/hooks/useAccommodationChat.ts` | Optimistische updates + volgorde fix |

Eén bestand, kleine wijziging.

