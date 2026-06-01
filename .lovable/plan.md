## Wat aanpassen

De huidige fase-B mail (status update wanneer `quote_status = offerte_verstuurd`) klinkt alsof de klant al ergens "aan vast zit" en stuurt op het bekijken van een offerte-document. In de huidige workflow is dat niet meer juist:

- Het is een **voorstel**, geen bindende offerte — definitief pas na ondertekening AV.
- Er gaat meestal **geen PDF** mee; de klant moet naar het **klantportaal**.
- Toon mag formeel ('u') maar uitnodigender, minder dwingend.

## Bestand

`src/pages/admin/AdminRequestDetail.tsx` — alleen het Phase B-blok (regels ~548-563).

### Nieuwe tekst

**Onderwerp**
```
Uw programmavoorstel staat klaar in het klantportaal{refShort}
```

**Body**
```
Uw programmavoorstel staat voor u klaar in het klantportaal. U kunt het daar rustig doornemen en — wanneer het naar wens is — uw akkoord geven. Dit voorstel is nog vrijblijvend; pas na ondertekening van de algemene voorwaarden wordt uw boeking definitief.

📋 Programma: {dateStr} | {number_of_people} personen

── In het klantportaal kunt u ──
📌 Het volledige programma met indicatieve prijzen bekijken
📌 Per onderdeel of in één keer akkoord geven
📌 Eventueel uw facturatiegegevens aanvullen
📌 (optioneel) De algemene voorwaarden alvast bekijken

👉 Open uw klantportaal:
{portalUrl}

Zodra u akkoord geeft, vragen wij voor u beschikbaarheid op bij de aanbieders en houden wij u per onderdeel op de hoogte. Heeft u vragen of wensen voor aanpassing? Laat het ons gerust weten — we denken graag mee.
```

### Belangrijkste verschillen t.o.v. nu
- "offerte" → "programmavoorstel" (sluit aan op portal-copy en op niet-bindend karakter).
- "We wachten nu op uw akkoord voordat we…" → "U kunt het rustig doornemen en — wanneer het naar wens is — uw akkoord geven." (uitnodigend i.p.v. dwingend).
- Expliciet: "nog vrijblijvend; pas na AV definitief".
- "Wat we van u nodig hebben" → "In het klantportaal kunt u" (mogelijkheden i.p.v. eisen).
- Geen verwijzing meer naar een offerte-document; alle acties via het portaal.
- "Heeft u vragen?" uitgebreid met "of wensen voor aanpassing… we denken graag mee."

### Wat blijft hetzelfde
- Phase-detectie en triggervoorwaarden ongewijzigd.
- Logies-actiepunt blijft via `buildActionItems()` opgenomen (alleen als logies nog niet gekozen) — ik haak dat in de nieuwe lijst in op dezelfde plek.
- Geen wijziging aan A/C/D fases of aan andere e-mailtemplates.

### Tone-check
- Formeel 'u' (memory: customer-facing).
- Sluit aan op `ProgramIntroCard` copy ("Programmavoorstel met indicatieve prijzen … nog géén definitieve boeking").
