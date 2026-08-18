# Tegenvoorstel klant duidelijk in partnerportaal

Guido heeft gelijk: het portaal laat niet zien wat de mail vertelt. Ik heb het project BV-2606-0028 nagekeken.

## Wat er nu echt gebeurt

- **Watertaxi Vlieland-Harlingen** staat in de database wél op "tegenvoorstel van klant" met de gewenste tijd **19:00** (jouw voorstel 19:30). Maar het label op de kaart wordt afgeleid uit een lijst die deze situatie niet kent, dus toont hij "Klant akkoord — bevestig in planning". De 19:00 staat alleen verstopt in het detailpaneel, niet op de regel. Erger: de knop "Bevestigen" stuurt de **oude** tijd 19:30 mee — precies het tegenovergestelde van wat de klant vroeg.
- **Watertaxi Harlingen-Vlieland** staat al op bevestigd, daarom is alleen "Markeer uitgevoerd" beschikbaar. De mail "Klant akkoord op uw voorstel — bevestig dit onderdeel in je partnerportal" wordt echter ook verstuurd als de aanbieder al bevestigd heeft. Vandaar de tegenstrijdigheid.
- Bij bevestigen slaan we alleen `proposed_time` op en nooit `confirmed_time`, waardoor "bevestigde tijd" nergens hard vastligt.

## Wat ik ga aanpassen

1. **Nieuwe herkenbare status "Tegenvoorstel van klant"** in de gedeelde statuslijst (paars/amber, actor = aanbieder), zodat admin, klantpagina en partnerportaal dezelfde taal spreken.
2. **Regelweergave partnerportaal**: bij een tegenvoorstel direct op de kaart zichtbaar "Jouw voorstel 19:30 → klant wil 19:00" plus eventuele opmerking van de klant.
3. **Duidelijke keuzeknoppen** bij een tegenvoorstel:
   - "Akkoord met 19:00" — bevestigt met de **klanttijd**, niet de oude tijd.
   - "Andere tijd voorstellen" — bestaande alternatief-flow.
   - "Niet beschikbaar" — bestaande flow.
4. **Mailtekst herbevestiging** (`approve-quote-item`): als het onderdeel al bevestigd is door de aanbieder, geen "bevestig dit onderdeel" meer maar "de klant heeft opnieuw akkoord gegeven, je hoeft niets te doen" (met eventueel "plan de tijd nog in" als er geen tijd bekend is).
5. **`confirmed_time` wél vastleggen** bij bevestigen in `update-partner-item-status`, zodat de werkbank-bucket "Plan tijd in en bevestig" niet onterecht blijft hangen.
6. **Werkbank**: tegenvoorstellen krijgen de hint "De klant stelt een andere tijd voor — reageer." in plaats van de generieke "Beoordeel deze aanvraag."

## Technisch

- `src/lib/itemStatus.ts`: status `tegenvoorstel_klant` toevoegen + afleiding vóór de `hasAcceptance`-tak (`item.status === "counter_proposed"`).
- `src/components/partner-portal/PartnerProjectItemRow.tsx`: counter-blok, knopset en `submitConfirm` met `item.customer_counter_time` als tijd.
- `src/components/partner-portal/PartnerItemSheet.tsx`: zelfde knop/tijd-logica gelijktrekken.
- `src/components/partner-portal/PartnerWerkbankList.tsx`: aparte hint voor `counter_proposed`.
- `supabase/functions/approve-quote-item/index.ts`: conditionele mailtekst; daarna deployen.
- `supabase/functions/update-partner-item-status/index.ts`: `confirmed_time` bij confirm; daarna deployen.
- Tests: uitbreiding in `src/lib/__tests__` voor de nieuwe statusafleiding en voor "bevestigen gebruikt de tegenvoorsteltijd".

## Direct voor dit project

Na de fix kan Guido bij Watertaxi Vlieland-Harlingen in één klik akkoord gaan met 19:00; wil je dat ik daarna niets handmatig omzet, of dat ik het onderdeel meteen op 19:00 zet zodra hij bevestigt?
