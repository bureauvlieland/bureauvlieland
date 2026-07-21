## Probleem

Bij het aanmaken van een maatwerk-item (AdminAddCustomItemSheet) wordt de briefing opgeslagen in `program_request_items.custom_briefing`. Die kolom wordt momenteel alléén gelezen door `PartnerItemSheet` (offerte-editor van de partner). Admin ziet 'm niet terug in "Activiteit bewerken" of in de activiteitenlijst; klant ziet 'm ook niet. Daardoor lijkt de invoer verloren.

## Oplossing

Briefing blijft in `custom_briefing` (single source of truth), maar wordt op drie extra plekken zichtbaar en bewerkbaar gemaakt.

### 1. Admin — "Activiteit bewerken" (AdminEditActivitySheet)

- Voor items met `is_custom_quote = true` extra sectie **"Maatwerk-briefing"** bovenaan (boven Omschrijving), met een Textarea + auto-save indicator, gekoppeld aan `custom_briefing`.
- Hergebruikt de bestaande `useAutoSaveField`-flow. Update pending/diff-logica zoals de andere velden.
- Kleine hint: *"Deze briefing ziet de partner in zijn offerte-editor."*

### 2. Admin — Activiteitenlijst (AdminRequestDetail)

- Onder de rij-titel van een maatwerk-item een grijze one-liner tonen: eerste ~120 tekens van `custom_briefing` met een "…" fade als hij langer is. Alleen zichtbaar voor `is_custom_quote`.

### 3. Klant — CustomerProgramItem

- Als item `is_custom_quote` én `custom_description` leeg is, `custom_briefing` gebruiken als omschrijving (fallback). Zo ziet de klant meteen waar het over gaat.
- Als admin later `custom_description` invult, wint die (bestaand gedrag blijft leidend).
- Optioneel: subtiele "Maatwerk"-badge naast de titel, hergebruik bestaande badge-styling.

### 4. Partner (geen wijziging)

Bestaande PartnerItemSheet leest al `custom_briefing || customer_notes` — blijft werken.

## Technische details

- Bestanden: `AdminEditActivitySheet.tsx` (nieuwe sectie + save-hook), `AdminRequestDetail.tsx` (preview onder titel), `CustomerProgramItem.tsx` (fallback + badge), `useCustomerProgram.ts`/edge function `get-customer-program` (zorg dat `custom_briefing` + `is_custom_quote` meegestuurd worden — checken en zo nodig toevoegen).
- Types (`src/types/partner.ts`, `programRequest.ts`) hebben `custom_briefing?` en `is_custom_quote?` al — geen migratie nodig.
- 1 nieuwe unit-test: `customerProgramItem` fallback-logica (briefing → description als description leeg).
- Terugwerkende kracht: bestaand item BV-2607-0002 wordt automatisch correct getoond zodra de code live is (data staat al in `custom_briefing`).

## Verificatie

1. `bun x tsgo` moet clean draaien.
2. Vitest suite (incl. nieuwe test) groen.
3. Handmatig in BV-2607-0002: briefing verschijnt in edit-sheet (bewerkbaar), in lijst-preview en klantportaal.
