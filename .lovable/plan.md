

# Facturatie-overzicht vereenvoudigen: één overzichtelijke orderregel-kaart

## Probleem

Op het Facturatie-tab staan nu twee kaarten die grotendeels dezelfde informatie tonen:
1. **InvoiceProvidersCard** — "Facturatie per onderdeel" met provider-groepering en een misleidende tip ("U ontvangt van elke partij een aparte factuur")
2. **PriceSummaryCard** — "Prijsoverzicht" met dezelfde items + VAT-breakdown

Dit levert doublures op en is verwarrend. Bovendien staat logies apart in een amber-blok terwijl het gewoon een orderregel zou moeten zijn.

## Oplossing

Vervang beide kaarten door **één gecombineerde "Kostenspecificatie"** kaart met een tabel-achtig orderregel-overzicht:

```text
┌─────────────────────────────────────────────────┐
│ 📋 Kostenspecificatie                           │
│                                                 │
│  Onderdeel                          Bedrag      │
│  ─────────────────────────────────────────────   │
│  🛏 Logies: Hotel Zeezicht           € 2.400,00 │
│     3 nachten, 20 personen                      │
│  ─────────────────────────────────────────────   │
│  Overtocht Harlingen → Vlieland         —       │
│  Fietshuur                              —       │
│  Fietstocht met begeleiding         € 150,00    │
│  Borrel & Hapjes                        —       │
│  Strand BBQ                         € 300,00    │
│  Strandyoga & ontspanning               —       │
│  ...                                            │
│  ─────────────────────────────────────────────   │
│  Coördinatie & handling fee         € 100,00    │
│  ─────────────────────────────────────────────   │
│                                                 │
│  Subtotaal excl. BTW               € 2.438,02   │
│  BTW 9%                            €   198,17   │
│  BTW 21%                           €    45,63   │
│  ─────────────────────────────────────────────   │
│  Totaal incl. BTW                  € 2.950,00   │
│  Per persoon                       €   147,50   │
│                                                 │
│  ⏳ 5 onderdelen nog te bevestigen              │
│                                                 │
│  Factuur door: Bureau Vlieland                  │
└─────────────────────────────────────────────────┘
```

### Kenmerken
- **Alle items als orderregels**: logies, bureau-items, partner-items, coördinatiefee — alles in één lijst
- **Progressief vullen**: items zonder prijs tonen een streepje (—), bevestigde items tonen het bedrag
- **Logies bovenaan** als die geselecteerd is, met subtekst (accommodatienaam, nachten)
- **"Zelf te regelen" items** onderaan als aparte groep, zonder prijs
- **Eén VAT-breakdown** onderaan
- **Geen misleidende tips** over "aparte facturen per partij"

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `PriceSummaryCard.tsx` | Volledig herschrijven als gecombineerde "Kostenspecificatie" met orderregels. VAT-breakdown en totalen onderaan. Logica uit InvoiceProvidersCard integreren. |
| `InvoiceProvidersCard.tsx` | Verwijderen — functionaliteit opgenomen in nieuwe PriceSummaryCard |
| `CompactBillingSection.tsx` | InvoiceProvidersCard import/gebruik verwijderen, alleen PriceSummaryCard behouden |

De compact-variant (sidebar) blijft ongewijzigd — die toont al een vereenvoudigd overzicht.

