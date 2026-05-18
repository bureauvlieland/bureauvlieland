# Plan: email templates 1-voor-1 doorlopen

Er staan **47 actieve templates** in de database. In plaats van weer een grote sweep doen we per template een gerichte audit + fix. Zo blijven changes klein, testbaar en goed te valideren.

## Werkwijze per template

Voor elke template doe ik:

1. **Inhoud ophalen** uit `email_templates` (subject + body_html).
2. **Statische audit**:
   - Links (`href=`) controleren → bestaat de route? Juiste pad (bv. `/mijn-programma/` ipv `/programma/` of `/klant/`)?
   - Variabelen (`{{...}}`) checken → worden ze daadwerkelijk meegegeven door de edge function die deze template aanroept?
   - Conditionals (`{{#if}}`) op haakjes/sluiting.
   - HTML-validiteit (geen kapotte tags, geen losse `<style>` die als tekst zou renderen).
3. **Trigger-pad controleren**: welke edge function/code verstuurt deze template? Krijgt die alle variabelen mee? Wordt `logEmail` met juiste metadata aangeroepen?
4. **Live test waar zinvol** via `render-email-template` of `curl_edge_functions`, output inspecteren.
5. **Fix toepassen** (template body, edge function, of beide) en kort rapporteren wat er mis was + wat is aangepast.

## Voorgestelde volgorde (logische clusters)

**Batch 1 — Klant-portal & links (recent geraakt, hoogste impact):**
1. `arrival_reminder`
2. `program_request_customer`
3. `quote_offer_customer`
4. `booking_confirmed_customer`
5. `guest_details_reminder`
6. `reminder_customer_quote` + `reminder_customer_request`

**Batch 2 — Logies klant-flow:**
7. `accommodation_request_customer`
8. `accommodation_selected_customer`
9. `accommodation_quote_notification`

**Batch 3 — Partner-flow activiteiten:**
10. `program_request_partner`
11. `item_added_partner` / `item_changes_partner` / `item_cancelled_partner`
12. `status_confirmed` / `status_unavailable` / `status_alternative`
13. `counter_proposal_partner` / `counter_proposal_response`

**Batch 4 — Partner-flow logies:**
14. `accommodation_selected_partner` / `accommodation_rejected_partner`
15. `cancellation_accommodation_partner` / `quote_expired_partner`
16. `date_change_accommodation` / `people_change_accommodation`
17. `customer_accommodation_message` / `inbound_reply_to_customer`

**Batch 5 — Bureau & overig:**
18. `program_request_bureau` / `quote_request_bureau`
19. `chat_notification_bureau` / `chat_reply_visitor`
20. `cancellation_customer` / `cancellation_partner` / `date_change_customer` / `date_change_partner`
21. `booking_confirmed_partner` / `item_changes_customer`
22. `partner_invitation` / `partner_intro_portal` / `partner_password_reset`
23. `proforma_commission_notification`
24. `presales_*` (4 stuks)
25. `reminder_partner_quote`

## Wat ik nu nodig heb

- **Akkoord op de volgorde** (of geef andere prioriteit).
- **Batch-grootte**: per template apart bevestigen, of telkens 3-5 in één keer?
- Mag ik bij twijfel een test-render uitvoeren om de output te zien voordat ik fix?

Zodra je akkoord geeft start ik met **Batch 1 / template 1 = `arrival_reminder`**.
