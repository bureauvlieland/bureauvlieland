## Wat ik ga aanpassen

Drie samenhangende issues, opgelost in één pass.

---

### 1. Partnerinstructie wordt niet zichtbaar opgeslagen (root cause + fix)

**Wat ik in de database zag:** voor programma `7ejU9NbDn8gA` staat bij geen enkel item een (pending) partner-instructie. De save-logica in `AdminEditActivitySheet` is technisch correct, maar er is geen visuele bevestiging dat een veld is opgeslagen, en niets waarschuwt je als je het paneel sluit zonder op **Opslaan** te klikken — vandaar de indruk dat het "verdwijnt".

**Fix (combineert auto-save én vangnet):**

- **Auto-save bij blur + debounce (800ms)** voor `partner_instructions`, `customer_notes`, `admin_price_notes` en `block_name`. Schrijft naar `pending_partner_instructions` (of live als `pending_added=true`), exact via dezelfde diff-logica die nu in `handleSave` zit — geëxtraheerd naar `savePartialItem(itemId, patch)`.
- **Status-indicator** rechts onder elk auto-save veld: "Niet opgeslagen" → spinner "Opslaan…" → "✓ Opgeslagen om 14:32".
- **Dirty-guard:** als er nog een save bezig is of er staan unsaved wijzigingen in de niet-auto-save velden (prijs, locatie, uitvoerder, dag, tijd), toon AlertDialog "Wijzigingen weggooien?" bij sluiten van het sheet.
- **Opslaan-knop blijft bestaan** voor de overige velden (prijs/locatie/uitvoerder); blijft de "publish all at once" moment van vandaag.

**Bestanden:**

- `src/components/admin/AdminEditActivitySheet.tsx` — refactor save-logica, voeg auto-save useEffect + status-state toe, dirty-tracking, AlertDialog bij close.
- `src/lib/partialItemSave.ts` (nieuw) — herbruikbare `savePartialItem` met dezelfde diff-regels als de huidige `handleSave`.

---

### 2. Partnerpagina toont locatie + instructie niet

Conform jouw keuze blijven pending wijzigingen onzichtbaar voor de partner tot je op **Publiceer & verstuur** klikt. Geen verandering aan partnerportaal-rendering — `PartnerProjectItemRow` toont `partner_instructions` en `location_address` al correct zodra ze live staan (regels 249-254 en 317-326 zijn al aanwezig).

**Wat hier wel verandert:** een duidelijker label in `AdminEditActivitySheet` boven de auto-save velden zoals "Wijzigingen worden pas zichtbaar voor partner ná Publiceer & verstuur", zodat de verwachting klopt.

---

### 3. Slide-in rechts → inline uitklappen op admin projectdetail

`AdminEditActivitySheet` (rechter Sheet) wordt vervangen door een **inline expandable row** in `AdminRequestDetail` waar de activiteit staat. De huidige form-inhoud blijft 1-op-1 hetzelfde, maar wordt gerenderd binnen een `Collapsible` (shadcn) direct onder de geklikte activiteit.

**Aanpak:**

- Extract de body van `AdminEditActivitySheet` naar `AdminEditActivityForm` (props identiek, geen Sheet-wrapper).
- In `AdminRequestDetail`, vervang de drie `setEditingItem(item)` triggers door `setExpandedItemId(item.id === expanded ? null : item.id)` en render `<AdminEditActivityForm>` inline onder die rij wanneer `expandedItemId === item.id`.
- De oude `AdminEditActivitySheet` wordt een dunne wrapper die nog steeds de form rendert in een Sheet, voor plekken die geen inline context hebben (bv. mobile of waar nu nog niet geconverteerd is). Bij twijfel houden we hem voorlopig in stand maar gebruiken hem niet meer vanuit `AdminRequestDetail`.

**Bestanden:**

- `src/components/admin/AdminEditActivityForm.tsx` (nieuw — body uit `AdminEditActivitySheet.tsx`).
- `src/components/admin/AdminEditActivitySheet.tsx` — wordt dunne Sheet-wrapper om de Form.
- `src/pages/admin/AdminRequestDetail.tsx` — vervang sheet-trigger door `expandedItemId` state + inline render onder geklikte rij; verwijder `<AdminEditActivitySheet>` mount aan de onderkant.

---

## Geen wijzigingen nodig in

- Database / migrations (alles speelt zich af in bestaande kolommen `pending_partner_instructions` etc.).
- Edge function `publish-program-changes` (lees pending al correct).
- Partnerportaal-rendering.
- Klantportaal (`CustomerProgramItem` gebruikt al `Collapsible`, geen slide-in daar).

---

## Verificatie na build

1. Open een item, type in "Instructie voor partner" → na 1 sec verschijnt "✓ Opgeslagen". Sluit en heropen — tekst staat er. DB-check op `pending_partner_instructions`.
2. Verander prijs zonder op Opslaan te klikken, klik X → AlertDialog "Wijzigingen weggooien?".
3. Klik op activiteit in admin-projectdetail → klapt inline open onder de rij i.p.v. paneel rechts. Tweede klik op zelfde rij sluit hem.
4. Klik op "Publiceer & verstuur" → partner krijgt mail met instructie + locatie in de regel.  
  
  
En de locatie moet toegevoegd worden aan de activiteit. De partner ziet de locatie nu niet. Check ook of de groepssamenstelling en dieten wel worden getoond. 
  &nbsp;