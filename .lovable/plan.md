

## Drie verbeteringen: Template scroll, Activiteiten bewerken, en Publiceer-flow

### 1. Template toepassen dialog — scroll fix

De `ApplyTemplateDialog` heeft al een `ScrollArea`, maar de `DialogContent` beperkt de hoogte niet correct waardoor de scroll niet werkt wanneer er veel templates zijn.

**Fix:** Geef de `ScrollArea` een expliciete `max-h` zodat de lijst scrollbaar wordt binnen het dialog.

| Bestand | Wijziging |
|---|---|
| `src/components/admin/ApplyTemplateDialog.tsx` | `ScrollArea` een vaste max-hoogte geven (bijv. `max-h-[50vh]`) |

---

### 2. Activiteiten bewerken — edit-knop ook buiten quote-modus

Momenteel verschijnt de edit-knop (potloodje) alleen in `isQuoteMode`. Bij standaard-projecten is er geen manier om een activiteit te bewerken na toevoegen.

**Fix:** De edit-knop (die `AdminEditActivitySheet` opent) tonen voor alle projecten, niet alleen quote-modus. Toevoegen als extra kolom "Acties" met pencil + delete knoppen.

| Bestand | Wijziging |
|---|---|
| `src/pages/admin/AdminRequestDetail.tsx` | Edit-knop toevoegen in de niet-quote tabelrijen (naast Status/Prijs/Factuur kolommen) |

---

### 3. Publiceer-flow: concept → publiceer naar klant → akkoord → verstuur naar partners

**Huidige situatie:** Alle items zijn direct zichtbaar in het klantportaal. Er is geen concept-fase.

**Gewenste flow:**
```text
Admin voegt activiteiten toe (concept, niet zichtbaar voor klant)
  → Admin klikt "Publiceer naar klant" (items worden zichtbaar, klant krijgt melding)
  → Klant beoordeelt en geeft akkoord
  → Admin verstuurt naar partners
```

**Aanpak:**

- **Nieuw veld op `program_requests`:** `program_published_at` (timestamp, nullable). Als dit `null` is, is het programma in concept-fase.
- **Klantportaal:** In de Programma-tab: als `program_published_at` is null, toon een "Je programma wordt nog samengesteld" placeholder in plaats van de activiteitenlijst.
- **Admin detail pagina:** Toon een "Publiceer programma" knop als `program_published_at` is null. Na klikken:
  - Zet `program_published_at` op `now()`
  - Optioneel: stuur notificatie-email naar klant dat het programma klaar staat ter beoordeling
- **Visuele indicator:** In concept-fase een banner "Dit programma is nog niet gepubliceerd naar de klant" bovenaan de activiteiten-tab.

**Bestaande flow na publicatie (ongewijzigd):**
- Bij quote-modus: klant kan per item akkoord geven, of het hele voorstel accepteren
- Na akkoord (status `akkoord_ontvangen`): admin kan "Verstuur naar partners" klikken — dit bestaat al via `handleSendToPartners` en de `accept-quote-proposal` edge function
- Bij niet-quote modus: items gaan direct naar partners zodra de admin publiceert (of handmatig via de bestaande flow)

**Database migratie:**
```sql
ALTER TABLE public.program_requests 
ADD COLUMN program_published_at timestamptz DEFAULT NULL;

-- Bestaande projecten: direct als gepubliceerd markeren
UPDATE public.program_requests 
SET program_published_at = created_at 
WHERE status != 'deleted';
```

| Bestand | Wijziging |
|---|---|
| Database migratie | `program_published_at` kolom toevoegen |
| `src/pages/admin/AdminRequestDetail.tsx` | "Publiceer programma" knop + concept-banner |
| `src/components/customer-portal/ProgramSection.tsx` | Check `program_published_at` — als null, toon placeholder |
| `src/components/customer-portal/DesktopProgramView.tsx` | Idem |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem |
| `src/hooks/useCustomerProgram.ts` | `program_published_at` meenemen in query |
| `src/types/programRequest.ts` | Type updaten |

### Samenvatting flow

```text
1. Admin maakt project + voegt activiteiten toe
2. Admin bewerkt tijden, prijzen, partners (edit-knop nu altijd zichtbaar)
3. Admin klikt "Publiceer naar klant" → klant ziet programma
4. Klant beoordeelt → geeft akkoord
5. Admin klikt "Verstuur naar partners" → partners ontvangen aanvragen
```

