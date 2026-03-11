

# Configurator vereenvoudigen — Fase 1: Prijzen verwijderen + vereenvoudiging

Dit plan combineert de eerder goedgekeurde richting (3-track entry met AI Erwin, templates, zelf kiezen) met het verwijderen van alle prijsinformatie uit de klantgerichte configurator.

## Overzicht wijzigingen

### A. Prijzen verwijderen uit klant-configurator

Alle prijsinformatie wordt verwijderd van de klantgerichte pagina's. Prijzen komen pas in beeld in het klantportaal nadat partners hebben gereageerd.

| Component | Wat wordt verwijderd |
|---|---|
| `BuildingBlockCard.tsx` | Prijsregel (regels 73-76): `formatBlockPrice` + `formatPriceNote` |
| `BuildingBlockListItem.tsx` | Prijskolom (regels 70-76): hele price+note blok |
| `CartItemDetails.tsx` | Prijsregel (regel 44): `price_display_override` / `€ price_adult` |
| `ProgramEditor.tsx` | "Indicatief totaal" blok (regels 529-539), "Coördinatiefee" blok (regels 417-426), BTW-uitsplitsing in expanded mode (regels 328-350) |
| `RequestFormModal.tsx` | Handling fee regel (regel 417), `renderBlockDetail` prijsinfo, indicatieve totalen |
| `TemplatePreviewSheet.tsx` | Eventuele indicatieve prijs p.p. |

De "provider" naam (`Door: Partner X`) wordt ook verwijderd uit de kaarten — klanten hoeven niet te weten welke partner het uitvoert.

### B. Nieuwe 3-track entry

Nieuw component `EntryChoice.tsx` met drie kaarten:

1. **Laat Erwin helpen** — AI-assistent (guided flow, niet vrije chat)
2. **Start met voorbeeldprogramma** — bestaande `TemplateSelector`
3. **Kies zelf onderdelen** — building blocks grid

### C. AI-assistent Erwin

**Nieuw component**: `AiErwinChat.tsx` — guided flow met keuze-chips:
- Stap 1: Gelegenheid (zakelijk/privé + subtype)
- Stap 2: Aantal personen + datum(s)
- Stap 3: Sfeer (actief/ontspannen/mix) + bijzondere wensen
- Resultaat: AI genereert programmasuggestie uit beschikbare bouwstenen

**Nieuwe edge function**: `generate-program-suggestion` — haalt gepubliceerde blocks op, stuurt naar Gemini Flash via Lovable AI, retourneert `{ block_id, day_index }[]`

### D. Vereenvoudig AddToCartDialog

- Verwijder tijdslot-selectie (hele time picker + conflict detection)
- Behoud alleen dag-keuze bij meerdaags
- Klanten kiezen geen tijden meer — dat doet Bureau Vlieland

### E. Refactor ProgrammaSamenstellen.tsx

- Nieuwe flow: Basisgegevens → EntryChoice → (Erwin / Template / Zelf kiezen) → Overzicht
- Cart-sidebar en GlobalCartDrawer blijven functioneel maar zonder prijzen
- Boot/fiets/logies als eenvoudige toggles in het overzicht

## Bestanden

| Actie | Bestand |
|---|---|
| Nieuw | `src/components/configurator/EntryChoice.tsx` |
| Nieuw | `src/components/configurator/AiErwinChat.tsx` |
| Nieuw | `supabase/functions/generate-program-suggestion/index.ts` |
| Wijzig | `src/components/configurator/BuildingBlockCard.tsx` — prijs + provider verwijderen |
| Wijzig | `src/components/configurator/BuildingBlockListItem.tsx` — prijs + provider verwijderen |
| Wijzig | `src/components/configurator/CartItemDetails.tsx` — prijs verwijderen |
| Wijzig | `src/components/configurator/ProgramEditor.tsx` — totalen, bureau fee, BTW verwijderen |
| Wijzig | `src/components/configurator/RequestFormModal.tsx` — prijsinfo uit samenvatting |
| Wijzig | `src/components/configurator/AddToCartDialog.tsx` — tijdselectie verwijderen |
| Wijzig | `src/pages/ProgrammaSamenstellen.tsx` — nieuwe flow met EntryChoice |

Admin-tooling (AdminProgramNew, admin ProgramEditor) blijft volledig intact met alle prijzen en tijdslots.

