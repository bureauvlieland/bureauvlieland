## Doel
Bestaand extern feitenoverzicht uitbreiden met (1) uitleg over werkwijze en bewijskracht, (2) verificatieroute (zonder aanbod van live SQL-sessie), en (3) de nu-bewezen verklaring waarom `price_total` op 10 juni is aangepast.

## Deliverable
Nieuw bestand: `/mnt/documents/Feitenoverzicht_BV-2603-0003_Salure-Zeezicht_v2.pdf` (v1 blijft ongewijzigd).

## Wat er nieuw in v2 komt

### A. Verklaring van de mutatie op 10 juni 2026 (nieuwe sectie)
De prijswijziging is aantoonbaar een **automatische her-splitsing bij het verwerken van de inkoopfactuur**, niet een handmatige verlaging van het akkoordbedrag. Chronologie op 10 juni 2026:

- 16:04:49 — inkoopfactuur `202502225` d.d. 23-05-2026 geregistreerd (Hotel Zeezicht → Bureau Vlieland), totaal € 6.449,88 incl. BTW, omschrijving "LOGIES".
- 16:04:51.545 — v1-snapshot van de offerteregel weggeschreven (€ 6.446,00 kamer inclusief ontbijt).
- 16:04:51.583 — `price_total` op de offerteregel bijgewerkt naar € 5.119,92 (kameropbrengst zónder ontbijt).
- 16:11:55 — 33 regels `Ontbijt dagelijks` als extras toegevoegd aan dezelfde offerte (27 × € 39,00 volwassenen + 6 × € 19,50 kinderen = € 1.170,00).

Rekenkundig resulteert de split in kamer € 5.119,92 + ontbijt-extras € 1.170,00 = **€ 6.289,92**, tegen partnerfactuur € 6.449,88 en het door de klant goedgekeurde bedrag € 6.446,00. Het akkoord van 1 april (€ 6.446,00 inclusief ontbijt) is dus **niet** verlaagd; het bedrag is administratief in twee componenten opgesplitst omdat de partner-inkoopfactuur ontbijt als apart traceerbaar onderdeel behandelt. Het restverschil van € 156,08 (6.446 → 6.289,92) wordt in dezelfde sectie benoemd als openstaand reconciliatiepunt.

### B. Werkwijze (methodologie)
- Bronnen bevroren op één peilmoment via read-only queries op de productiedatabase; geen mutaties.
- Per bedrag exact één tabel- en kolomverwijzing plus tijdstempel.
- Visuele reconstructie opgebouwd uit v1-snapshot (`accommodation_quote_history`) + `selected_at` uit `accommodation_quotes`.
- Screenshot gerenderd via geautomatiseerde browsertest (Playwright, headless Chromium) op basis van dezelfde front-end componenten die de klant op 1 april 2026 zag.

### C. Waarom dit bewijskracht heeft
- **Onafhankelijke, tijdgestempelde bronnen.** Offerteregel, versie-historie en e-maillog worden door verschillende systeemprocessen geschreven; ze bevestigen elkaar zonder gedeelde schrijver.
- **Snapshot is INSERT-only.** Records in `accommodation_quote_history` worden nooit ge-UPDATE of DELETE (afgedwongen via Row Level Security).
- **Externe verzendbewijs.** Elke uitgaande mail in `email_log` heeft een Mailjet message-id; Mailjet houdt onafhankelijk bezorg-events bij.
- **Volgtijdelijk sluitend.** De keten inkoopfactuur (16:04:49) → snapshot (16:04:51.545) → offerte-mutatie (16:04:51.583) → extras (16:11:55) laat zien dát en hoé de wijziging veroorzaakt is door één verwerkingshandeling.
- **Reproduceerbaar.** Elke lezer met read-access kan de queries opnieuw draaien en dezelfde uitkomst krijgen.

### D. Verificatie en onafhankelijke audit (zonder live sessie-aanbod)
- **Mailjet (verzendprovider):** de bezorging van de acceptatiemail 01-04-2026 07:06 UTC aan manager@zeezichtvlieland.nl is te verifiëren via het Mailjet message-id; dit id wordt op schriftelijk verzoek gedeeld.
- **Onafhankelijke IT-audit:** Salure en/of Zeezicht mogen op eigen kosten een onafhankelijke IT-auditor aanwijzen (bijv. een NOREA RE / Register EDP-auditor). Bureau Vlieland verleent onder geheimhouding read-only toegang tot de betrokken tabellen en de Mailjet-logs, beperkt tot deze casus.
- **Tijdstempel-deponering op verzoek:** een SHA-256 hash van dit PDF plus van de ruwe query-uitvoer kan gedeponeerd worden bij een RFC 3161-tijdstempeldienst of notariaat, zodat achteraf aantoonbaar is dat het document niet is gewijzigd.
- **Bewaarplicht:** de onderliggende records blijven tot afsluiting van dit dossier ongewijzigd bewaard.

### E. Beperkingen
- Dit overzicht toont alleen wat systeem-technisch is vastgelegd; wat er telefonisch of mondeling is besproken, staat er niet in.
- Wie de inkoopfactuur op 10 juni heeft verwerkt wordt niet benoemd; die vraag valt buiten de scope 'wat zag de klant op 1 april en waarom veranderde het bedrag later'.

## Technische uitvoering
- Bestaand script uitbreiden met de nieuwe secties, output naar `_v2.pdf`.
- Financieel overzicht op pagina 2 uitbreiden met de regels partnerfactuur (€ 6.449,88), extras-som (€ 1.170,00) en split-totaal (€ 6.289,92).
- Tijdlijn op pagina 1 aanvullen met de vier tijdstempels van 10 juni.
- Screenshot, ondertekening, logo en stijl ongewijzigd.
- QA: alle pagina's naar PNG en visueel controleren op overflow.

## Wat er níet verandert
- Bedragen en tijdstempels van 1 april (klantacceptatie) en de v1-snapshot.
- Neutrale toon; geen schuldvraag, geen verdelingsvoorstel.
- Aanbod van een live SQL-meekijksessie: **verwijderd**.
