

# Alle hardcoded mails omzetten naar database-templates

## Inventarisatie

Na analyse van alle edge functions zijn er **19 hardcoded e-mails** verspreid over 8 edge functions die als template in de database moeten komen:

### `send-program-request` (2 templates)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `program_request_bureau` | Notificatie naar bureau bij nieuwe aanvraag | customer_name, customer_company, customer_email, customer_phone, number_of_people, selected_date, bureau_fee, bureau_items, partner_items, self_arranged_items, notes |
| `program_request_customer` | Bevestiging naar klant | customer_name, selected_date, number_of_people, coordinated_items, self_arranged_items, notes, portal_url, bureau_fee |

### `approve-quote-item` (1 template)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `program_request_partner` | Partner notificatie bij goedkeuring item | partner_name, customer_name, customer_company, customer_email, customer_phone, dates, number_of_people, block_name, preferred_time, portal_url |

### `notify-new-chat` (1 template)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `chat_notification_bureau` | Bureau notificatie bij nieuw chatbericht | visitor_name, visitor_email, source_label, message_preview, chat_url |

### `notify-new-chat-reply` (1 template)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `chat_reply_visitor` | Bezoeker notificatie bij nieuw antwoord | visitor_name, portal_link |

### `send-partner-reset-email` (1 template)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `partner_password_reset` | Wachtwoord reset link | partner_name, reset_link |

### `send-partner-intro-email` (1 template)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `partner_intro_portal` | Introductie-email partnerportaal | (geen dynamische variabelen, vaste tekst) |

### `send-customer-accommodation-message` (1 template)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `customer_accommodation_message` | Klantbericht naar logiespartner | partner_name, sender_label, accommodation_name, dates, subject, message, contact_info, reply_info |

### `cancel-program-request` (1 template — logiespartner)
| Template ID | Beschrijving | Variabelen |
|---|---|---|
| `cancellation_accommodation_partner` | Annulering naar logiespartner | partner_name, customer_name, customer_company, accommodation_name, dates, cancellation_reason |

### `update-customer-program` (10 templates)
| Template ID | Beschrijving |
|---|---|
| `people_change_accommodation` | Gewijzigd aantal gasten → logiespartner |
| `date_change_partner` | Datumwijziging → activiteitenpartner |
| `date_change_accommodation` | Datumwijziging → logiespartner |
| `date_change_customer` | Datumwijziging bevestiging → klant |
| `item_cancelled_partner` | Losse activiteit geannuleerd → partner |
| `booking_confirmed_partner` | Definitieve boeking → partner |
| `booking_confirmed_customer` | Definitieve boeking → klant |
| `item_added_partner` | Nieuwe activiteit toegevoegd → partner |
| `item_changes_partner` | Programmawijzigingen → partner |
| `item_changes_customer` | Programmawijzigingen bevestiging → klant |

## Aanpak

### Stap 1: Database migratie
Eén INSERT met alle 19 templates. Elke template bevat de huidige hardcoded HTML als `body_html`, het juiste onderwerp als `subject`, en de lijst van beschikbare variabelen.

### Stap 2: TemplateIds uitbreiden
Nieuwe constanten toevoegen in `_shared/email-templates.ts`.

### Stap 3: Edge functions updaten
Elke functie wordt aangepast om `getRenderedTemplate()` te gebruiken met de bestaande hardcoded HTML als fallback (voor het geval de template niet in de DB staat).

### Bestanden
- Database migratie (19 template-rijen INSERT)
- `supabase/functions/_shared/email-templates.ts` — TemplateIds uitbreiden
- `supabase/functions/send-program-request/index.ts`
- `supabase/functions/approve-quote-item/index.ts`
- `supabase/functions/notify-new-chat/index.ts`
- `supabase/functions/notify-new-chat-reply/index.ts`
- `supabase/functions/send-partner-reset-email/index.ts`
- `supabase/functions/send-partner-intro-email/index.ts`
- `supabase/functions/send-customer-accommodation-message/index.ts`
- `supabase/functions/cancel-program-request/index.ts`
- `supabase/functions/update-customer-program/index.ts`

Geen UI-wijzigingen nodig — de bestaande Email Templates admin-pagina toont automatisch de nieuwe templates.

