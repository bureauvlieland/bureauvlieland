## Plan: structureel fix factuurnummering + herstel Houtmolen, Gymnasium, Tyrecenter

### Bevestigde situatie in de database
- Houtmolen `FV-BV-2605-0001`: DB heeft alleen `-001` à €1.524,75 (doorgestuurd). Foute PDF: `-002` met "reeds gefactureerd -001" → te betalen €0,00.
- Gymnasium `FV-BV-2604-0002`: DB heeft `-002` à €2.634,32 (doorgestuurd) + eerdere aanbetaling (extern ref 218145, €25.000). Foute PDF: `-003` die zowel 218145 als `-002` aftrekt → te betalen €0,00.
- Tyrecenter `FV-BV-2604-0010`: DB heeft alleen `-001` à €2.460,56 (doorgestuurd). Foute PDF: `-002` met "reeds gefactureerd -001" → te betalen €0,00.
- Salure `FV-BV-2603-0003`: reeds opgeschoond.

Conclusie: dit is een structureel issue in de preview/PDF, niet een incident.

### Root cause
De factuur-preview bepaalt bij iedere render een "volgend" nummer op basis van bestaande `bureau_invoices`-records. Zodra je nogmaals de preview opent of de PDF downloadt na registratie, krijgt de PDF één nummer hoger en wordt het reeds geregistreerde record onterecht als "reeds gefactureerd" afgetrokken. Dat verklaart waarom élke heropende preview "€0,00 te betalen" toont en met een te hoog nummer naar klant/Snelstart gaat.

### 1. Structurele app-fix
- Preview/PDF/UBL/bestandsnaam gebruiken één bron van waarheid voor het factuurnummer:
  - Bestaat er al een `bureau_invoices`-record voor dit project/termijn? → gebruik dat nummer.
  - Bestaat er nog niets? → stel pas dan een nieuw nummer voor.
- Het "reeds gefactureerd"-blok filtert het huidige factuurrecord uit (op `id`), zodat een factuur zichzelf nooit kan aftrekken.
- Externe/handmatige aanbetalingen (zoals 218145) blijven als "reeds gefactureerd" tonen, want die staan los van dit record.
- Registreren/doorsturen wordt geblokkeerd als het PDF-nummer al voorkomt voor hetzelfde project.

### 2. Guardrails admin
- In de preview een duidelijke melding "Deze factuur is al geregistreerd als X — je bekijkt het bestaande record" in plaats van stilletjes een nieuw nummer voorstellen.
- "Nieuwe termijn aanmaken" wordt een aparte, expliciete actie.

### 3. Herstel per project (geen DB-cleanup nodig)
Voor alle drie de gevallen blijft het bestaande DB-record correct staan. Wat jij doet in Snelstart:
- Houtmolen: corrigeer/verwijder de daar onterecht geboekte `FV-BV-2605-0001-002`.
- Gymnasium: corrigeer/verwijder de daar onterecht geboekte `FV-BV-2604-0002-003`.
- Tyrecenter: corrigeer/verwijder de daar onterecht geboekte `FV-BV-2604-0010-002`.

Na de app-fix levert "PDF downloaden" voor elk van deze projecten weer het juiste nummer en bedrag op, klaar om eventueel opnieuw naar de klant te sturen.

### Niet in dit plan
- Geen retroactieve correctie van eerder correct verstuurde facturen.
- Geen automatische Snelstart-correcties.
- Geen wijziging aan bedragen, BTW-splits of klantgegevens buiten het "reeds gefactureerd"-blok en de nummering.

### Vraag aan jou
Akkoord met (a) de structurele app-fix en (b) geen DB-wijzigingen — alleen jij de drie dubbele boekingen in Snelstart corrigeren?