
# Plan: Configureerbaar Facturatiemodel (Definitief)

## Aanvullingen op Eerder Plan

Op basis van je laatste feedback worden de volgende punten toegevoegd:

1. **Snelstart email adres**: `bureauvlieland@boekhouding.nl` (standaard waarde)
2. **PDF download**: Inkoopfacturen moeten downloadbaar zijn vanuit het overzicht
3. **Centraal inkoopfacturen overzicht**: Nieuwe admin pagina met filters op project/partner/status

---

## Volledige Scope

### 1. Nieuwe Admin Pagina: Inkoopfacturen

Nieuwe menu-item "Inkoopfacturen" in het admin menu (na "Facturatie"):

```text
ADMIN MENU
├── ...
├── Facturatie           ← Bureau facturen aan klanten
├── Inkoopfacturen       ← NIEUW: Partner facturen aan Bureau
├── Commissies
├── ...
```

**Pagina Features:**
- Statistiekcards: In afwachting / Doorgestuurd / Betaald / Totaal bedrag
- Filters: Project, Partner, Status, Periode, Zoeken
- Bulk acties: Meerdere facturen selecteren en in één keer naar Snelstart sturen
- PDF download knop per factuur (indien geüpload)
- Klikbaar projectnummer voor snelle navigatie

### 2. Snelstart Integratie

**Standaard email**: `bureauvlieland@boekhouding.nl`

Per inkoopfactuur kan de admin:
- Doorsturen naar boekhouding met één klik
- Factuur wordt gemarkeerd met timestamp ("Doorgestuurd 5 feb ✓")
- PDF bijlage wordt meegestuurd indien beschikbaar

### 3. PDF Upload & Download

**Partner Portal:**
- Partner kan PDF bijvoegen bij factuurregistratie
- Opslag in bestaande `partner-invoices` bucket

**Admin Portal:**
- Download knop bij elke inkoopfactuur
- Bulk download niet in scope (fase 3)

---

## Database Wijzigingen

### 1. Nieuw veld in `program_requests`

| Kolom | Type | Default | Beschrijving |
|-------|------|---------|--------------|
| invoicing_mode | text | 'partner_direct' | 'partner_direct' of 'bureau_central' |

### 2. Nieuwe tabel: `partner_purchase_invoices`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primaire sleutel |
| request_id | uuid | Gekoppeld project |
| item_id | uuid | Specifiek item (optioneel) |
| partner_id | text | Partner |
| invoice_number | text | Factuurnummer partner |
| invoice_date | date | Factuurdatum |
| amount_excl_vat | numeric | Bedrag excl. BTW |
| vat_rate | numeric | BTW percentage |
| vat_amount | numeric | BTW bedrag |
| amount_incl_vat | numeric | Totaal incl. BTW |
| description | text | Omschrijving |
| file_path | text | **PDF pad in storage bucket** |
| status | text | 'pending', 'forwarded', 'paid' |
| forwarded_to_accounting_at | timestamptz | Wanneer doorgestuurd |
| forwarded_by | uuid | Wie heeft doorgestuurd |
| paid_at | timestamptz | Betaaldatum |

### 3. App Settings

| ID | Default Waarde | Beschrijving |
|----|----------------|--------------|
| snelstart_email | bureauvlieland@boekhouding.nl | Email voor doorsturen inkoopfacturen |
| bureau_kvk_number | (leeg) | KvK Bureau Vlieland |
| bureau_vat_number | (leeg) | BTW-nummer Bureau Vlieland |
| bureau_address | (leeg) | Adres Bureau Vlieland |
| bureau_admin_email | administratie@bureauvlieland.nl | Administratie email |

---

## UI Componenten

### AdminPurchaseInvoices Pagina

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 📦 Inkoopfacturen                                                          │
│ Facturen van partners aan Bureau Vlieland                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                            │
│  │ In     │  │ Door-  │  │        │  │        │                            │
│  │ afwach │  │ gestuurd│  │ Betaald│  │ Totaal │                            │
│  │ ting   │  │        │  │        │  │        │                            │
│  │   5    │  │   3    │  │   12   │  │  €8.5k │                            │
│  └────────┘  └────────┘  └────────┘  └────────┘                            │
│                                                                             │
│  Filters: [Project ▼]  [Partner ▼]  [Status ▼]  [🔍 Zoeken...]            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ □  FA-2026-042 • Outdoor Vlieland • 6 feb 2026                      │   │
│  │    Project: BV-2602-0001 • Districon Teamuitje                       │   │
│  │    Blokarten 20 personen                                             │   │
│  │    €800,00 excl. • Commissie: €120,00                               │   │
│  │    [In afwachting ●] [📄 PDF] [📧 Snelstart] [✓ Betaald]            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [☑ 2 geselecteerd]  [📧 Bulk doorsturen]                                  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Belangrijke knoppen per factuur:**
- 📄 **PDF** - Download de factuur (alleen zichtbaar als file_path gevuld is)
- 📧 **Snelstart** - Doorsturen naar boekhouding
- ✓ **Betaald** - Markeer als betaald

### ForwardToAccountingDialog

```text
┌────────────────────────────────────────────────────────────────┐
│ Doorsturen naar boekhouding                              [X]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  De volgende factuurgegevens worden doorgestuurd naar:         │
│  📧 bureauvlieland@boekhouding.nl                              │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Leverancier:    Outdoor Vlieland                          │ │
│  │ Factuurnummer:  FA-2026-042                               │ │
│  │ Datum:          6 februari 2026                            │ │
│  │ Bedrag excl:    €800,00                                   │ │
│  │ BTW (21%):      €168,00                                   │ │
│  │ Totaal:         €968,00                                   │ │
│  │ Project:        BV-2602-0001                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [✓] Inclusief PDF bijlage                                     │
│                                                                │
│                           [Annuleren]  [📧 Doorsturen]         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Partner Aanpassingen

### E-mail Templates

Bij `bureau_central` modus krijgt de partner een aangepaste email:

```text
"Dit project wordt centraal gefactureerd door Bureau Vlieland.

Na uitvoering factureert u Bureau Vlieland (niet de klant):

  Bureau Vlieland
  KvK: 12345678
  BTW: NL123456789B01
  Dorpsstraat 1, 8899 AB Vlieland
  Email: administratie@bureauvlieland.nl

Commissie (15%) wordt periodiek verrekend."
```

### Partner Portal Aanpassingen

**PartnerItemSheet**: Badge met Bureau Vlieland facturatiegegevens

**PartnerFinance**: Gescheiden secties:
- "Aan klanten (directe facturatie)"
- "Aan Bureau Vlieland (centrale facturatie)"

### InvoiceRegistrationDialog Uitbreiding

Bij `bureau_central` modus:
- Ontvanger: "Bureau Vlieland" i.p.v. klantgegevens
- PDF upload veld toegevoegd
- Duidelijke toelichting over commissie-afhandeling

---

## Klantportaal Wijzigingen

Bij `bureau_central` projecten:

```text
┌────────────────────────────────────────────────────────────────┐
│ 📄 Facturatie                                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Bureau Vlieland verzorgt de centrale facturatie.             │
│  U ontvangt één overzichtelijke factuur.                       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 🏢 Bureau Vlieland                                       │ │
│  │                                                           │ │
│  │    Logies (Hotel Seeduyn)               €2.400,00        │ │
│  │    Blokarten (Outdoor Vlieland)         €  800,00        │ │
│  │    Coördinatie                          €  250,00        │ │
│  │    ─────────────────────────────────────────────          │ │
│  │    Subtotaal excl. BTW                  €3.450,00        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Edge Functions

### Nieuw: forward-purchase-invoice

Stuurt email naar Snelstart met:
- Factuurgegevens in gestructureerd formaat
- PDF bijlage (indien beschikbaar)
- Projectreferentie voor eenvoudige matching

### Aanpassing: register-partner-invoice

- Detecteert `invoicing_mode` van het project
- Bij `bureau_central`: slaat op in `partner_purchase_invoices` tabel
- Ondersteunt PDF upload via signed URL

### Aanpassing: send-program-request

- Voegt facturatie-instructies toe op basis van `invoicing_mode`
- Bureau Vlieland gegevens uit app_settings

### Aanpassing: get-partner-dashboard

- Voegt `invoicing_mode` toe per item
- Partnerportaal kan UI aanpassen op basis hiervan

### Aanpassing: get-customer-program

- Voegt `invoicing_mode` toe aan response
- Klantportaal toont centrale facturatie info

---

## Nieuwe Bestanden

| Bestand | Functie |
|---------|---------|
| src/types/purchaseInvoice.ts | Types voor InvoicingMode en PurchaseInvoice |
| src/hooks/usePurchaseInvoices.ts | CRUD hook voor inkoopfacturen |
| src/pages/admin/AdminPurchaseInvoices.tsx | Overzichtspagina inkoopfacturen |
| src/components/admin/InvoicingModeSelector.tsx | Toggle component |
| src/components/admin/PurchaseInvoicesCard.tsx | Overzicht per project |
| src/components/admin/RegisterPurchaseInvoiceDialog.tsx | Admin handmatig toevoegen |
| src/components/admin/ForwardToAccountingDialog.tsx | Doorsturen naar Snelstart |
| src/components/admin/ProjectProfitSummary.tsx | Marge berekening |
| src/components/partner-portal/BureauCentralBadge.tsx | Badge voor centrale facturatie |
| supabase/functions/forward-purchase-invoice/index.ts | Edge function voor Snelstart email |

## Te Wijzigen Bestanden

| Bestand | Wijziging |
|---------|-----------|
| src/components/admin/AdminLayout.tsx | Menu-item "Inkoopfacturen" toevoegen |
| src/App.tsx | Route voor /admin/inkoopfacturen |
| src/pages/admin/AdminRequestDetail.tsx | InvoicingModeSelector, PurchaseInvoicesCard |
| src/pages/admin/AdminSettings.tsx | Bureau gegevens + Snelstart email configuratie |
| src/components/customer-portal/InvoiceProvidersCard.tsx | Centrale facturatie weergave |
| src/components/partner-portal/PartnerItemSheet.tsx | Bureau central badge |
| src/components/partner-portal/InvoiceRegistrationDialog.tsx | PDF upload + aangepaste ontvanger |
| src/pages/PartnerFinance.tsx | Gescheiden secties per facturatietype |
| supabase/functions/send-program-request/index.ts | Facturatie-info in emails |
| supabase/functions/register-partner-invoice/index.ts | PDF upload + bureau_central detectie |
| supabase/functions/get-partner-dashboard/index.ts | invoicing_mode meegeven |
| supabase/functions/get-customer-program/index.ts | invoicing_mode meegeven |

---

## Fasering

### Fase 1: Core Database & Admin
- Database migratie (invoicing_mode, partner_purchase_invoices, app_settings)
- Admin: Nieuwe "Inkoopfacturen" pagina met filters
- Admin: Snelstart doorstuur functionaliteit
- Admin: PDF download functionaliteit
- Admin: InvoicingModeSelector in projectdetails
- Admin: PurchaseInvoicesCard per project

### Fase 2: Partner & Klant Aanpassingen
- Partner emails aangepast op invoicing_mode
- Partner portaal: BureauCentralBadge + PDF upload
- Partner portaal: Gescheiden facturatie-secties
- Klant portaal: Centrale facturatie weergave

### Fase 3: Geavanceerde Features
- ProjectProfitSummary marge berekening
- Bulk PDF download/export
- Betalingsherinneringen
