

# Plan: Digitale Handtekening, Partner Voorwaarden PDF & Wijzigingsnotificaties

## Overzicht

Dit plan omvat drie samenhangende verbeteringen:

1. **Digitale handtekening** voor eindklanten bij acceptatie van algemene voorwaarden
2. **Partner PDF-voorwaarden** - partners kunnen hun eigen algemene voorwaarden uploaden
3. **Volledige wijzigingsnotificaties** - alle klantwijzigingen worden gemeld aan partners en zijn zichtbaar in de partner portal

---

## Deel 1: Digitale Handtekening bij Voorwaarden Acceptatie

### Huidige situatie

- Klant klikt op checkbox + "Akkoord & Definitief bevestigen" knop
- Er wordt alleen `terms_accepted_at` en `terms_version` opgeslagen
- Geen formele digitale handtekening

### Voorgestelde oplossing

Een digitale handtekening implementeren met:

1. **Handtekeningveld**: Klant typt volledige naam als bevestiging
2. **Timestamp + IP-logging**: Juridische audit trail
3. **E-mail verificatie**: Bevestigingsmail met handtekening-ID
4. **Visuele bevestiging**: "Ondertekend door [naam] op [datum]"

### Database wijzigingen

Nieuwe kolommen in `program_requests`:

| Kolom | Type | Omschrijving |
|-------|------|--------------|
| `signature_name` | text | Volledige naam zoals getypt door klant |
| `signature_ip` | text | IP-adres bij ondertekening |
| `signature_user_agent` | text | Browser info voor audit |
| `signature_id` | text | Unieke handtekening-ID (bijv. "SIG-2026-001234") |

### UI wijzigingen (`AcceptTermsCard.tsx`)

```text
┌──────────────────────────────────────────────────────────┐
│ ✓ Alle activiteiten zijn bevestigd!                      │
├──────────────────────────────────────────────────────────┤
│ De aanbieders hebben alle activiteiten bevestigd.        │
│ Voordat de definitieve boeking ingaat, vragen we je      │
│ akkoord op de voorwaarden.                               │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Let op: voor de activiteiten in je programma zijn  │   │
│ │ ook de voorwaarden van de volgende aanbieders van  │   │
│ │ toepassing:                                        │   │
│ │                                                    │   │
│ │ • Rederij Vlieland [📄 Bekijken]                   │   │
│ │ • Strandpaviljoen de Zeester [📄 Bekijken]        │   │
│ │ • Fietsverhuur Vlieland                            │   │
│ │   (geen voorwaarden beschikbaar)                   │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ [✓] Ik ga akkoord met de algemene voorwaarden van        │
│     Bureau Vlieland en de bovenstaande aanbieders.       │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Digitale ondertekening                               │ │
│ │                                                      │ │
│ │ Volledige naam: [_____________________________]     │ │
│ │                                                      │ │
│ │ Door te ondertekenen bevestig je dat:               │ │
│ │ • Je bevoegd bent namens de organisatie             │ │
│ │ • Je de voorwaarden hebt gelezen en akkoord gaat    │ │
│ │ • Reserveringen definitief worden bevestigd         │ │
│ │ • Annuleringsvoorwaarden van toepassing zijn        │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [🖊️ Ondertekenen & Definitief boeken]                    │
└──────────────────────────────────────────────────────────┘
```

### Backend wijzigingen (`update-customer-program/index.ts`)

- Nieuwe velden toevoegen: `signatureName`, `signatureIp`, `signatureUserAgent`
- Genereren van unieke `signature_id` (bijv. "SIG-2026-001234")
- Uitgebreidere e-mail met handtekeningbewijs:
  - Naam zoals ondertekend
  - Tijdstip van ondertekening
  - Unieke handtekening-ID
  - Vermelding van geaccepteerde voorwaarden (Bureau Vlieland + partners)

---

## Deel 2: Partner PDF-voorwaarden Upload

### Database wijzigingen

Nieuwe kolommen in `partners`:

| Kolom | Type | Omschrijving |
|-------|------|--------------|
| `terms_pdf_path` | text | Pad naar PDF in storage |
| `terms_uploaded_at` | timestamptz | Laatste upload datum |

### Storage

Nieuwe bucket: `partner-terms` (public)

RLS policies:
- Partners kunnen alleen eigen bestanden uploaden/overschrijven/verwijderen
- Iedereen kan lezen (nodig voor klanten om PDF's te downloaden)

### Partner Portal wijzigingen (`PartnerSettingsForm.tsx`)

Nieuwe sectie "Algemene Voorwaarden":

```text
┌──────────────────────────────────────────────────────────┐
│ 📄 Algemene Voorwaarden                                  │
├──────────────────────────────────────────────────────────┤
│ Upload je algemene voorwaarden zodat klanten deze        │
│ kunnen inzien voordat ze een boeking definitief maken.   │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 📄 Algemene-voorwaarden-2026.pdf                   │   │
│ │    Geüpload op 24 januari 2026                     │   │
│ │    [👁️ Bekijken]  [🗑️ Verwijderen]                 │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ [📤 Nieuwe PDF uploaden]                                 │
│                                                          │
│ Maximale bestandsgrootte: 5MB                            │
└──────────────────────────────────────────────────────────┘
```

### Klant weergave (`AcceptTermsCard.tsx`)

- Ophalen van unieke partners uit program items
- Per partner controleren op `terms_pdf_path`
- Links tonen naar beschikbare PDF's
- Indicatie tonen als partner geen voorwaarden heeft geüpload

---

## Deel 3: Volledige Wijzigingsnotificaties naar Partners

### Huidige situatie

De edge function `update-customer-program/index.ts` stuurt al e-mails naar partners bij:
- Datumwijzigingen (alle partners)
- Item wijzigingen (tijd, dag, annulering)

Dit werkt al correct. Wat ontbreekt:
- **Realtime zichtbaarheid** in de partner portal van wijzigingen
- **Notificaties voor nieuwe items** (nog niet geïmplementeerd)

### Partner Portal wijzigingen

**1. Wijzigingsindicatie in `PartnerItemCard.tsx`:**

Wanneer een item recentelijk is gewijzigd (reset naar `pending` met nieuwe `version`), dit visueel markeren:

```text
┌────────────────────────────────────────────────────────┐
│ 🔔 GEWIJZIGD                          [Aangevraagd]   │
│                                                        │
│ Zeehondensafari                                        │
│ Activiteit                                             │
│ ──────────────────────────────────────────────────     │
│ ⚠️ Klant heeft wijzigingen doorgevoerd:                │
│    • Dag gewijzigd: Dag 1 → Dag 2                      │
│    • Tijd gewijzigd: 10:00 → 14:00                     │
│                                                        │
│ [Reageren]                                             │
└────────────────────────────────────────────────────────┘
```

**2. Notificatie badge in Partner Dashboard:**

Een "Nieuw" of "Gewijzigd" badge tonen bij items die recent zijn gewijzigd.

**3. Wijzigingsgeschiedenis in Partner Portal:**

Optioneel: een mini-timeline tonen per item met recente wijzigingen.

### Edge function uitbreiding (`update-customer-program/index.ts`)

Toevoegen van `added` change type:
- Nieuwe items inserten in database
- E-mail sturen naar betreffende partner
- Historie record aanmaken

---

## Technisch overzicht

### Nieuwe/gewijzigde bestanden

| Bestand | Wijzigingen |
|---------|-------------|
| **Database migratie** | +`signature_name`, `signature_ip`, `signature_user_agent`, `signature_id` in `program_requests` |
| **Database migratie** | +`terms_pdf_path`, `terms_uploaded_at` in `partners` |
| **Database migratie** | Nieuwe bucket `partner-terms` met RLS |
| `AcceptTermsCard.tsx` | Digitale handtekening UI + partner voorwaarden links |
| `PartnerSettingsForm.tsx` | PDF upload sectie |
| `useCustomerProgram.ts` | Nieuwe parameters voor handtekening + addItem functie |
| `update-customer-program/index.ts` | Handtekening verwerking, uitgebreidere e-mail, added items |
| `PartnerItemCard.tsx` | Wijzigingsindicatie badge |

### Implementatievolgorde

1. **Database & Storage**
   - Nieuwe kolommen toevoegen aan `program_requests` en `partners`
   - Storage bucket aanmaken met RLS policies

2. **Partner PDF upload**
   - `PartnerSettingsForm.tsx` uitbreiden met upload sectie
   - Upload/delete logica implementeren

3. **Digitale handtekening**
   - `AcceptTermsCard.tsx` uitbreiden met naam-invoer en partner links
   - `useCustomerProgram.ts` uitbreiden met handtekening parameters
   - Edge function uitbreiden voor handtekening opslag en e-mail

4. **Wijzigingsnotificaties**
   - `PartnerItemCard.tsx` uitbreiden met wijzigingsbadge
   - Edge function uitbreiden voor `added` items
   - `useCustomerProgram.ts` uitbreiden met `addItem` functie

---

## Juridische overwegingen

De digitale handtekening-implementatie biedt:

1. **Identificatie**: Volledige naam + e-mailadres van klant
2. **Authenticatie**: Unieke token-based toegang tot klantportaal
3. **Integriteit**: Timestamp + IP + User Agent gelogd
4. **Audit trail**: Unieke handtekening-ID + historie record
5. **Bevestiging**: E-mail met alle details naar klant

Dit is vergelijkbaar met een "geavanceerde elektronische handtekening" en biedt voldoende rechtsgeldigheid voor B2B-overeenkomsten in Nederland.

