## Doel
Als een project in de Werkbank-inbox op "Aan zet" staat, moet je in één oogopslag kunnen zien **wát** je concreet moet doen — niet alleen dát je aan zet bent.

## Aanpak

We leiden in `getProject.ts` per project een **concrete actie-hint** af (bv. "Stuur 3 items naar partners", "Offerte opstellen", "Vraag logies-quotes uit"), en tonen die:
1. als extra regel onder de "Aan zet"-chip in de inbox-rij,
2. als tooltip op de chip,
3. bovenaan het detailpaneel als een actie-banner.

Geen nieuwe queries of DB-werk — we hebben de signalen al (items, quote_status, lodgingQuotes).

### Regels voor de actie-hint (programma-spoor)

| Situatie (al aanwezig in code) | Hint |
|---|---|
| `itemsReadyForPartner > 0` | "Stuur N item(s) naar partner(s)" |
| `quote_status` leeg en items aanwezig | "Stel offerte op voor klant" |
| `quote_status = akkoord_ontvangen` zonder items klaar | "Verstuur AV / start uitvoering" |
| `pipeline = facturatie` | "Maak factuur op" |
| anders (concept zonder items) | "Werk concept uit" |

### Regels voor de actie-hint (logies-spoor)

| Situatie | Hint |
|---|---|
| `hasRequest` en geen quotes uitgezet | "Zet logies-aanvraag uit naar partners" |
| `quoteSelected` maar niet bevestigd richting klant | "Bevestig logies aan klant" |

Bij combi-projecten tonen we beide hints (max 2 regels).

### Wijzigingen

**`src/lib/projectCommunication.ts`**
- Nieuwe helper `getBureauActionHint(input)` die een korte string teruggeeft op basis van bovenstaande regels.

**`src/lib/getProject.ts`**
- `ProjectSummary` krijgt veld `bureauActionHint: string | null`.
- Vul dit alleen als `comm === "bij_bureau"`.

**`src/components/admin/werkbank/InboxList.tsx`**
- Onder de "Aan zet"-chip: kleine grijze regel met `→ {bureauActionHint}`.
- Tooltip op de chip met dezelfde tekst + uitleg "Bureau Vlieland moet hier actie ondernemen".

**`src/components/admin/werkbank/ProjectDetailPanel.tsx`**
- Bovenaan (of in bestaande `ProjectActionsCard`) een opvallende banner: "🟢 Aan zet: {hint}" met indien mogelijk een directe knop (bv. "Open offerte", "Open partner-uitzetting") — knoppen koppelen we aan bestaande routes/dialogen die al elders in het project gebruikt worden.

### Geen wijziging aan
- Logica van `getProgramCommunicationState` / `getLodgingCommunicationState` zelf.
- DB-schema, RLS, edge functions.
- Status-chips elders in de app (bv. projectenoverzicht).

## Open vraag
Wil je dat de banner in het detailpaneel ook direct **doorklik-knoppen** krijgt (bv. "Open offerte-editor"), of voor nu alleen een tekstuele hint? Doorklikken kost iets meer routerwerk, maar maakt het écht actiegericht.