---
name: Configurator Deduplication Logic
description: Klant-checkout dedup-strategie — hard 5-min block + soft warning op alle actieve aanvragen (onbeperkt in tijd) met resend-link flow
type: feature
---

In `src/components/configurator/CheckoutContactForm.tsx`:

- **Hard block (5 min)**: zelfde `customer_email` + non-cancelled aanvraag in laatste 5 minuten → blokkeert submit met foutmelding + referentienummer. Voorkomt dubbele klik / refresh-resubmit.
- **Soft warning (onbeperkt)**: zelfde `customer_email` met een actieve aanvraag (`status != 'cancelled'` en `completion_status != 'fully_invoiced'`, geen tijdslimiet) → toont dialog. Eerder gold een 24-uurs venster; dat is bewust losgelaten omdat events vaak weken/maanden vooruit lopen en klanten anders parallelle dossiers aanmaken.
- **Client-side sessionStorage hash** op email+dates+cart: 60s in-flight lock, 60min recent-success lock. Belt-and-braces tegen dubbele submit.

De dialog bij een gevonden actieve aanvraag biedt **drie acties**:
1. **Primair**: "Stuur mij de link naar mijn lopende aanvraag" → roept edge function `resend-customer-link` aan (mailt de `customer_token`-link naar `customer_email` via Mailjet).
2. **Secundair**: `tel:`-link naar 0562 700 208.
3. **Tertiair** (kleine link onderaan): "Dit is écht een nieuwe aanvraag voor een andere groep of datum" → bestaande `executeSubmit`-flow.

Edge function `resend-customer-link`:
- Public (geen JWT), accepteert `{ request_id, origin? }`, Zod-gevalideerd.
- Weigert als laatste `customer_link_resend` voor dit `request_id` < 5 min geleden was (rate limit).
- Logt naar `email_log` (`email_type: customer_link_resend`, `template_name: customer_link_resend`, `actor: "klant → bureau (self-service link request)"`) en naar `program_request_history` (`action: link_resent`, `actor: customer`).
