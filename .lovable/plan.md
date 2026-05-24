
# Security fix plan — 17 bevindingen

## Bevindingen-overzicht

| # | Severity | Finding | Root cause |
|---|---|---|---|
| 1 | error | `chat_conversations` / `chat_messages` token-bypass | RLS checkt alleen `source_token IS NOT NULL`, geen vergelijking met caller-token |
| 2 | error | `program_requests` anon full exposure | RLS checkt alleen `expires_at > now()` |
| 3 | error | `program_request_items` + `_history` + `program_item_billing_lines` anon exposure | Idem |
| 4 | error | `accommodation_requests` anon exposure | Idem (zelfde policy) |
| 5 | error | `partners` bank/MAP-key publiek | Drie SELECT-policies returnen alle kolommen |
| 6 | error | `accommodation-quote-attachments` bucket publiek leesbaar voor anon | Geen path/token-restrictie |
| 7 | warn  | `accepted_terms_log` anon exposure | Zelfde expires_at-flaw |
| 8 | warn  | `app_settings` volledig publiek | `USING true` |
| 9 | warn  | Realtime broadcasts zonder channel-auth | Geen RLS op `realtime.messages` |
| 10 | warn | `partner-invoices` bucket leesbaar voor élke ingelogde user | Te brede SELECT |
| 11 | warn | `initial_password` plaintext in DB | Wordt opgeslagen i.p.v. eenmalig getoond |
| 12 | warn | Plaintext password in invite-e-mail | Wordt direct meegestuurd i.p.v. magic-link |
| 13 | warn | Voorspelbaar wachtwoord `Vlieland-XXXX` (9 000 combinaties) | Zwakke generator |
| 14 | warn | Anon kan SECURITY DEFINER-functies executen | Geen `REVOKE EXECUTE` |
| 15 | warn | Authenticated kan SECURITY DEFINER-functies executen | Idem |
| 16 | warn | Extension in `public` schema | Standaard install-locatie |
| 17 | warn | Leaked-password-protection uit | Auth-setting |
| 18 | warn | Public bucket allows listing | `storage.objects` SELECT op public bucket |

## Architecturale beslissing

De échte fix voor (1–4, 7) is: alle anonieme portal-reads gaan via **edge functions** (service-role) die het customer/partner-token serverside valideren. De RLS op de onderliggende tabellen wordt daarna `admins + service_role + ingelogde eigenaar`. Anon-rol krijgt **geen** SELECT meer.

We hebben al `get-customer-program`, `update-customer-program`, `get-partner-dashboard`, `select-accommodation-quote`, `accept-quote-proposal`. Wat nu nog direct vanuit de client met de anon-key gequeried wordt en gemigreerd moet worden:

| Bestand | Tabel(len) | Migratie-doel |
|---|---|---|
| `src/pages/SharedProgram.tsx` | `program_requests` | nieuwe edge: `get-shared-program` (token in URL → returnt veilige projectie) |
| `src/pages/ProgrammaOpMaat.tsx` | `program_requests` | bestaande `send-program-request` of nieuwe `get-program-by-token` |
| `src/pages/AccommodationQuotes.tsx` + `useAccommodationQuotes.ts` | `accommodation_requests` + quotes | nieuwe edge: `get-accommodation-portal` (token → request + quotes + extras) |
| `src/pages/Partners.tsx` | `partners` (publieke directory) | gebruik de bestaande `partners_public` view ipv tabel |
| `src/components/customer-portal/AcceptTermsCard.tsx` | `partners` (read partner_name) | via edge of via `partners_public` |
| `src/hooks/useCustomerProgram.ts` | `program_requests`, `program_request_items`, `accommodation_requests` | volledig via `get-customer-program` (al deels) |
| `src/hooks/useItemBillingLines.ts` | `program_request_items` | edge of admin-only |
| `src/hooks/useChat.ts` + `useAccommodationChat.ts` | `chat_conversations`, `chat_messages` | nieuwe edges `get-chat`, `post-chat-message` met token-check + Realtime subscribe via channel-auth |

## Uitvoering in 4 batches

### Batch A — Quick wins (geen breekrisico, ~20 min)
1. **HIBP aanzetten** via `configure_auth` (#17).
2. **Weak temp password** → vervang `Vlieland-XXXX` door 16-byte base64-url generator in `invite-partner`, `bulk-invite-partners`, `resend-partner-invitation`, `admin-reset-partner-password` (#13).
3. **`app_settings`** → drop `USING true`, voeg `is_public boolean default false` kolom toe, markeer huidige bekende publieke keys (`tourist_tax`, `nature_contribution`, `commission_pct`, etc.), nieuwe policy: `USING (is_public = true OR is_admin(auth.uid()))` (#8).
4. **`partner-invoices` bucket** → drop bestaande SELECT-policy, nieuwe policies: admin + service_role + partner-folder-match (#10).
5. **SECURITY DEFINER REVOKE** → `REVOKE EXECUTE ... FROM anon, authenticated` op functies die niet bewust publiek hoeven (#14, #15). Inventarisatie eerst.
6. **Extension in public** → `ALTER EXTENSION ... SET SCHEMA extensions` voor non-Supabase-managed extensions (#16).
7. **Public bucket allows listing** → audit publieke buckets, voeg `USING false` toe op `storage.objects` voor listing-flow waar niet gewenst (#18).

### Batch B — RLS lockdown sensitive data (medium breekrisico)
1. **`partners` tabel** (#5):
   - Maak (of update) `partners_public` view met alleen: `id, name, slug, description, image_url, website, sort_order` etc. — NIET: bank_iban, bank_account_name, map_api_key, partner_token, commission_*, email, contact_email, phone, kvk_number.
   - Drop 3 "Public can view" policies op `partners`.
   - Update `src/pages/Partners.tsx` en `MapActivityCard`/`MapActivityDetailSheet` om de view te gebruiken.
   - Update `AcceptTermsCard.tsx`.
2. **`accommodation-quote-attachments` bucket** (#6):
   - Drop "Public can read quote attachments".
   - Nieuwe policies: admin + service_role + owning partner (`storage.foldername(name)[1] = get_partner_id(auth.uid())`).
   - Customer-portal toegang: signed URL via bestaande `get-customer-program` of nieuwe edge.
3. **`accepted_terms_log`** (#7): drop "Terms logs readable via program request"; admin-only SELECT. Customer hoeft 'm niet client-side te lezen — log-only.

### Batch C — Anon-portal-reads via edge functions (hoog breekrisico, grootste batch)
1. Nieuwe edge `get-shared-program` → vervang query in `SharedProgram.tsx`.
2. Nieuwe edge `get-program-by-token` → vervang query in `ProgrammaOpMaat.tsx`.
3. Nieuwe edge `get-accommodation-portal` (token → request + quotes + extras + history) → vervang `useAccommodationQuotes.ts` + `AccommodationQuotes.tsx`.
4. Migreer `useCustomerProgram.ts` resterende directe queries naar `get-customer-program`.
5. Verplaats `useItemBillingLines.ts` lookup naar `get-customer-program` payload, of nieuwe edge.
6. **Daarna de RLS-flip** (één migratie):
   - `program_requests`: drop "Public can view programs via token". Behoud admin + service_role; voeg partner-via-quote als nodig.
   - `program_request_items`, `program_request_history`, `program_item_billing_lines`: drop anon SELECT.
   - `accommodation_requests`: drop "Accommodation readable via active program".
   - `accommodation_quotes`: drop "Quotes readable via request".
   - `accommodation_quote_extras`: drop "Customers read submitted quote extras".

### Batch D — Chat lockdown + Realtime auth + plaintext passwords (hoog risico, langste werk)
1. **Chat (#1, #9)**:
   - Nieuwe edges `chat-get` (token → conversation + messages), `chat-post-message` (token + content), `chat-mark-read`.
   - Vervang `useChat.ts` + `useAccommodationChat.ts` directe queries.
   - Drop "Visitors can read own conversations via token" + "Messages readable via conversation token". Behoud admin + partner.
   - Voor Realtime: maak `realtime.messages` RLS-policy die topic-naam matched aan een token-claim (subscribe via signed channel-token); óf vervang Realtime door polling/SSE via edge function als channel-auth te complex is.
2. **Plaintext password (#11, #12)**:
   - Nieuwe `partner_invitations` tabel: `partner_id`, `token_hash`, `expires_at`, `used_at`.
   - Edge `invite-partner` / `bulk` / `resend`: maak token, sla hash op, mail magic-link `https://bureauvlieland.nl/partner/set-password?token=…`.
   - Nieuwe pagina + edge `partner-set-initial-password` valideert hash, zet wachtwoord, markeert used.
   - Drop kolom `partners.initial_password` na migratie; verwijder UI-display in `AdminPartnerDetail.tsx`.

## Technische details — RLS-pattern voor token-checks (indien we later toch klant-portal client-side queries willen)
```sql
-- Token uit JWT-claim of session-var ipv harde URL-param
CREATE POLICY "..." ON program_requests FOR SELECT TO anon
USING (
  customer_token = current_setting('request.jwt.claims', true)::jsonb->>'token'
  AND expires_at > now()
);
```
We kiezen bewust voor **edge functions ipv claim-based**, omdat we al edge functions hebben en het simpeler is: niet elk client-component hoeft een JWT te krijgen.

## Volgorde + go/no-go-punten
- Batch A in 1 commit → vraag bevestiging.
- Batch B in 1 commit → smoke test Partners-pagina, map, quote-attachment-download.
- Batch C in 2 commits (eerst edges + client-migratie, dan RLS-flip) → smoke test customer-portal, shared-program-link, accommodation-portal.
- Batch D in 2 commits (eerst chat, dan magic-link) → smoke test chatwidget, partner-invite-flow.

Bij elk commit blijft de scanner-finding vanzelf verdwijnen in de volgende run.

## Buiten-scope / accepteren
- Geen, alle 17 worden geadresseerd.
