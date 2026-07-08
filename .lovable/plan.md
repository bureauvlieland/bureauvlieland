
# Doel

Van "we hopen dat het werkt" naar "we bewijzen elke release dat het werkt" voor alle uitgaande communicatie. Drie parallelle sporen + één afsluitende externe check.

---

## Spoor 1 — E2E-testsuite voor de kritieke workflows

Playwright-suite die per release de belangrijkste ketens end-to-end doorloopt tegen een schone preview-database. Per keten wordt gecontroleerd: (a) juiste statusovergangen in DB, (b) juiste e-mail-rijen in `email_log` met `mailjet_message_id` en juiste `email_type`, (c) juiste ontvanger(s), (d) geen dubbele sends.

Ketens die we dekken:
1. **Configurator → self-service submit** (bestaat al, uitbreiden met e-mailassertions)
2. **Offerte-aanvraag → partnerofferte → klantakkoord → verzendfactuur → aftersales-mail**
3. **Logies-aanvraag → 3 partneroffertes → auto-reject bij selectie → bevestiging klant + partners**
4. **Prijs/aantalwijziging na akkoord → notify-customer-price-change + notify-partner-price-change/headcount**
5. **Partner-wachtwoord reset + intro-email**
6. **Annulering project → notify-partner-cancellation naar alle betrokken partners**
7. **Klantcontact via reply-to subaddressing → Mailjet Parse → project_communications**

E-mails worden **niet echt verzonden** in tests: `MAILJET_TEST_MODE=true` env-var laat `_shared/mailjet-send.ts` de call skippen en een fake MessageID teruggeven, zodat we volledig assertion-based kunnen testen zonder Mailjet-quota te raken.

## Spoor 2 — Content-regressie + idempotency/suppression harden

**Content-regressie:**
- Nieuwe testfile `tests/email-templates.snapshot.test.ts` die per email-type de template rendert met vaste `previewData` en de HTML + subject als snapshot vastlegt. Onbedoelde wijziging in copy, variabele-naam of layout → test faalt vóór deploy.
- Werkt via een klein `renderTemplate(type, data)`-helper die we uit de bestaande template-registry kunnen aanroepen zonder Mailjet.

**Idempotency:**
- Uitbreiding van `_shared/mailjet-send.ts`: optionele `idempotencyKey` parameter (bijv. `"invoice-{invoiceId}"`). Voor send: query `email_log WHERE idempotency_key = ? AND sent_at > now()-interval '10 min'`. Als hit → skip send, log `status='skipped_duplicate'`. Voorkomt dubbele facturen/bevestigingen bij dubbelklik of retry.
- Nieuwe kolom `email_log.idempotency_key TEXT` + partial unique index.
- Toepassen in de ~10 meest kritieke calls (factuur, offerte, akkoord-bevestiging, aftersales).

**Suppression:**
- Nieuwe tabel `email_suppressions (email, reason, created_at, source)`.
- Mailjet-webhook (`mailjet-event-webhook`) schrijft `bounce`/`spam`/`blocked`/`unsub` automatisch naar deze tabel.
- `_shared/mailjet-send.ts` doet **pre-flight check** en weigert send naar geblokkeerde adressen; log `status='suppressed'` in `email_log` met reden. Voorkomt reputatieschade richting Mailjet en irritante herhaal-bounces.
- Beheer-UI: nieuw tabblad in `/admin/email-health` met suppressielijst + handmatig verwijderen.

## Spoor 3 — Extern QA-audit-rapport

Onafhankelijke doorloop van alle 33 communicatiestromen, uitgevoerd door mij als aparte "auditor-pas" (los van de bouwer-pas), met concreet gap-rapport in `.lovable/audit-communicatie-{datum}.md`. Per stroom:
- **Trigger** (welke user-actie / cron / webhook)
- **Ontvanger(s)** en of PII correct is gestript (partner vs klant regels uit memory)
- **Toon** ('u' vs 'je' — memory `formal-communication-tone`)
- **Reply-to** correct ingesteld
- **Test-mail** in preview verstuurd, screenshot in rapport
- **Bevindingen** met severity (blokkerend / hoog / laag)

Levert een prioriteitslijst op waar we daarna gericht op kunnen fixen. Dit is complementair aan de automatische tests: die vangen regressies, dit vangt bestaande gaten die we nog niet kennen.

---

## Volgorde

1. Spoor 2 eerst (kleinste bouw, direct effect): idempotency + suppression + snapshot-tests.
2. Spoor 1 (grootste bouw): E2E-suite, keten voor keten uitbreiden. Start bij factuur-keten (grootste financiële impact).
3. Spoor 3 als afsluitende audit nadat 1 en 2 draaien — dan meet de audit ook meteen of de nieuwe guards werken.

## Buiten scope

- Backfill van de 141 historische rijen zonder `mailjet_message_id` (niet mogelijk).
- Externe penetratietest / security audit (aparte scope).
- Load-testing van Mailjet-quota.

## Technische details

- **Test-DB:** we gebruiken de bestaande preview Supabase (`test_mode`-flag in edge functions herkent dit al) + Playwright met `E2E_BASE_URL=http://localhost:8080`.
- **Fake Mailjet:** env-var `MAILJET_TEST_MODE=1` in edge functions → `_shared/mailjet-send.ts` returned `{ MessageID: 'test-{uuid}', skipped: true }` zonder HTTP-call.
- **Snapshot-tests:** vitest built-in `toMatchSnapshot()`, opslag onder `tests/__snapshots__/email-templates/`.
- **Migratie:** nieuwe kolom + index + tabel via één `supabase--migration` call. Inclusief GRANT + RLS (`email_suppressions`: alleen admin read/write).
- **Guardrail:** bestaande `_shared/mailjet-tracking.test.ts` uitbreiden zodat alle send-call sites ook `idempotencyKey` meesturen waar van toepassing.

