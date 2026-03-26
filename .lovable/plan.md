## Plan: Stand-van-zaken email uitbreiden met actiepunten voor de klant

### Huidige situatie

Er is al een `generateProgramStatusEmailBody()` functie die een statusmail genereert met een overzicht van activiteiten (bevestigd/in afwachting). Deze mist echter een sectie over openstaande actiepunten voor de klant.  
  
Beschrijf je nou de automatische mail die gestuurd wordt? Ik bedoel dat ik vanuit de klantpagina graag een mail kan versturen, handmatig, net zoals bij de logiespagina met de stand van zaken en een opsomming wat de klant nog zou moeten doen / kan verwachten. 

### Wijziging

`**src/pages/admin/AdminRequestDetail.tsx**` — `generateProgramStatusEmailBody()` uitbreiden:

Na het activiteitenoverzicht een **"Wat we nog van u nodig hebben"**-sectie toevoegen die dynamisch wordt opgebouwd op basis van:


| Actiepunt                   | Conditie om te tonen                                                                 | Tekst                                                        |
| --------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Facturatiegegevens invullen | `!request.billing_company_name`                                                      | "Vul uw facturatiegegevens in via het portaal"               |
| Voorwaarden accepteren      | `!request.terms_accepted_at` en status is `offerte_verstuurd` of `akkoord_ontvangen` | "Accepteer de voorwaarden om de boeking definitief te maken" |
| Logies — offerte beoordelen | `linkedAccommodation` bestaat en status !== `quotes_selected`                        | "Beoordeel de logiesoffertes en maak een keuze"              |
| Programma beoordelen        | status is `offerte_verstuurd` en geen akkoord                                        | "Bekijk de offerte en geef akkoord"                          |


Alleen actiepunten die van toepassing zijn worden getoond. Als er geen openstaande acties zijn, wordt de sectie weggelaten.

### Voorbeeld resultaat in de email

```
── Nog te doen ──
📌 Vul uw facturatiegegevens in via het klantportaal
📌 Accepteer de voorwaarden om de boeking definitief te maken

Bekijk uw programma via: https://bureauvlieland.nl/mijn-programma/...
```

### Bestanden

1. `src/pages/admin/AdminRequestDetail.tsx` — `generateProgramStatusEmailBody` aanpassen (~20 regels toevoegen)