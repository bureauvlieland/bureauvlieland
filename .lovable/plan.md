# Wijzigingen-flow: akkoord-keuze + tijdnotatie

Twee samenhangende problemen:

1. Na publiceren van een prijs-/tijdwijziging blijven de oude akkoord-stempels staan ("Klant akkoord", "Partner: bevestigd", "Akkoord partner"), terwijl klant/partner de nieuwe waarde nooit hebben goedgekeurd. De admin moet expliciet kunnen kiezen of een wijziging als al-goedgekeurd geldt of opnieuw bevestigd moet worden.
2. De `status_note` "Tijd 12:30 ingesteld door admin" wordt niet bijgewerkt of opgeruimd bij een latere wijziging, dus in het klantportaal staat een toelichting die niet meer klopt bij de getoonde tijd.
3. Tijden worden inconsistent getoond: linker tijd-rail laat `10:00:00` zien, kaart laat `10:00` zien — overal HH:mm aanhouden.

## 1. Publiceer-dialog: keuze "wie heeft akkoord gegeven?"

In `PublishChangesDialog.tsx` één nieuw blok boven "Ontvangers", alleen zichtbaar wanneer er items in de lijst staan die al live waren (geen `pending_added`/`pending_marked_for_removal`):

```text
Akkoordstatus van deze wijzigingen
( ) Beide moeten opnieuw bevestigen   ← default
( ) Klant heeft al akkoord, partner moet nog bevestigen
( ) Partner heeft al bevestigd, klant moet nog bevestigen
( ) Beide hebben al akkoord (interne wijziging — niets resetten)
```

Strikt gescheiden van de mail-checkboxes: deze keuze bepaalt alleen of de bestaande akkoord-stempels gereset worden. De admin vinkt los daarvan aan of er ook een mail uitgaat.

Selectie wordt meegestuurd als `approvalScope: { customer: 'keep'|'reset', partner: 'keep'|'reset' }` naar `publish-program-changes`.

## 2. Edge function `publish-program-changes`

Voor elk gepubliceerd item dat al live was, op basis van `approvalScope`:
- `customer === 'reset'` → `customer_approved_at = null`, `customer_accepted_at = null`.
- `partner === 'reset'` → `quoted_at = null`, `item_quote_status = 'in_behandeling'`, `confirmed_time = null`, zodat het item terug in de partner-bevestigingsflow valt.
- `'keep'` → bestaande timestamps en status ongemoeid laten (huidig gedrag).

Items met alleen `pending_added` of `pending_marked_for_removal` worden niet door `approvalScope` geraakt; daar verandert niets aan de huidige logica.

Daarnaast bij elke promotie van `pending_preferred_time` naar live:
- `status_note` overschrijven met de nieuwe tekst ("Tijd {nieuwe tijd} ingesteld door Bureau Vlieland") óf legen, zodat de oude "12:30 ingesteld" tekst verdwijnt.
- `status_updated_at = now()`.

Bij andere wijzigingen (prijs, beschrijving) waar de bestaande `status_note` nog naar een oude waarde verwijst die niet meer klopt: `status_note = null` om verwarring te voorkomen. Eenvoudige regel: zodra een item gepubliceerd wordt en de nieuwe waarde niet overeenkomt met wat in `status_note` staat, leegmaken.

## 3. Tijdnotatie overal HH:mm

Nieuwe util in `src/lib/timeUtils.ts`:

```ts
formatTimeHHmm(value: string | null | undefined): string | null
// "10:00:00"     -> "10:00"
// "10:00"        -> "10:00"
// "10:00:00+02"  -> "10:00"
// "flexibel"     -> "flexibel"
// null/""        -> null
```

Toepassen op alle plekken die nu een rauwe `preferred_time/confirmed_time/proposed_time` string renderen, o.a.:
- `customer-portal/CustomerTimeline.tsx` (de "10:00:00" in de linker tijd-rail)
- `customer-portal/CustomerProgramItem.tsx`
- `customer-portal/AcceptProposalCard.tsx`
- `customer-portal/TodayView.tsx`, `ProgramMap.tsx`
- `partner-portal/PartnerItemSheet`, `PartnerProjectItemRow`, `PartnerItemCard`, `PartnerUpcomingActivities`, `PartnerPlanningCalendar`
- Admin: `AdminRequestDetail`, `AdminPlanning`, `AdminTickets`, `werkbank/ProjectDetailPanel`
- `AdminEditActivitySheet.tsx` regel 268 en de equivalente regel in de edge function: gebruik dezelfde formatter zodat de status_note nooit seconden bevat.

Sorteer-logica (`localeCompare` op tijdstrings) blijft werken na normalisatie.

## Buiten scope

- Geen aanpassing aan partner-portaal goedkeuring-flow zelf; we zetten alleen timestamps terug zodat het bestaande "nog te bevestigen" gedrag opnieuw triggert.
- Geen nieuwe e-mailtemplates; bestaande `ITEM_CHANGES_*` mails blijven gekoppeld aan de bestaande aanvink-keuze.
- Geen database-migratie nodig — alle benodigde kolommen bestaan al.
