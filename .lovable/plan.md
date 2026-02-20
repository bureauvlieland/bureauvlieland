
## Checkbox-bevestiging voor "Akkoord, start reserveringen"

### Wat er nu is

In `ProgramIntroCard.tsx` staat de knop "Akkoord, start reserveringen" direct klikbaar zodra de offerte verstuurd is (`quoteStatus === "offerte_verstuurd"`). De knop is blauw (primary) en heeft geen extra bevestigingsstap.

### Wat we doen

We voegen een checkbox toe boven de knop met de tekst **"Ik ben akkoord met het programma"**. De knop is disabled zolang de checkbox niet is aangevinkt. De knop krijgt een neutrale/secondary uitstraling in plaats van de huidige blauwe primary-kleur.

### UX-redenering

- De checkbox forceert een bewuste actie — niet reflexmatig klikken
- De knop wordt pas actief na aanvinken, wat ook visueel feedback geeft
- Een niet-blauwe (secondary of outline) knop past beter bij de ernst van de handeling: het is een bevestiging, geen "start hier"-CTA

### Technische wijzigingen

**`src/components/customer-portal/ProgramIntroCard.tsx`**

1. `useState<boolean>(false)` toevoegen voor `isChecked`
2. Checkbox-component importeren (`@/components/ui/checkbox`)
3. Label-component importeren (`@/components/ui/label`)
4. In het `isAwaitingApproval`-blok, vóór de button-rij:
   ```tsx
   <div className="flex items-center gap-2">
     <Checkbox
       id="akkoord-checkbox"
       checked={isChecked}
       onCheckedChange={(v) => setIsChecked(!!v)}
     />
     <Label htmlFor="akkoord-checkbox" className="text-sm cursor-pointer">
       Ik ben akkoord met het programma
     </Label>
   </div>
   ```
5. Button: `disabled={isLoading || !isChecked}` en `variant="secondary"` (of `outline`)

### Enige bestand gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/ProgramIntroCard.tsx` | Checkbox-state, Checkbox + Label import, checkbox-rij boven button, button disabled logic + variant |

Geen database-wijzigingen, geen nieuwe componenten, geen nieuwe afhankelijkheden.
