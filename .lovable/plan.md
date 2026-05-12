
## Doel

Eén flexibele plek waar de klant in vrije tekst kan invullen:
1. **Gastenlijst** — namen van de deelnemers
2. **Dieetwensen & allergieën** — alleen relevant als er catering/diner/lunch in het programma zit
3. **Kamerindeling** — alleen relevant als er logies geboekt wordt

Admin en partners zien deze info terug op de relevante plekken zodat zij er rekening mee kunnen houden.

## Aanpak: vrije tekst is inderdaad de beste keuze

Eens met je voorstel. Een gestructureerd schema (rijen per gast met checkboxen voor "vega/glutenvrij/halal/…") klinkt mooi, maar:
- Klanten weten zelf vaak nog niet alles op het moment van boeken
- Iedere groep is anders ("12 mannen, 2 vega, 1 noten-allergie, Jan eet geen vis")
- Eén plakbaar tekstveld is sneller en lager-drempelig dan een formulier
- Partners (kok/locatie) lezen het toch als doorlopende tekst

Wel met een paar slimme conventies:
- **Conditioneel tonen**: dieetwensen alleen vragen als het programma catering bevat, kamerindeling alleen als er logies is
- **Disclaimer**: "We kunnen alleen rekening houden met wat hier is ingevuld"
- **Updatebaar tot kort vóór de uitvoering** — niet "lock" na ondertekening, want gasten haken laat aan

## Datamodel

Drie nieuwe vrije-tekstvelden:

| Veld | Tabel | Wanneer |
|---|---|---|
| `guest_names` | `program_requests` | Altijd |
| `dietary_notes` | `program_requests` | Alleen tonen bij catering-items |
| `room_assignment` | `accommodation_requests` | Alleen bij logies |

Plus tijdstempels `guest_details_updated_at` voor "laatst bijgewerkt op …".

Waarom op `program_requests` voor groep+dieet: elke aanvraag heeft altijd een program_request (ook bij logies-only — die wordt automatisch aangemaakt door de bestaande trigger). Kamerindeling hoort logisch bij `accommodation_requests`.

## Klantportaal

**Nieuwe kaart "Groep & wensen"** in de zijbalk/sectie, naast Facturatiegegevens. Toont:
- Gastenlijst (preview: eerste 2 regels + "…")
- Dieetwensen (alleen als programma catering bevat)
- Kamerindeling (alleen als logies)
- Knop "Bewerken" → dialog met drie textareas

**Dialog** — `EditGuestDetailsDialog`:
- Vrije tekstvelden, max 2000 tekens elk
- Toont per veld een korte uitleg ("één naam per regel hoeft niet — vrij invulbaar")
- Disclaimer onderaan: *"Bureau Vlieland en de aanbieders kunnen alleen rekening houden met wensen die hier zijn vermeld. Vergeet ze niet aan te vullen als er nog gasten of wijzigingen bijkomen."*

**Actiepunt in `ActionRequiredCard`**:
- Nieuwe lage-prioriteit kaart "Gastenlijst & wensen invullen" — verschijnt **na** "ondertekend / boeking compleet" zodat het de hoofd-CTA niet kaapt
- Verdwijnt zodra een van de relevante velden is ingevuld (gastnamen telt altijd; dieet alleen-als-catering; kamer alleen-als-logies)
- Reminder-mail (zie Mails) maakt het echt actiegericht

## Admin

**AdminRequestDetail**: Nieuwe sectie "Groep & wensen" — readonly preview + bewerk-knop (admin mag namens de klant aanvullen). Toont laatst-bijgewerkt-op datum.

**AdminAccommodationDetail**: Zelfde sectie, maar focus op kamerindeling + (gespiegelde) groep/dieet.

**Werkbank kaart**: kleine indicator "✓ wensen ingevuld" of "○ wensen ontbreken" zodat het in één oogopslag zichtbaar is.

## Partnerportaal

**`PartnerItemSheet`** (programma-item): nieuwe collapsible "Groep & dieetwensen" — alleen tonen bij items uit categorie `catering`. Bevat gastnamen + dietary_notes (read-only).

**`PartnerAccommodationQuoteSheet`** & **`PartnerAccommodationRequestCard`**: vaste sectie "Groep, kamerindeling & wensen" met alle drie velden.

**Privacy-regel uit memory blijft staan**: bij `bureau_central` strippen we klant-PII (e-mail, telefoon). Gastnamen/dieet/kamer zijn géén klant-PII en mogen dus wél door — partner heeft die nodig om te leveren.

## E-mails

1. **Bestaande mails uitbreiden**:
   - "Programma uitvoering aanstaande" / "Definitief programma" naar partner: gastnamen + dieet + (logies) kamerindeling toevoegen
   - Logies-aanvraag naar partner: kamerindeling meesturen indien aanwezig
   - Bevestigingsmail naar klant na ondertekening: extra alinea "Vul je gastenlijst en dieetwensen aan in het portaal — je kunt dit tot vlak voor aankomst bijwerken"

2. **Nieuwe reminder**: Edge-functie cron-trigger die 14 dagen vóór aankomst kijkt of `guest_names` leeg is en een vriendelijke herinneringsmail stuurt aan de klant met directe portaal-link. Eénmalig per project (gelogd in `email_log` met template `guest_details_reminder`).

3. **Trigger bij wijziging** door klant: optioneel een notification naar admin ("klant heeft gastenlijst aangepast voor BV-XXXX") — handig vlak vóór uitvoering.

## Technische aanpak (kort)

```text
DB migratie:
  ALTER program_requests ADD guest_names text, dietary_notes text, guest_details_updated_at timestamptz
  ALTER accommodation_requests ADD room_assignment text

Frontend:
  + components/customer-portal/GuestDetailsCard.tsx
  + components/customer-portal/EditGuestDetailsDialog.tsx
  + components/admin/GuestDetailsSection.tsx (gedeeld door request- & accommodation-detail)
  + components/partner-portal/GuestDetailsPanel.tsx (read-only)
  ~ ActionRequiredCard: extra low-prio actie 'guest_details'
  ~ PartnerItemSheet: panel tonen bij categorie 'catering'
  ~ PartnerAccommodationQuoteSheet + RequestCard: panel altijd tonen
  ~ AdminRequestDetail + AdminAccommodationDetail: sectie inhaken
  ~ Mailtemplates uitbreiden (program-execution, accommodation-request, customer-confirmation)
  + edge-function: reminder-guest-details (cron, 14 dagen voor aankomst)

Detectie 'heeft catering':
  any(items).category === 'catering' OR block_name match 'BBQ|diner|lunch|catering'
```

## Buiten scope (bewust)

- Gestructureerde gast-tabel met checkboxen — vrije tekst volstaat
- Vertaling/normalisatie van dieetwensen — partner leest gewoon de tekst
- Versiehistorie van wensen — alleen `updated_at` opslaan
- Apart partner-bewerk-recht — partners zien alleen, admin/klant bewerken

## Open vraag

Reminder-e-mail bij ontbrekende gastnamen: ik stel **14 dagen vóór aankomst, één keer** voor. Wil je liever **2x** (bv. ook 3 dagen vóór), of pas ná ondertekening (dus alleen voor definitief geboekte projecten)? Ik bouw 14 dagen + alleen-voor-ondertekende-projecten tenzij je anders aangeeft.
