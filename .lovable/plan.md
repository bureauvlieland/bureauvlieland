
## Voorwaarden-sectie altijd tonen met placeholder

De AcceptTermsCard wordt nu pas getoond als alle activiteiten bevestigd zijn. We maken een placeholder-versie die altijd zichtbaar is zolang de voorwaarden nog niet geaccepteerd zijn, zodat de klant weet wat er komt.

### Gewenst resultaat

**Nog niet alle activiteiten bevestigd:**
```text
+-----------------------------------------------+
| [FileText]  Voorwaarden                        |
|                                                |
|  Zodra alle activiteiten in je programma       |
|  bevestigd zijn, verschijnen hier de           |
|  voorwaarden ter ondertekening.                |
+-----------------------------------------------+
```

**Alle activiteiten bevestigd:** De huidige AcceptTermsCard met checkbox, handtekening en knop (ongewijzigd).

**Na acceptatie:** De bestaande AcceptedTermsCard (ongewijzigd).

### Technische aanpassing

**Bestand: `src/components/customer-portal/DesktopProgramView.tsx`**

De huidige voorwaardelijke rendering (regel 430-441) wordt aangepast:

- De `{allConfirmed && !termsAccepted && ...}` conditie wordt vervangen door `{!termsAccepted && ...}` zodat de sectie altijd zichtbaar is.
- Binnen die sectie komt een nieuwe check: als `allConfirmed` waar is, toon de bestaande `AcceptTermsCard`. Anders toon een simpele placeholder-kaart.

De placeholder is een lichte `Card` met een `FileText` icoon, de titel "Voorwaarden" en een korte uitleg. Geen nieuwe component nodig -- een inline kaart van ~10 regels volstaat.

**Bestand: `src/components/customer-portal/MobileProgramView.tsx`**

Dezelfde aanpassing doorvoeren voor de mobiele weergave (als daar dezelfde `allConfirmed` guard staat).

### Wat niet verandert

- De `AcceptTermsCard` component zelf blijft ongewijzigd.
- De `AcceptedTermsCard` (na acceptatie) blijft ongewijzigd.
- De sidebar checklist blijft ongewijzigd.
