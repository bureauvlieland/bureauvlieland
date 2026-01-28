

# Plan: Facturatiegegevens verstrekken bij factuurregistratie

## Samenvatting
Breid de factuurregistratie-dialog uit zodat partners de volledige facturatiegegevens van de klant zien zodra ze op "Factureren" klikken. Dit combineert privacy (gegevens pas tonen bij intent) met efficiëntie (alles in één scherm).

---

## Visueel ontwerp

### Nieuwe Invoice Registration Dialog
```
┌─────────────────────────────────────────────────────┐
│  [Receipt icon] Facturatie registreren              │
│  Silent Disco Beach - Testbedrijf B.V.              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ▼ FACTUREER AAN                                    │
│  ┌─────────────────────────────────────────────────┐│
│  │ Testbedrijf B.V.                                ││
│  │ Dorpsstraat 54, 7788 AJ Amsterdam               ││
│  │                                                 ││
│  │ KvK: 12345678                                   ││
│  │ BTW: NL123456789B01                             ││
│  │                                                 ││
│  │ Facturatiecontact: Piet de Leeuw                ││
│  │ p.de.leeuw@vlie.com                             ││
│  │                                                 ││
│  │ Referentie: PO-2026-001                         ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ▼ JOUW FACTUUR                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ Factuurnummer *        [FA-2026-0042          ] ││
│  │                                                 ││
│  │ Bedrag excl. BTW *     Factuurdatum *          ││
│  │ [€ 500,00           ]  [28-01-2026          ]  ││
│  │                                                 ││
│  │ ℹ️ Commissie Bureau Vlieland (15%): €82,64      ││
│  │    Je ontvangt hiervoor een factuur van BV.     ││
│  │                                                 ││
│  │ Opmerkingen (optioneel)                         ││
│  │ [                                             ] ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│                    [Annuleren]  [Registreren]       │
└─────────────────────────────────────────────────────┘
```

---

## Technische wijzigingen

### 1. Backend: get-partner-dashboard uitbreiden
**Bestand**: `supabase/functions/get-partner-dashboard/index.ts`

De Edge Function moet de facturatiegegevens ophalen, maar deze alleen meesturen voor items die "factureerbaar" zijn (status accepted/executed + terms_accepted_at niet null).

**Aanpassing**:
- Bij het ophalen van `program_requests` ook de billing-velden meenemen:
  - `billing_company_name`
  - `billing_kvk_number`
  - `billing_vat_number`
  - `billing_address_street`
  - `billing_address_postal`
  - `billing_address_city`
  - `billing_contact_name`
  - `billing_contact_email`
  - `billing_reference`

- Filter: Alleen billing-data meesturen als `terms_accepted_at !== null`

### 2. TypeScript types bijwerken
**Bestand**: `src/types/partner.ts`

Voeg de billing-velden toe aan het `ProgramRequest` type binnen `PartnerItem`:

```typescript
interface PartnerItemRequest {
  // ... bestaande velden
  billing_company_name?: string | null;
  billing_kvk_number?: string | null;
  billing_vat_number?: string | null;
  billing_address_street?: string | null;
  billing_address_postal?: string | null;
  billing_address_city?: string | null;
  billing_contact_name?: string | null;
  billing_contact_email?: string | null;
  billing_reference?: string | null;
}
```

### 3. Frontend: InvoiceRegistrationDialog uitbreiden
**Bestand**: `src/components/partner-portal/InvoiceRegistrationDialog.tsx`

Voeg een informatiesectie toe boven het formulier:

```tsx
{/* Billing Details Section */}
{request.billing_company_name && (
  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
      Factureer aan
    </h4>
    <div className="space-y-1">
      <p className="font-medium">{request.billing_company_name}</p>
      {request.billing_address_street && (
        <p className="text-sm text-muted-foreground">
          {request.billing_address_street}, {request.billing_address_postal} {request.billing_address_city}
        </p>
      )}
      {/* KvK, BTW, Contact, Referentie */}
    </div>
  </div>
)}
```

### 4. Props aanpassen
De dialog heeft nu alleen toegang tot `item` maar niet tot de volledige request-gegevens. We moeten de `request` (inclusief billing-velden) meegeven aan de dialog.

**Bestanden om aan te passen**:
- `PartnerItemSheet.tsx` - request data doorgeven
- `PartnerFinance.tsx` - bij het openen van factuurregistratie

---

## Privacy-overwegingen

| Gegeven | Zichtbaar voor partner? | Wanneer? |
|---------|------------------------|----------|
| Klantnaam | Ja | Altijd |
| E-mail/Telefoon | Ja | Altijd (nodig voor contact) |
| Factuurbedrijfsnaam | Ja | Pas bij factureren |
| KvK/BTW-nummer | Ja | Pas bij factureren |
| Factuuradres | Ja | Pas bij factureren |
| Facturatiecontact | Ja | Pas bij factureren |

De privacy wordt gewaarborgd doordat:
1. Facturatiegegevens pas worden getoond wanneer de partner actief kiest voor "Factureren"
2. De Edge Function deze data alleen meestuurt als de klant de voorwaarden heeft geaccepteerd
3. Partners kunnen niet bij gegevens van andere partners/klanten

---

## Bestanden die worden aangepast

1. `supabase/functions/get-partner-dashboard/index.ts` - Billing-velden ophalen
2. `src/types/partner.ts` - TypeScript types uitbreiden
3. `src/components/partner-portal/InvoiceRegistrationDialog.tsx` - Billing-info tonen
4. `src/components/partner-portal/PartnerItemSheet.tsx` - Request data doorgeven

---

## Voordelen van deze aanpak

1. **Eén actie, alle info**: Partner hoeft niet apart facturatiegegevens op te vragen
2. **Privacy by design**: Gevoelige data pas zichtbaar bij intent om te factureren
3. **Tracking**: Bureau Vlieland weet dat een partner gaat factureren zodra ze de dialog openen (optioneel: loggen)
4. **Efficiënt**: Minste aantal clicks voor de partner

