## Doel
Vóór we het externe feitenoverzicht (Salure/Zeezicht) definitief maken, elke stellige claim staven met een bronregel of expliciet degraderen tot "waarschijnlijk / niet vastgesteld". Ik ga geen nieuwe versie schrijven zolang de vier gaten hieronder niet dicht zijn.

## Wat ik ga doen (alleen lezen, geen mutaties)

### Stap 1 — Bevestig wat de klant op 30 mrt / 1 apr écht zag
- `email_log`-rijen voor `zwaan@salure.nl` uit de vensters 30-03 20:37 en 01-04 07:06 uitlezen; alleen tekstvelden (`subject`, `metadata`, eventueel body-kolom).
- Als de body geen bedrag bevat, controleren welke portal-URL erin stond en welke `price_total` op dat moment gold (op basis van `history` + `updated_at`).
- Uitkomst: exacte bedragen die de klant per mail en op de portalpagina zag. Als er géén € 6.446 in staat, wordt de headline in het dossier bijgesteld.

### Stap 2 — "Automatische split" hard maken of afzwakken
- Zoeken in `supabase/functions/*` en `src/**` naar code die bij `partner_purchase_invoices` insert een `accommodation_quotes.price_total` update triggert.
- `admin_activity_log` rond 10-06 16:04:49–16:11:55 uitlezen om te zien of één actor beide handelingen deed of dat er een systeemproces tussen zit.
- Uitkomst: één van drie labels — (a) *automatisch via edge function X*, (b) *handmatig door admin Y binnen 2 minuten na factuur-registratie*, of (c) *causaliteit niet vast te stellen*.

### Stap 3 — Restverschil € 156,08 duiden
- Inkoopfactuur 202502217 (€ 3.150,72, 22-05) én 202502225 (€ 6.449,88, 23-05) beide inhoudelijk vergelijken met het klantakkoord € 6.446.
- Nagaan of er BTW-omrekening (9 % ontbijt vs 9 % logies), no-show-korting of aparte extras spelen.
- Uitkomst: getal verklaard óf expliciet in dossier opgenomen als openstaand.

### Stap 4 — Snapshot-gat 1 apr → 10 jun expliciet benoemen
- In het dossier één zin toevoegen: er is één history-versie (v1 op 10-06); dat het bedrag tussen 1 apr en 10 jun ongewijzigd bleef leiden we af uit de afwezigheid van eerdere versies, niet uit een positief snapshotbewijs.
- Geen "bewijs uit v1 dat de klant op 1 apr € 6.446 zag" meer claimen; herformuleren als "waarde vlak vóór de mutatie op 10 juni".

## Wat er dan met de PDF gebeurt
- v2 blijft staan zoals hij is (jij hebt hem al).
- Zodra stap 1–4 klaar zijn maak ik **v3** met de gecorrigeerde formuleringen. Geen bedragen of tijdstempels wijzigen die we hierboven wél bevestigd hebben; alleen claims verzachten die we niet kunnen dragen.
- Kop op de eerste pagina wordt: "Reconstructie op basis van systeemgegevens" i.p.v. "Bewezen toedracht".

## Wat ik expliciet **niet** doe
- Geen mutaties, geen migraties, geen productiedata aanraken.
- Geen nieuwe interpretatie van intentie ("Zeezicht had verkeerd bedrag ingevuld", "admin heeft bewust verlaagd" — dat blijft buiten scope).
- Geen live-SQL-aanbod (staat er al uit).

## Vraag aan jou
Wil je dat ik direct stap 1–4 doorloop en dan v3 lever, of eerst per stap de bevindingen terugkoppel zodat jij per punt kunt zeggen of het in de externe versie mag?
