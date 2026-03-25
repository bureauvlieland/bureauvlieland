

## E-mail Review: Bevindingen en aanpassingen

### Overzicht van alle onderzochte edge functions (12 functies, ~25 e-mailtypen)

---

### Bevinding 1: **KRITIEK — Klant-PII lekt naar partners in `accept-quote-proposal`**

**Bestand:** `supabase/functions/accept-quote-proposal/index.ts` (regel 148-155)

De fallback `generatePartnerNotificationEmail()` toont de volledige klantgegevens (naam, bedrijf, e-mail, telefoon) aan partners. Dit is in strijd met het bureau_central model waar Bureau Vlieland de centrale contactpartij is.

**Aanpassing:** Klantgegevens vervangen door Bureau Vlieland contactgegevens, vergelijkbaar met `select-accommodation-quote`. Alleen de groepsnaam (bedrijf/naam) tonen als "Gastgegevens", niet de directe contactgegevens.

---

### Bevinding 2: **KRITIEK — Klant-PII lekt in `accept-quote-proposal` e-mailonderwerp**

**Bestand:** `accept-quote-proposal/index.ts` (regel 575)

Het onderwerp is: `Nieuwe aanvraag: ${program.customer_name}` — de klantnaam staat in het onderwerp naar de partner. Dit moet vervangen worden door de referentie of een generieke aanduiding.

**Aanpassing:** Onderwerp wijzigen naar `Nieuwe aanvraag: ${program.reference_number}` of `Nieuwe aanvraag via Bureau Vlieland — ${program.reference_number}`.

---

### Bevinding 3: **Klant-PII lekt ook in `send-items-to-partners`**

**Bestand:** `supabase/functions/send-items-to-partners/index.ts` (regel 296)

Onderwerp: `Nieuwe aanvraag: ${program.customer_name} - ${program.reference_number}`. Ook hier wordt de klantnaam direct naar partners gestuurd.

**Aanpassing:** Onderwerp wijzigen naar alleen het referentienummer: `Nieuwe aanvraag via Bureau Vlieland — ${program.reference_number}`.

---

### Bevinding 4: **Inconsistente toon — "u" vs "je" naar partners**

Volgens de communicatierichtlijnen moeten partnermails informeel ("je/jij") zijn. Huidige staat:

| Functie | Huidige toon | Correct |
|---|---|---|
| `send-items-to-partners` | Formeel ("uw Partner Portal") | **Fixen → "je"** |
| `accept-quote-proposal` | Formeel ("uw Partner Portal") | **Fixen → "je"** |
| `cancel-program-request` | Mix ("je hoeft" maar "Met vriendelijke groet") | **OK, minor** |
| `select-accommodation-quote` | Formeel ("Uw offerte") | **Fixen → "je"** |
| `send-accommodation-quote-request` | Informeel ("je offerte") | OK |
| `update-partner-item-status` status mail → klant | Formeel ("uw programma") | OK (klant = formeel) |

**Aanpassing:** Partner-gerichte e-mails consequent naar "je/jij" omzetten.

---

### Bevinding 5: **Partner portal link in `send-items-to-partners` en `accept-quote-proposal` wijst naar `/partner/login`**

Dit is correct als partners inloggen via hun account. Maar de link tekst zegt "Open Partner Portal" zonder context. Kan verwarrend zijn.

**Aanpassing:** Geen wijziging nodig, maar tekst verduidelijken: "Log in op het partnerportaal om deze aanvraag te bekijken."

---

### Bevinding 6: **`cancel-program-request` stuurt klant-PII naar partners bij annulering**

**Bestand:** `cancel-program-request/index.ts` (regel 264-298)

De annuleringsmail aan partners bevat: `customer_name`, `company_name`. Bij bureau_central zou dit Bureau Vlieland moeten zijn.

**Aanpassing:** Klantgegevens in annuleringsmail naar partners vervangen door referentienummer. De partner hoeft niet te weten wie de eindklant is.

---

### Bevinding 7: **`update-partner-item-status` status-emails aan klant tonen partnernaam**

Dit is correct — de klant mag weten welke partner bevestigd heeft. Geen wijziging nodig.

---

### Bevinding 8: **`send-accommodation-quote-request` gebruikt hardcoded `bureauvlieland.nl/partner` link**

**Bestand:** `send-accommodation-quote-request/index.ts` (regel 74)

De link `https://bureauvlieland.nl/partner` is hardcoded en werkt niet in test/preview omgevingen.

**Aanpassing:** `getPortalBaseUrl(origin)` gebruiken voor dynamische URL.

---

### Bevinding 9: **`send-accommodation-request` fallback HTML gebruikt ongedefinieerde `baseUrl` variabele**

**Bestand:** `send-accommodation-request/index.ts` (regel ~88, `getFallbackBureauHtml`)

De fallback HTML verwijst naar `${baseUrl}/admin/logies/${request.id}` maar `baseUrl` is niet in scope van die functie.

**Aanpassing:** `baseUrl` als parameter meegeven aan de fallback functie, of de admin link uit template variables halen.

---

### Bevinding 10: **`send-program-request` bureau subject wordt dubbel geprefixed**

**Bestand:** `send-program-request/index.ts` (regel 267)

Het onderwerp wordt: `${subjectPrefix}${bureauSubject}` — maar `bureauSubject` kan al een prefix bevatten vanuit de template. Als de database-template het onderwerp levert, wordt de prefix dubbel toegevoegd.

**Aanpassing:** `subjectPrefix` alleen toevoegen als er geen database-template subject is (bij fallback).

---

### Bevinding 11: **`accept-quote-proposal` klant-email refereert naar `customerPortalUrl` die niet gedefinieerd is op die scope**

**Bestand:** `accept-quote-proposal/index.ts` (regel 424)

De code verwijst naar `customerPortalUrl` maar die variabele is pas op regel 536 gedefinieerd (in het admin-pad). In het klant-pad (regel 395-494) ontbreekt de definitie.

**Aanpassing:** `customerPortalUrl` definiëren vóór het klant-pad. Dit is waarschijnlijk een runtime bug die tot een crash leidt.

---

### Bevinding 12: **`notify-accommodation-quote` hardcoded productie-URL**

**Bestand:** `notify-accommodation-quote/index.ts` (regel 203-205)

De portal URL is hardcoded als `https://bureauvlieland.nl/...` zonder `getPortalBaseUrl()`.

**Aanpassing:** `getPortalBaseUrl()` gebruiken met origin header.

---

### Samenvatting aanpassingen

| # | Bestand | Prioriteit | Wijziging |
|---|---|---|---|
| 1 | `accept-quote-proposal` | KRITIEK | Klant-PII verbergen voor partners (bureau_central) |
| 2 | `accept-quote-proposal` | KRITIEK | Klantnaam uit e-mail onderwerp naar partners |
| 3 | `accept-quote-proposal` | KRITIEK | `customerPortalUrl` bug fixen (undefined variable) |
| 4 | `send-items-to-partners` | HOOG | Klantnaam uit onderwerp naar partners |
| 5 | `cancel-program-request` | HOOG | Klant-PII verbergen in annuleringsmails |
| 6 | `select-accommodation-quote` / `send-items-to-partners` / `accept-quote-proposal` | MEDIUM | Toon naar informeel ("je") voor partners |
| 7 | `send-accommodation-quote-request` | MEDIUM | Hardcoded URL → `getPortalBaseUrl` |
| 8 | `notify-accommodation-quote` | MEDIUM | Hardcoded URL → origin-based |
| 9 | `send-accommodation-request` | LAAG | `baseUrl` undefined in fallback |
| 10 | `send-program-request` | LAAG | Dubbele subject prefix voorkomen |

### Bestanden die gewijzigd worden

1. `supabase/functions/accept-quote-proposal/index.ts` — PII verbergen, toon aanpassen, `customerPortalUrl` bug fixen
2. `supabase/functions/send-items-to-partners/index.ts` — Klantnaam uit onderwerp, toon aanpassen
3. `supabase/functions/cancel-program-request/index.ts` — PII verbergen in partnermails
4. `supabase/functions/send-accommodation-quote-request/index.ts` — Dynamische URL
5. `supabase/functions/notify-accommodation-quote/index.ts` — Origin-based URL
6. `supabase/functions/send-accommodation-request/index.ts` — `baseUrl` fix in fallback
7. `supabase/functions/send-program-request/index.ts` — Dubbele prefix fix
8. `supabase/functions/select-accommodation-quote/index.ts` — Toon naar informeel

