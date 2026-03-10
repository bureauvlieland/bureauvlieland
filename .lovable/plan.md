

## Grondig onderzoek: Auto-todo's matchen niet met logies-statussen

### Gevonden bugs

**Bug 1: Entity ID mismatch — todos worden nooit automatisch opgelost**

`check-pending-items` maakt todos aan met `auto_entity_id = quote.id` (de individuele offerte-ID).
Maar `notify-accommodation-quote` probeert ze op te lossen met `auto_entity_id = request.id` (de aanvraag-ID).
Dit zijn altijd verschillende ID's → resolution werkt **nooit**.

```text
check-pending-items:        auto_entity_id = quote.id     (bijv. 1edd1a9e...)
notify-accommodation-quote: auto_entity_id = request.id   (bijv. aaa2002a...)
→ Nooit een match → todo blijft open
```

**Bug 2: Geen todo-resolutie bij afwijzing (decline)**

Wanneer een partner een logiesaanvraag afwijst (`status = declined`), is er nergens code die de bijbehorende `quote_pending_partner` todo als "done" markeert. De partner heeft gereageerd, maar de todo zegt "heeft niet gereageerd".

Dit is precies wat je ziet bij Zeezicht: offerte-status is `declined`, maar todo staat nog op `todo`.

**Bug 3: PartnerDashboard decline-handler is incompleet**

`PartnerDashboard.tsx` → `handleQuoteDecline` mist:
- History logging naar `program_request_history`
- Project communication logging
- Todo-resolutie
- Ondersteuning voor alternatieve datums

Terwijl `PartnerAccommodation.tsx` dit wél doet. Inconsistentie in gedrag afhankelijk van welke pagina de partner gebruikt.

### Fix-plan

| Bestand | Wijziging |
|---|---|
| `supabase/functions/check-pending-items/index.ts` | In CHECK 2: filter ook quotes met status `declined` uit (naast `pending`, ook niet `declined` meenemen). Maar belangrijker: |
| `supabase/functions/notify-accommodation-quote/index.ts` | Fix entity ID: resolve todo met `quote.id` i.p.v. `request.id` |
| `src/pages/PartnerAccommodation.tsx` | Na decline: resolve `quote_pending_partner` todo voor `quote.id` |
| `src/pages/PartnerDashboard.tsx` | Decline handler uitbreiden: history logging, project communication, todo-resolutie, alternatieve datums — consistent met `PartnerAccommodation.tsx` |
| Eenmalig: database cleanup | Bestaande foutieve todos (declined quotes die nog open staan) sluiten |

### Detail per fix

**1. `notify-accommodation-quote` — entity ID fix**
Regel 262: wijzig `request.id` → `quoteId` zodat het matcht met hoe `check-pending-items` de todo aanmaakt.

**2. `PartnerAccommodation.tsx` — resolve todo na decline**
Na succesvolle update naar `declined`, voeg toe:
```typescript
supabase.from("admin_todos")
  .update({ status: "done", completed_at: new Date().toISOString() })
  .eq("auto_type", "quote_pending_partner")
  .eq("auto_entity_id", selectedRequest.quote.id)
  .neq("status", "done");
```

**3. `PartnerDashboard.tsx` — decline handler uitbreiden**
Kopieer de volledige logica uit `PartnerAccommodation.tsx`:
- History logging
- Project communication
- Todo-resolutie
- Alternatieve datums ondersteuning

**4. Database cleanup**
Migratie om bestaande foutieve todos op te lossen: sluit alle `quote_pending_partner` todos waar de gekoppelde quote al `declined`, `submitted`, `selected`, `rejected`, of `expired` is.

### Scope-afbakening: logies vs activiteiten

De user vraagt of logies helemaal los moet van het activiteitenprogramma. Dit is een groot architectureel besluit dat buiten scope van deze bug-fix valt, maar de huidige architectuur is al grotendeels gescheiden:
- Logies heeft eigen tabellen (`accommodation_requests`, `accommodation_quotes`)
- Logies heeft eigen portaal-tab ("Logies")
- Logies loopt altijd via Bureau Vlieland (nooit direct klant-partner)
- Activiteiten kunnen optioneel direct via de configurator

De koppeling via `linked_program_id` is functioneel correct — het zorgt voor een unified klantervaring. Volledig loskoppelen zou de UX verslechteren (twee losse portalen). De huidige bugs zitten in de **todo-resolutie logica**, niet in de architectuur.

