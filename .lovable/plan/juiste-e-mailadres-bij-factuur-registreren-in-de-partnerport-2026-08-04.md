# Juiste e-mailadres bij factuur registreren in de partnerportal

## Probleem

In de partnerportal staat bij "Facturatie registreren" (en bij de logies-offerte) het adres `administratie@bureauvlieland.nl` in het blok "Factureer aan Bureau Vlieland". Dat is niet het adres waar inkoopfacturen heen moeten. Bovendien worden op andere plekken in de portal drie verschillende adressen genoemd (`inkoop@reply.bureauvlieland.nl`, `administratie@...`), terwijl de inkoopfactuur-inbox in de admin `invoices@reply.bureauvlieland.nl` is.

## Wat er wordt gedaan

1. Eén vast adres voor inkoopfacturen: **invoices@reply.bureauvlieland.nl**, vastgelegd op één plek in de code en overal daaruit gebruikt.
2. In de partnerportal wordt het adres in de blokken "Factureer aan Bureau Vlieland" gewijzigd van `administratie@bureauvlieland.nl` naar het factuuradres, met een klikbare mailto-link en de toelichting dat de PDF ook direct in het portaal geüpload kan worden.
3. Alle bestaande verwijzingen naar `inkoop@reply.bureauvlieland.nl` in de partnerportal, partnerhandleiding en partner-e-mails worden gelijkgetrokken naar `invoices@reply.bureauvlieland.nl`, zodat partners nooit twee verschillende adressen zien.
4. Waar een algemeen contactadres wordt bedoeld (niet facturen), wordt **hallo@bureauvlieland.nl** gebruikt.

## Technische details

- Nieuwe constante in `src/lib/appSettings.ts` (of een klein bestand `src/lib/bureauContact.ts`): `PURCHASE_INVOICE_INBOX = "invoices@reply.bureauvlieland.nl"` en `GENERAL_CONTACT_EMAIL = "hallo@bureauvlieland.nl"`; idem in `supabase/functions/_shared/` voor de edge functions.
- Frontend aanpassingen: `InvoiceRegistrationDialog.tsx` (fallback-e-mail in `bureauInfo`), `PartnerAccommodationQuoteSheet.tsx` (regel met hardcoded adres), `RegisterCollectivePartnerInvoiceDialog.tsx` (`INKOOP_INBOX`), `PartnerFinance.tsx`, `PartnerAccommodationRequestCard.tsx`, `PartnerGuides.tsx`.
- Edge functions met partner-facturatietekst: `send-items-to-partners`, `accept-quote-proposal`, `register-partner-invoice`, `update-customer-program` — daarna opnieuw uitrollen.
- `inbound-email` accepteert `invoices@`, `inkoop@` en `facturen@` al, dus binnenkomende post op het oude adres blijft werken; geen migratie nodig.
- Instelling `bureau_admin_email` blijft ongemoeid voor admin-/klantfacturen; de partnerportal gebruikt niet langer die instelling voor het inkoopfactuuradres.
- Test toevoegen die controleert dat er in de partner-gerichte teksten geen `administratie@`- of `inkoop@`-adres meer voorkomt.
