

# "Beschrijving voor klant" tonen aan partners

## Probleem
Wanneer een admin een activiteit aanmaakt of bewerkt, kan er een "Beschrijving voor klant" worden ingevuld (bijv. "Max. 36 personen per boot, 2 boten nodig"). Dit veld (`admin_price_notes`) wordt opgeslagen maar **niet getoond** in het partnerportaal. Hierdoor mist de partner cruciale context over de aanvraag.

## Oplossing
Het veld `admin_price_notes` tonen in twee plekken in het partnerportaal:

### 1. `src/components/partner-portal/PartnerItemSheet.tsx`
- Na de "Details" sectie (bij datum/tijd/duur) een nieuw blokje toevoegen dat `admin_price_notes` toont
- Label: "Toelichting Bureau Vlieland" met een info-achtige styling
- Wordt alleen getoond als het veld gevuld is

### 2. `src/components/partner-portal/PartnerItemCard.tsx`
- Onder de bestaande "Opmerking klant" sectie ook `admin_price_notes` tonen
- Compacte weergave met een onderscheidend label zodat het duidelijk is dat dit van Bureau Vlieland komt (niet van de klant)

## Technische details
- Het veld `admin_price_notes` zit al in de data (de edge function haalt `*` op uit `program_request_items`)
- Het type `PartnerItem` in `src/types/partner.ts` heeft dit veld niet expliciet, maar doordat de query `*` selecteert, is het wel beschikbaar in de response. We voegen het toe aan het type voor correctheid.
- Geen database- of backend-wijzigingen nodig
- Werkt direct voor alle bestaande aanvragen waar dit veld gevuld is

## Bestanden die worden aangepast
1. **`src/types/partner.ts`** -- `admin_price_notes: string | null` toevoegen aan `PartnerItem`
2. **`src/components/partner-portal/PartnerItemSheet.tsx`** -- Toelichting-blok toevoegen in de details-sectie
3. **`src/components/partner-portal/PartnerItemCard.tsx`** -- Compacte toelichting-regel toevoegen
