

## Plan: Afzender wijzigen + dubbele content fixen + testmail-knop

Dit plan combineert drie wijzigingen: (1) afzender wijzigen naar hallo@bureauvlieland.nl, (2) dubbele content in offerte-email fixen, (3) testmail-knop toevoegen.

### 1. Afzender wijzigen naar hallo@bureauvlieland.nl

**`supabase/functions/_shared/email-templates.ts`**

Een geexporteerde constante toevoegen:

```text
export const SENDER_EMAIL = "hallo@bureauvlieland.nl";
export const SENDER_NAME = "Bureau Vlieland";
```

**Alle 20 edge functions** die `noreply@bureauvlieland.nl` hardcoded gebruiken worden aangepast om deze constante te importeren en gebruiken. Dit betreft:

- send-quote-offer
- send-quote-request
- send-program-request
- send-accommodation-request
- send-accommodation-quote-request
- send-project-email
- notify-accommodation-quote
- select-accommodation-quote
- update-customer-program
- update-partner-item-status
- update-commission-status
- cancel-program-request
- process-completed-items
- invite-partner
- bulk-invite-partners
- resend-partner-invitation
- resend-email
- register-partner-invoice
- forward-purchase-invoice
- confirm-partner-commission
- accept-quote-proposal

Elke `From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" }` wordt vervangen door `From: { Email: SENDER_EMAIL, Name: SENDER_NAME }`.

### 2. Dubbele content in offerte-email fixen

**`src/components/admin/AdminSendQuoteDialog.tsx`**

De `loadTemplate()` functie wordt vervangen door een synchrone `getDefaultIntro()` die een plain-text intro genereert (geen HTML-template uit de database). Dit voorkomt dat de volledige HTML-template als emailBody naar de edge function wordt gestuurd, waar het opnieuw in HTML wordt gewikkeld.

De standaard intro wordt:

```text
Beste {naam},

Hierbij ontvangt u ons maatwerkvoorstel voor uw evenement op Vlieland.
Wij hebben dit programma speciaal voor {bedrijf} samengesteld.

Programmadetails:
- Data: {data}
- Aantal personen: {aantal}
- Geldig tot: {datum}

U kunt het voorstel bekijken en akkoord geven via de knop in de e-mail.
Uiteraard kunnen we het programma qua onderdelen en tijden nog aanpassen.

Heeft u vragen? Neem contact op via hallo@bureauvlieland.nl of 0562 700 208.

Met vriendelijke groet,
Erwin Soolsma
Bureau Vlieland
```

Het onderwerp wordt standaard "Uw maatwerkvoorstel van Bureau Vlieland". Geen database-call meer nodig bij openen van het dialoog.

### 3. Testmail-knop toevoegen

**`src/components/admin/AdminSendQuoteDialog.tsx`**

- Nieuwe state: `isSendingTest`
- Nieuwe functie `handleSendTest()` die `send-quote-offer` aanroept met extra parameter `testRecipient: "erwin@bureauvlieland.nl"`
- In de DialogFooter komen drie knoppen: Annuleren | Testmail versturen | Offerte versturen

**`supabase/functions/send-quote-offer/index.ts`**

- Schema uitbreiden met `testRecipient: z.string().email().optional()`
- Wanneer `testRecipient` is ingevuld:
  - Email wordt naar dat adres gestuurd
  - Subject krijgt prefix "[TEST] "
  - De `program_requests` status wordt NIET bijgewerkt
  - Email wordt wel gelogd

### Samenvatting wijzigingen

| Bestand | Wat |
|---------|-----|
| `_shared/email-templates.ts` | SENDER_EMAIL + SENDER_NAME constanten |
| 20 edge functions | Import + gebruik van constanten i.p.v. hardcoded noreply |
| `AdminSendQuoteDialog.tsx` | Plain-text intro, testmail-knop |
| `send-quote-offer/index.ts` | testRecipient parameter |

