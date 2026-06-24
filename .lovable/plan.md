## Doel

Bureau Vlieland kan per project per "eigen" activiteit (vuurtoren, begeleide fietstocht, etc.) een begeleider noteren en aanvinken dat het geregeld is — vergelijkbaar met de huidige tickets-flow voor boot en fietshuur.

## Scope

Een item telt als **bureau-uitvoering** wanneer:
- `provider_id = 'bureau'`, EN
- het géén ticket-item is (`isTicketItem(item) === false`), EN
- `block_type !== 'bureau'` is niet vereist — het gaat puur om provider_id

Voorbeelden: vuurtorenbezoek, begeleide fietstocht, wadexcursie met eigen gids.

## Wat we bouwen

### 1. Datamodel (kleine uitbreiding op `program_request_items`)
Nieuwe nullable kolommen:
- `bureau_guide_name text` — naam begeleider (vrij veld)
- `bureau_guide_contact text` — telefoon/e-mail, optioneel
- `bureau_arranged_at timestamptz` — gezet zodra admin "Geregeld" aanvinkt
- `bureau_arranged_notes text` — optionele interne notitie

Geen nieuwe tabel — past 1-op-1 op het item, net als `booking_reference` voor tickets. RLS erft van de bestaande tabel.

### 2. Helper: `src/lib/bureauExecutionItems.ts`
```ts
isBureauExecutionItem(item): boolean   // provider_id==='bureau' && !isTicketItem
getBureauExecutionStatus(item): "open" | "arranged"
```

### 3. Inline popover: `BureauExecutionInline.tsx`
Zelfde patroon als `TicketBookingInline`:
- Trigger-chip naast item-naam in projectdetail:
  - amber "Regelen" als open
  - emerald "✓ {guide_name}" als geregeld
- Popover-velden: begeleider naam, contact (optioneel), interne notitie, knop "Markeer als geregeld" / "Heropenen"
- Schrijft direct naar `program_request_items` (admin-only via bestaande RLS)

Inlassen in `AdminRequestDetail.tsx` op dezelfde plek waar nu `<TicketBookingInline>` staat — beide kunnen naast elkaar bestaan, maar voor één item is er altijd maar één van toepassing.

### 4. Overzichtspagina: `/admin/tickets` krijgt tab "Bureau-uitvoering"
- Tabs: "Tickets" (huidig gedrag) | "Bureau-uitvoering"
- Tab toont alle bureau-execution items over alle actieve/aankomende projecten, gegroepeerd per datum
- Kolommen: datum · project · activiteit · aantal · begeleider · status (open/geregeld)
- Filter "Alleen openstaand" default aan
- Klik op rij opent zelfde popover-flow (of springt naar projectdetail)

### 5. Klant/partner-zichtbaarheid
- Klantportal: geen wijziging — bureau-items tonen al "Bevestigd" badge zoals nu
- Partnerportal: geen wijziging — bureau-items komen daar niet voor

### 6. Tests
- `src/lib/__tests__/bureauExecutionItems.test.ts` — `isBureauExecutionItem` true voor bureau+non-ticket, false voor partner-items en voor ferries/bikes
- Geen E2E nodig; popover-gedrag spiegelt bestaande tickets-flow

## Buiten scope (voor later, indien gewenst)
- Beheerde gidsen-tabel met dropdown
- E-mail naar begeleider met opdrachtbevestiging
- Automatische todo "Begeleider regelen" X dagen vóór datum
- Begeleider als kostenregel/inkoopfactuur

## Bestanden

**Nieuw**
- `supabase/migrations/<ts>_bureau_execution_fields.sql` — 4 kolommen + comment
- `src/lib/bureauExecutionItems.ts`
- `src/lib/__tests__/bureauExecutionItems.test.ts`
- `src/components/admin/bureau-execution/BureauExecutionInline.tsx`
- `src/components/admin/bureau-execution/BureauExecutionList.tsx` (tab-content)

**Aangepast**
- `src/types/programRequest.ts` — 4 velden toevoegen
- `src/pages/admin/AdminRequestDetail.tsx` — inline-chip naast tickets renderen
- `src/pages/admin/AdminTickets.tsx` — tabs toevoegen
