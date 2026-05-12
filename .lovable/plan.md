## Bevindingen — afhankelijkheden van de fasen 4a–4d en 5

Korte audit van álle plekken die met de 5 fasen meebewogen hadden moeten worden. De UI is grotendeels op orde, maar de **e-mailflows en één edge-functie zijn achtergebleven**. Hieronder per onderwerp wat ik vond en wat ik voorstel.

### 1. Tijden in e-mails (Fase 4b — niet doorgevoerd in mails)

In de UI tonen we overal de "effectieve tijd" (`confirmed_time || proposed_time || preferred_time`). In de e-mails wordt nog uitsluitend `preferred_time` gebruikt. Als jij als bureau de tijd aanpast (vult `confirmed_time`), krijgt de partner of klant nog steeds de oude wenstijd in de mail.

Geraakte edge-functies:
- `send-items-to-partners` — eerste e-mail naar partner
- `notify-partners-informational` — herinneringen / informatieve mails
- `approve-quote-item` — bevestiging na klantakkoord
- `accept-quote-proposal` — partner accepteert tegenvoorstel
- `update-customer-program` — programmawijziging-mail naar partner én klant
- `update-partner-item-status` — bevestigingsmail richting klant

Geraakte templates (DB):
- `Nieuwe activiteit - Partner` — variabele `preferred_time` → effectieve tijd
- `Status: Alternatief voorgesteld` — `proposed_time` blijft bestaan, maar valt nu mogelijk samen met admin-`confirmed_time`
- `Reactie op tegenvoorstel (Klant)` — idem
- `Programmawijzigingen - Partner` (changes_list-string in code)

**Voorstel:** één gedeelde helper `getEffectiveItemTime(item)` in `supabase/functions/_shared/email-templates.ts`, die overal in de mails de juiste tijd kiest en mooi formatteert. Daarnaast in de change-emails ("admin heeft tijd aangepast") expliciet toevoegen wie de tijd heeft gezet, zodat het strookt met de `status_note`-conventie uit Fase 4b.

### 2. Force-send per item (Fase 4c — half af)

In `AdminRequestDetail.tsx` zit een `window.confirm` voor "Verstuur (forceer)". Maar de aanroep stuurt **geen `mode: "force"` mee** en de edge-functie `send-items-to-partners` filtert nog steeds hard op `skip_partner_notification = true` (regel 174). Gevolg: een item dat al een keer is uitgegaan en in `wacht_op_klant` zit, kan via deze knop niet alsnog naar de partner. De gate op `customer_approved_at` is feitelijk weggehaald, maar de skip-filter werkt als nieuwe blokkade.

**Voorstel:**
- Edge-functie `send-items-to-partners` body uitbreiden met `mode: "auto" | "force"` (default `auto`).
- In `force` de skip-filter laten vervallen voor de meegegeven `item_ids`, en na verzending alleen `status_updated_at` bijwerken (niet opnieuw `customer_approved_at` of `skip_partner_notification` resetten).
- `handleSendSingleItemToPartner` in `AdminRequestDetail.tsx` stuurt `mode: "force"` zodra `getItemSendPhase` ≠ `klaar_voor_partner`, of zodra de displayStatus `verstuurd` is (her-versturen / herinneren).
- Aparte e-mailtoon voor "herinnering" vs "eerste verzending" — nu krijgt de partner bij forceren tweemaal exact dezelfde mail. Voorstel: nieuwe template `Herinnering partner: aanvraag openstaand` of een vlag `is_reminder` in dezelfde template.

### 3. Klant-tegenvoorstel (Fase 4d — geen mailspoor)

De klant kan via `customer_counter_time` een andere tijd voorstellen voordat hij akkoord geeft. De partner ziet dat in `PartnerItemSheet`, maar er gaat **geen e-mail** richting bureau of partner. Het admin-overzicht toont het ook niet als chip/indicator (alleen via `wacht_op_klant` pill).

**Voorstel:**
- Nieuwe interne mail naar bureau (`hallo@bureauvlieland.nl`) zodra een klant een tegen-tijd voorstelt — eenvoudige notificatie + link naar werkbank.
- Geen aparte template per geval: voeg twee templates toe: `Klant-tegenvoorstel (Bureau)` en (alleen als jij dat wilt) `Klant stelt andere tijd voor (Partner)` — of bewust geen partner-mail, omdat de fysieke partner-akkoord-flow pas start na bureau-bevestiging.
- In `AdminRequestDetail.tsx` tabelregel een kleine `MicroPill tone="purple"` met "Klant stelt voor: 10:00" naast de effectieve tijd (consistent met de nieuwe statusbadges).

### 4. Bureau-items in change/cancel e-mails (Fase 4 — bureau-rolfusie)

Goed nieuws: `notify-partner-cancellation`, `notify-partner-item-deletion` en `notify-partner-price-change` filteren `provider_id === "bureau"` correct eruit. Hier is **geen actie nodig**, alleen vastleggen in de audit-doc dat dit gecontroleerd is.

### 5. Origin / Fase 5 — geen rest-issues

Geen edge-functie of template verwijst nog naar `program_type`. Alleen comment-only. **Geen actie**, behalve `audit-legacy-concepts.md` afsluiten met "Fase 5 — geen open call-sites".

### 6. Statusbadge-betekenis in klantmails

De nieuwe `MicroPill` + tooltips communiceren de exacte betekenis van statussen in de portal. De e-mailtemplates `Status: Bevestigd / Niet beschikbaar / Alternatief voorgesteld` gebruiken nog vrijere wording.

**Voorstel (klein):** in dezelfde mailtekst één regel toevoegen "Aan zet: Bureau Vlieland / klant / aanbieder", overgenomen uit `ItemDisplayStatusInfo.actor`. Dit voorkomt dat partner of klant de mail krijgt en alsnog moet raden of er actie wordt verwacht.

### 7. Werkbank-mailoverzicht (uitbreiding, optioneel)

Nu de UI strak is, zou het helpen om in de werkbank per item te zien **welke mails er al uit zijn** (laatste verstuurd, herinneringen, etc.) — er bestaat een `email_log`-tabel die dit kan voeden. Voorstel: smal popover-icoontje in de Acties-kolom dat de relevante `email_log`-regels voor dat item toont. Geen DB-werk nodig, alleen een nieuwe hook + popover.

---

## Voorgestelde uitvoering (in deze volgorde)

1. **Mails effectieve tijd** — gedeelde helper + 6 edge-functies + 1 template-variabele aanpassen. *(grootste impact, kleinste blast radius)*
2. **Force-send afmaken** — `mode: "force"` in edge + UI; herinneringstemplate splitsen.
3. **Klant-tegenvoorstel** — interne notificatiemail + admin-indicator (MicroPill).
4. **Statusmails verrijken** — `Aan zet: …` regel toevoegen in 3 status-templates.
5. **`audit-legacy-concepts.md` bijwerken** — bureau-cancel/delete/price ✓, Fase 5 ✓.
6. *(optioneel)* **Mail-log popover** in werkbank-tabel.

Geen DB-migraties nodig. Templates bewerk ik via de bestaande `email_templates`-tabel (admin email-templates UI). Alle wijzigingen blijven in presentatie-/workflow-laag.

---

## Technische details (samenvatting)

```text
shared/email-templates.ts
  + getEffectiveItemTime(item)
  + formatActorLine(actor)   // 'Aan zet: …'

send-items-to-partners
  + body.mode: "auto" | "force"
  + force: laat skip_partner_notification-filter vallen voor meegegeven item_ids
  + selecteer ook confirmed_time, proposed_time naast preferred_time

notify-partners-informational, approve-quote-item, accept-quote-proposal,
update-customer-program, update-partner-item-status
  ~ vervang preferred_time-uitlees door getEffectiveItemTime()

new edge function (of inline in update-customer-program):
  notify-bureau-customer-counter
  - trigger: klant zet customer_counter_time
  - mail naar hallo@bureauvlieland.nl met deeplink naar werkbank-item

email_templates (DB-update via admin-UI of migratie):
  ~ "Nieuwe activiteit - Partner"      → var 'preferred_time' → 'effective_time'
  ~ "Status: Bevestigd"                → +Aan zet-regel
  ~ "Status: Niet beschikbaar"         → +Aan zet-regel
  ~ "Status: Alternatief voorgesteld"  → +Aan zet-regel
  + "Klant-tegenvoorstel (Bureau)"
  + (optioneel) "Herinnering partner: aanvraag openstaand"
```

Geen wijzigingen aan logies-flow, facturatie, RLS of bureau_central-regels.
