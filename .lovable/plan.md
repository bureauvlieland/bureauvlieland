

## Plan: Datumscheiding in chat + Inbox-badge verduidelijken

### Probleem 1 — Geen datum in chat-tijdlijn
Berichten tonen alleen het tijdstip (HH:mm), niet de datum. Bij gesprekken die meerdere dagen duren is onduidelijk wanneer berichten zijn verstuurd.

### Probleem 2 — Inbox-badge blijft op "2" staan
De badge op de Inbox-tab telt het aantal **actieve/wachtende conversaties**, niet het aantal **ongelezen berichten**. Zodra je een gesprek opent worden berichten als gelezen gemarkeerd, maar de conversatie-status blijft "active" of "waiting" — dus de badge verandert niet. De badge verdwijnt pas als je gesprekken sluit.

### Aanpak

**1. Datumgroepering in berichten**
In `ChatMessageBubble` of in de berichtenlijst van `AdminChat.tsx`: een datumscheidingsregel tonen wanneer de datum verandert tussen berichten. Bijv. "Vandaag", "Gisteren", of "28 mrt 2026".

**2. Inbox-badge aanpassen naar ongelezen conversaties**
De badge moet het aantal conversaties tonen met ongelezen berichten (visitor messages zonder `read_at`), niet het totaal aantal actieve gesprekken. Zo verdwijnt de badge zodra je alle gesprekken hebt gelezen, ongeacht of ze open of gesloten zijn.

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/pages/admin/AdminChat.tsx` | Datumscheiding invoegen in de berichtenlijst; Inbox-badge baseren op ongelezen conversatie-telling |
| `src/hooks/useAdminChat.ts` | `unreadConversationCount` toevoegen (distinct conversation_id's met ongelezen visitor-berichten) |

Twee bestanden, kleine wijzigingen.

