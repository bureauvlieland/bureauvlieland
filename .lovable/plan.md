## Bevindingen

Twee kernproblemen na audit van de e-mail flows:

### 1. Bureau-items bereiken externe partners

De huidige uitsluiting controleert alleen `provider_id === "bureau"`, maar in de database staan ferry- en fietsitems als `block_type = "bureau"` met `provider_id` = `"rederij"`, `"fietsverhuur"` of `"bureau-vlieland"` — sommige met een `provider_email` ingevuld (bijv. `groepen@rederij-doeksen.nl`). Daardoor krijgen Doeksen en Jan van Vlieland alsnog mails over data-, prijs-, annulerings- en verwijderwijzigingen.

Functies waar de check te smal is:

- `update-customer-program` (data-/personen-/akkoordwijziging door klant)
- `publish-program-changes` (admin publiceert wijzigingen)
- `notify-partner-cancellation`
- `notify-partner-item-deletion`
- `notify-partner-price-change`
- `accept-quote-proposal`, `send-items-to-partners`, `notify-partners-informational` (controle of bureau-blocks correct uitgesloten worden)

### 2. Wijzigingen sturen automatisch partner-mails

Bij wijziging door klant of admin gaan er nu automatisch partner-notificaties uit:

- **Klant** wijzigt data/aantal personen → `update-customer-program` mailt alle providers met e-mail.
- **Admin** publiceert wijzigingen via `PublishChangesDialog` → `publish-program-changes` mailt alle betrokken partners.
- **Admin** wijzigt prijs in `AdminRequestDetail` → roept `notify-partner-price-change` en `notify-customer-price-change` automatisch aan.

Wens: deze mails alleen handmatig vanuit admin.

## Plan

### A. Centrale bureau-check

Eén helper introduceren die `block_type === "bureau"` als waarheid neemt voor "centraal door bureau gefactureerd / geen partnercommunicatie". De check `provider_id === "bureau"` overal vervangen of aanvullen met `block_type === "bureau"`.

Toepassen in alle bovengenoemde edge functions zodat Rederij Doeksen, Fietsverhuur Jan van Vlieland en alle andere bureau-managed leveranciers nooit meer partner-mails of cancellation/deletion/price-mails ontvangen, ongeacht welk `provider_id` of `provider_email` op het item staat.

### B. Auto-mails bij klant- en adminwijzigingen uitschakelen

1. `**update-customer-program**` — de blokken die providers mailen bij datum- of personenwijziging worden verwijderd. In plaats daarvan:
  - admin_todo aanmaken ("Klant heeft data/aantal personen gewijzigd — informeer betrokken partners handmatig") met deeplink naar het project.
  - Interne mail naar `hallo@bureauvlieland.nl` met de wijziging + lijst betrokken partners (zelfde patroon als de bestaande counter-proposal notificatie).
  - Geen mails meer naar partners.
2. `**publish-program-changes**` — partner-fan-out vervangen door:
  - admin_todo + interne bureau-mail met overzicht van wijzigingen per partner.
  - De klantmail (samenvatting wijzigingen voor de klant) blijft bestaan.
  - De `PublishChangesDialog` UI laat zien: "Wijzigingen gepubliceerd. Informeer partners handmatig vanuit het project."
3. `**AdminRequestDetail` prijswijziging** — de automatische `notify-partner-price-change` invoke verwijderen. Op de plek van de prijsknop komt:
  - Toast met knop "Partner informeren" die `notify-partner-price-change` aanroept (handmatig).
  - `notify-customer-price-change` blijft automatisch (wens betreft alleen partner-mails… → controleren met user, zie open vraag).
4. **Handmatige verzendknoppen** — in het project-detailscherm per item een "Mail partner over wijziging" actie naast de bestaande e-mail-popover, die de juiste notify-functie aanroept. Bureau-items tonen deze knop niet.

### C. Overige checks tijdens de audit

- URL's / domeinen: alle hardcoded `https://bureauvlieland.nl/...` links blijven correct, geen `lovable.app` URL's in productie-mails (steekproef bevestigt OK; volledige scan tijdens implementatie).
- Reply-To, From en TEST-mode rerouting: alle aangepaste functies behouden bestaande `getRecipientEmail`/TEST-prefix gedrag.
- `email_log`-contract: nieuwe interne bureau-mails krijgen `template_name` + `actor` conform `_shared/EMAIL_LOGGING.md`.

## Open vragen voor jou

1. **Prijswijziging klant**: moet `notify-customer-price-change` ook handmatig worden? Of blijft de klant-mail wel automatisch (alleen partner-mails handmatig)?

Handmatig

&nbsp;

1. `cancel-program-request` **en** `notify-partner-cancellation`: bij annulering van een heel project / item — wil je daar óók een handmatige knop in plaats van automatisch, of mag annulering automatisch blijven mailen (mits bureau-items uitgesloten)?

Handmatig

1. **Handmatige knop locatie**: voorkeur voor knop per item (granulair) of per partner-groep (één knop, één mail met alle gewijzigde items voor die partner)?

Per item