## Doel

De kop van het "Verzamelfactuur registreren"-dialoog herschrijven zodat de partner een volwaardig **facturatiegegevens-blok** ziet, en in het totalen-blok een **BTW-uitsplitsing per tarief** krijgt.

## Wijzigingen

### 1. `src/pages/PartnerFinance.tsx` — bureau-gegevens doorgeven
Op dit moment wordt `bureauDetails` niet meegegeven aan `RegisterCollectivePartnerInvoiceDialog`, waardoor het dialoog terugvalt op de hardcoded defaults ("Vlieland" + administratie-mail). We gaan de instellingen ophalen via `getSetting()` (zoals `AdminInvoicePreview.tsx` al doet) en doorgeven:

- `legalName`  ← `bureau_legal_name`
- `street`     ← `bureau_street`
- `postalCode` ← `bureau_postal_code`
- `city`       ← `bureau_city`
- `kvkNumber`  ← `bureau_kvk_number`
- `vatNumber`  ← `bureau_vat_number`
- `iban`       ← `bureau_iban`

### 2. `RegisterCollectivePartnerInvoiceDialog.tsx` — kop herontwerpen
Het amber-blok wordt opnieuw opgebouwd in **twee duidelijk gescheiden secties**:

```text
┌─ Facturatiegegevens ──────────────────────────────┐
│ Bureau Vlieland B.V.                              │
│ Sikkelduin 11, 8899 CG  Vlieland                  │
│ KvK: …   BTW: …   IBAN: …                         │
├───────────────────────────────────────────────────┤
│ ✉  Stuur de PDF naar:                             │
│    inkoop@reply.bureauvlieland.nl                 │
│    Factuur wordt automatisch ingelezen en gekoppeld.│
└───────────────────────────────────────────────────┘
```

- `administratie@bureauvlieland.nl` wordt **verwijderd** (niet langer in het blok).
- De `BureauDetails`-interface krijgt de extra velden hierboven.
- De prop blijft optioneel; lege velden worden simpelweg weggelaten.

### 3. BTW-uitsplitsing in het totalenblok
Naast `totalIncl` en `totalExcl` berekenen we per geselecteerde regel een groepering op BTW-tarief (9% / 21% / 0%). In de UI wordt het totaalblok:

```text
Subtotaal excl. BTW                €959,33
  BTW 9%  over €100,00              €9,00
  BTW 21% over €859,33            €180,46
─────────────────────────────────────────
Totaal incl. BTW                 €1.065,00
Commissie wordt berekend over excl. BTW
```

Tarieven per item komen uit het bestaande `useItemVatRates`/`getItemVatRate`. Tarieven met €0 worden niet getoond. De aparte commissie-`Alert` daaronder blijft staan.

## Scope
- Alleen frontend: `RegisterCollectivePartnerInvoiceDialog.tsx` + `PartnerFinance.tsx`.
- Geen wijzigingen aan de edge function of database — bedragen worden al incl. BTW geregistreerd en backend rekent zelf de splitsing.
- `InvoiceRegistrationDialog.tsx` (per-item dialoog) en de `BureauCentralBadge` blijven ongewijzigd; mocht je willen kan ik hetzelfde patroon daar later toepassen.
