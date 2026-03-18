

## Fix: "Beschrijving voor klant" default vullen met short_description

### Probleem
Bij het toevoegen van een activiteit wordt het veld "Beschrijving voor klant" gevuld met `price_adult_note` (bijv. "p.p.") in plaats van de echte korte beschrijving van de bouwsteen (`short_description`).

### Oplossing
Wijzig de default-waarde in `AdminAddActivitySheet.tsx` regel 120:

**Van:** `block.price_adult_note || block.short_description || ""`
**Naar:** `block.short_description || ""`

Dit zorgt ervoor dat het veld standaard de beschrijving toont die bij de bouwsteen hoort, wat logischer is voor de klant. De `price_adult_note` is een prijstoelichting en hoort niet als klantbeschrijving te dienen.

### Bestanden
- `src/components/admin/AdminAddActivitySheet.tsx` — één regel aanpassen

