
# Plan: Partner Portal Activiteitenstatus Herontwerp

## Analyse - Huidige Situatie

### Huidige Status Flow
De database kent deze statussen: `pending`, `confirmed`, `alternative`, `unavailable`, `cancelled`

### Problemen
1. **Ontbrekende klantakkoord-stap**: Na partnerbevestiging (met mogelijke aanpassingen) moet de klant expliciet akkoord geven - dit ontbreekt in de huidige flow
2. **Facturatie te vroeg mogelijk**: Partner kan nu factureren zodra klant voorwaarden accepteert, terwijl facturatie logischerwijs na uitvoering moet plaatsvinden
3. **Onoverzichtelijke weergave**: Grote blokken met veel info - een compacte lijstweergave (zoals Admin Requests) zou beter werken
4. **Dubbele betekenis terms_accepted_at**: Dit veld betekent nu zowel "voorwaarden geaccepteerd" als "programma akkoord" - dit zou gescheiden moeten worden

---

## Voorgestelde Nieuwe Activiteitenstatus Flow

```text
┌──────────┐     ┌─────────────────────┐     ┌──────────────┐     ┌────────────┐     ┌─────────────┐
│  Nieuw   │ ──▶ │ Bevestigd door      │ ──▶ │ Klantakkoord │ ──▶ │ Uitgevoerd │ ──▶ │ Gefactureerd│
│ (pending)│     │ Partner             │     │              │     │            │     │             │
└──────────┘     │ (met/zonder wijz.)  │     └──────────────┘     └────────────┘     └─────────────┘
                 └─────────────────────┘
                        │
                        ▼
                 ┌─────────────────────┐
                 │ Niet beschikbaar    │
                 └─────────────────────┘
```

### Nieuwe Database Statussen

| Status | Beschrijving | Partner ziet | Klant ziet |
|--------|--------------|--------------|------------|
| `pending` | Nieuw aangevraagd | Nieuw | Aangevraagd |
| `confirmed` | Partner heeft bevestigd (met of zonder aanpassingen) | Bevestigd | Wacht op jouw akkoord |
| `accepted` | **NIEUW** - Klant heeft voorstel geaccepteerd | Klantakkoord | Akkoord gegeven |
| `executed` | **NIEUW** - Activiteit is uitgevoerd | Uitgevoerd | Uitgevoerd |
| `invoiced` | **NIEUW** - Factuur is geregistreerd | Gefactureerd | Gefactureerd |
| `unavailable` | Partner is niet beschikbaar | Niet beschikbaar | Niet beschikbaar |
| `cancelled` | Geannuleerd | Geannuleerd | Geannuleerd |

### Verwijderde Status
- `alternative` - Dit wordt nu onderdeel van `confirmed` (bevestigd met aanpassingen). Het verschil zit in of `quoted_notes` gevuld is met wijzigingen.

---

## Wijzigingen

### 1. Database Wijzigingen

**Tabel: `program_request_items`**
- Nieuwe toegestane waarden voor `status`: `pending`, `confirmed`, `accepted`, `executed`, `invoiced`, `unavailable`, `cancelled`
- Nieuw veld: `customer_accepted_at` (timestamp) - wanneer klant akkoord gaf op voorstel
- Nieuw veld: `executed_at` - bestaat al, wordt nu actief gebruikt

### 2. Nieuwe Compacte Lijstweergave (Partner Dashboard)

**Vervang PartnerItemCard blokken door een compacte tabel/lijst:**

```text
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ Activiteit          │ Klant           │ Datum        │ Personen │ Status    │ Actie   │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ ⭐ Zeehondentocht   │ XYZ B.V.        │ 14 mrt 2025  │ 25       │ ● Nieuw   │ ▶       │
│ 🔄 Surfles          │ ABC Corp        │ 15 mrt 2025  │ 12       │ ○ Wacht   │ ▶       │
│ ✓ Wadlopen          │ DEF Inc         │ 16 mrt 2025  │ 30       │ ✓ Akkoord │ ▶       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Klikken op een rij opent een slide-over sheet met alle details:**
- Klantgegevens
- Activiteitdetails (tijd, duur, opmerkingen)
- Bevestigde prijs en notities
- Actieknoppen

### 3. Vereenvoudigde Tab Structuur

**4 tabs:**

| Tab | Bevat | Uitleg |
|-----|-------|--------|
| **Nieuw** | `pending` | Nieuwe aanvragen die bevestigd moeten worden |
| **Wacht op klant** | `confirmed` | Partner heeft bevestigd, klant moet akkoord geven |
| **Akkoord** | `accepted` | Klant akkoord, wacht op uitvoering |
| **Afgerond** | `executed`, `invoiced`, `unavailable`, `cancelled` | Alle afgesloten items |

### 4. Partner Workflow per Tab

**Tab: Nieuw**
- Actie: "Bevestigen" of "Niet beschikbaar"
- Bij bevestigen: prijs invullen, optioneel aanpassingen noteren

**Tab: Wacht op klant**
- Geen actie nodig - wacht op klantakkoord
- Kan voorstel aanpassen zolang klant nog niet geaccepteerd heeft

**Tab: Akkoord**
- Actie: "Markeer als uitgevoerd" (na uitvoering activiteit)

**Tab: Afgerond**
- Subfilters: Uitgevoerd (te factureren), Gefactureerd, Niet beschikbaar, Geannuleerd
- Actie bij "Uitgevoerd": "Factuur registreren"

### 5. Klantportaal Aanpassingen

**Nieuwe stap in klantflow:**
Na partnerbevestiging moet klant per activiteit akkoord geven op:
- De bevestigde prijs
- Eventuele aanpassingen (tijd, datum, etc.)

Dit is APART van het accepteren van de algemene voorwaarden.

**Flow voor klant:**
1. Partner bevestigt → Klant ziet "Wacht op jouw akkoord" met details
2. Klant geeft akkoord per activiteit → Status wordt `accepted`
3. Als ALLE activiteiten `accepted` zijn → Klant kan algemene voorwaarden accepteren
4. Na voorwaarden → Reserveringen zijn definitief

---

## Bestandsoverzicht

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/components/partner-portal/PartnerItemRow.tsx` | Compacte tabelrij voor activiteit |
| `src/components/partner-portal/PartnerItemSheet.tsx` | Detail slide-over sheet |
| `src/components/customer-portal/AcceptProposalCard.tsx` | Klant akkoord component per activiteit |

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/PartnerDashboard.tsx` | Tabel i.p.v. cards, nieuwe tab structuur |
| `src/components/partner-portal/PartnerItemCard.tsx` | Behouden voor detail sheet, vereenvoudigen |
| `src/components/partner-portal/StatusUpdateDialog.tsx` | "Alternatief" optie verwijderen, vereenvoudigen |
| `src/types/partner.ts` | Nieuwe statussen toevoegen |
| `src/pages/CustomerProgram.tsx` | Akkoord-flow per activiteit toevoegen |
| `src/components/customer-portal/CustomerProgramItem.tsx` | Akkoord knop tonen wanneer status=confirmed |
| `supabase/functions/get-partner-dashboard/index.ts` | Nieuwe statussen ondersteunen |
| `supabase/functions/update-partner-item-status/index.ts` | Nieuwe statussen + email flows |
| `supabase/functions/update-customer-program/index.ts` | Klant akkoord endpoint |

### Database Migratie

```sql
-- Voeg nieuwe status waarden toe
-- Voeg customer_accepted_at veld toe
ALTER TABLE program_request_items 
ADD COLUMN customer_accepted_at TIMESTAMPTZ NULL;
```

---

## Voorbeelden

### Nieuwe Compacte Lijstweergave

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                              [3 nieuwe aanvragen] │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  [Nieuw (3)]  [Wacht op klant (2)]  [Akkoord (5)]  [Afgerond]                               │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Activiteit          │ Klant            │ Datum       │ Pers. │ Status     │           │  │
│  ├───────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ ⭐ Zeehondentocht    │ Bedrijf XYZ      │ 14 mrt      │ 25    │ ● Nieuw    │   [>]     │  │
│  │ ⭐ Surfles           │ ABC Corporation  │ 15 mrt      │ 12    │ ● Nieuw    │   [>]     │  │
│  │ 🔄 Wadlopen         │ DEF B.V.         │ 16 mrt      │ 30    │ ● Gewijzigd│   [>]     │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detail Sheet (slide-over)

```text
┌──────────────────────────────────────────┐
│                              [X] Sluiten │
│ Zeehondentocht                           │
│ ● Nieuw                                  │
├──────────────────────────────────────────┤
│                                          │
│ KLANT                                    │
│ Bedrijf XYZ B.V.                         │
│ 📧 contact@xyz.nl                        │
│ 📞 06-12345678                           │
│ 👥 25 personen                           │
│                                          │
│ DETAILS                                  │
│ 📅 Vrijdag 14 maart 2025                 │
│ 🕐 10:00                                 │
│ ⏱️ 2 uur                                 │
│                                          │
│ INDICATIEVE PRIJS                        │
│ €35,00 p.p. (klant zag)                  │
│                                          │
│ OPMERKING KLANT                          │
│ "Graag reddingsvesten beschikbaar"       │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  [    Bevestigen    ]                    │
│  [Niet beschikbaar]                      │
│                                          │
└──────────────────────────────────────────┘
```

### Klantportaal - Akkoord op Voorstel

```text
┌─────────────────────────────────────────────────────────────────┐
│ Zeehondentocht                          [Wacht op jouw akkoord] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Rederij Vlieland heeft bevestigd:                               │
│                                                                 │
│ 📅 Vrijdag 14 maart 2025 om 10:00                               │
│ 👥 25 personen                                                  │
│ 💰 €875,00 (incl. BTW)                                          │
│                                                                 │
│ "Inclusief reddingsvesten en warme chocolademelk na afloop"     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [      ✓ Akkoord op dit voorstel      ]                     │ │
│ │                                                             │ │
│ │ [      ✕ Annuleren / Andere wensen    ]                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Volgorde van Implementatie

1. **Database migratie** - Nieuwe veld `customer_accepted_at` toevoegen
2. **Types bijwerken** - Nieuwe statussen in TypeScript interfaces
3. **Edge functions** - Status updates en klant akkoord endpoint
4. **PartnerItemRow + PartnerItemSheet** - Nieuwe compacte weergave
5. **PartnerDashboard** - Omzetten naar tabel met sheets
6. **Klantportaal akkoord** - AcceptProposalCard + CustomerProgramItem aanpassen
7. **StatusUpdateDialog** - Vereenvoudigen (geen "alternatief" optie meer)
8. **Facturatie flow** - Alleen mogelijk na `executed` status

---

## Technische Details

### Status Transities

**Partner kan:**
- `pending` → `confirmed` (bevestigen met prijs)
- `pending` → `unavailable` (niet beschikbaar)
- `accepted` → `executed` (markeer als uitgevoerd)
- `executed` → `invoiced` (factuur registreren)

**Klant kan:**
- `confirmed` → `accepted` (akkoord op voorstel)
- `confirmed` → `cancelled` (annuleren/andere wensen)

**Automatisch:**
- Email naar klant bij `pending` → `confirmed`
- Email naar partner bij `confirmed` → `accepted`
- Email naar Bureau Vlieland bij `executed` → `invoiced`

### Facturatie Conditie

Partner kan pas factureren wanneer:
1. Status = `executed` (activiteit is uitgevoerd)
2. Klant heeft algemene voorwaarden geaccepteerd (`terms_accepted_at` is ingevuld)

Dit zorgt ervoor dat:
- Activiteit daadwerkelijk heeft plaatsgevonden
- Boeking juridisch definitief is
