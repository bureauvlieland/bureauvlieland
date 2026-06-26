# Partners aansporen hun aanbod te verrijken

## Doel
Partners actief laten zien dat een rijker profiel (foto's, omschrijving, prijzen, highlights) leidt tot vaker gekozen worden. Hotel Zeezicht en Yoga Vlieland als best-practice voorbeelden.

## Aanpak in 3 lagen

### 1. Profiel-volledigheidsscore (de motor)
Nieuwe `src/lib/partnerCompleteness.ts` berekent per partner én per bouwsteen een score 0–100.

**Partnerprofiel** (`partners`):
- about_text ≥ 200 tekens
- image_url aanwezig
- gallery_images ≥ 3
- location_lat/lng + location_description
- website_url
- highlight_features ≥ 3

**Per bouwsteen** (`building_blocks`):
- short_description + description ≥ 150 tekens
- image_url of image_asset
- prijs ingevuld (price_adult of price_display_override)
- duration, min/max_people
- tags ≥ 2
- location_address

Levert per item een lijst "ontbrekende velden" met directe deeplinks naar het juiste tabblad. Unit-getest in `src/lib/__tests__/partnerCompleteness.test.ts`.

### 2. Nudges in de partnerportal

**a. Dashboard-banner bovenaan `PartnerDashboard.tsx`** (alleen bij score < 80)

> 💡 *Profielen met foto's, een duidelijke omschrijving en complete prijzen worden vaker gekozen door klanten. Hotel Zeezicht en Yoga Vlieland hebben hun aanbod compleet ingevuld — zie hieronder hoe zij dat doen.*  
> Uw profiel is voor 62% compleet → **[Profiel verrijken]** **[Bouwstenen verbeteren]**

Dismiss via sessionStorage — komt bij volgende login terug zolang score < 80.

**b. Voortgangsbalk in sidebar `PartnerLayout.tsx`**  
Onder partnernaam: "Profielsterkte 62%" met dunne progressbar; klik → `/partner/profiel`.

**c. Per-bouwsteen badge op `PartnerBlocks.tsx`**  
Amber chip "Kan beter — 2 velden ontbreken" met tooltip die exact vertelt wat ontbreekt (foto, prijs, etc.).

**d. Inline tips op `PartnerProfile.tsx` en bouwsteen-edit**  
Bij lege/korte velden subtiele suggestie ("Tip: partners met ≥3 foto's worden vaker gekozen").

### 3. Voorbeeld-showcase
Nieuwe sectie onderaan dashboard "Zo doen anderen het" met 2 kaarten — Hotel Zeezicht en Yoga Vlieland, **hardcoded op partner-id/slug** in een constante. Mini-preview (foto + naam + korte tekst) → linkt naar publieke `/partners` kaart of detail.

## Wat we NIET doen
- Geen e-mail-campagne (kan later).
- Geen verplicht maken van velden.
- Geen "X% vaker gekozen"-cijfer tot we daadwerkelijk data hebben; copy blijft kwalitatief.
- Geen schema-wijzigingen.

## Bevestigde keuzes
- Showcase-partners: **hardcoded** (constante met 2 id's in `src/lib/partnerShowcase.ts`).
- Banner-dismiss: **mag terugkomen** bij volgende login zolang score < 80 (sessionStorage, geen DB).
