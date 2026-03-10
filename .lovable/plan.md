

# Chatnotificatie naar klant bij admin-antwoord

## Probleem
De admin stuurt een chatbericht, maar de klant krijgt hier geen melding van. Alleen als de klant toevallig op het portaal is en de chatwidget opent, ziet ze het bericht. Dat is onvoldoende voor productiegebruik.

## Oplossing

### Optie A: E-mailnotificatie bij admin-antwoord (aanbevolen)
Wanneer een admin een chatbericht stuurt, stuur een e-mail naar de klant met:
- Een korte preview van het bericht
- Een directe link naar het klantportaal (waar de chat automatisch opent)

**Implementatie:**
1. **Nieuwe edge function `notify-new-chat-reply`** — Wordt aangeroepen vanuit `useAdminChat.ts` na het versturen van een admin-bericht. Haalt de conversation op, pakt `visitor_email` en `source_token`, en stuurt een notificatie-email via Mailjet.
2. **Debounce/throttle** — Maximaal 1 e-mail per gesprek per 10 minuten, om spam te voorkomen bij snel heen-en-weer chatten. Tracked via een `last_email_notified_at` kolom op `chat_conversations`.
3. **Chat auto-open via URL parameter** — Voeg `?chat=open` toe aan de portallink in de mail. `CustomerProgram.tsx` leest deze parameter en opent de widget automatisch.

### Wijzigingen

| Wat | Bestand |
|---|---|
| Nieuwe edge function | `supabase/functions/notify-new-chat-reply/index.ts` |
| DB migratie | `last_email_notified_at` kolom op `chat_conversations` |
| Admin chat hook aanpassen | `src/hooks/useAdminChat.ts` — na sendMessage de edge function aanroepen |
| Auto-open chat | `src/pages/CustomerProgram.tsx` — `?chat=open` query param uitlezen |
| Auto-open chat | `src/components/chat/ChatWidget.tsx` — prop `defaultOpen` toevoegen |

### E-mailtemplate (kort)
> **Onderwerp:** Nieuw bericht van Bureau Vlieland
>
> Hallo [naam],
>
> Je hebt een nieuw bericht ontvangen in je persoonlijke portaal.
>
> [Bekijk bericht →]

Geen berichtinhoud in de e-mail zelf (privacy).

