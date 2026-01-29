

# Uniforme Voorwaarden Horeca - Conditioneel tonen

## Samenvatting
De UVH voorwaarden worden conditioneel getoond: alleen als een accommodatiepartner geen eigen voorwaarden heeft geüpload of bij catering items. De PDF-link blijft behouden.

## Wat er gaat gebeuren

### 1. AcceptTermsCard.tsx uitbreiden
Nieuwe props toevoegen voor accommodation data:
- `selectedAccommodationQuote`: de geselecteerde logiesofferte (indien van toepassing)
- Partner terms info ophalen voor de geselecteerde accommodatie

**Conditionele UVH weergave:**
| Situatie | UVH tonen? |
|----------|------------|
| Er zijn catering items | ✅ Ja |
| Accommodatie partner heeft **eigen voorwaarden** | ❌ Nee |
| Accommodatie partner gebruikt **standaardvoorwaarden** | ✅ Ja |
| Geen accommodatie of geen selectie | Alleen als catering |

### 2. AcceptedTermsCard.tsx - Geen wijzigingen nodig
De UVH wordt al correct getoond als het in de `acceptedTerms` array staat. De logica voor conditioneel loggen zit in de edge function.

### 3. DesktopProgramView.tsx & MobileProgramView.tsx
Extra props doorgeven aan `AcceptTermsCard`:
- `accommodationQuotes` (al beschikbaar in viewProps)

### 4. Edge Function update-customer-program aanpassen
Uitbreiden van de UVH logging logica:

**Huidige logica (regel 668-680):**
```typescript
// Check if any catering items - add UVH 2024 if so
const hasCatering = programItems.some(i => i.block_category === "catering");
if (hasCatering) {
  termsLogEntries.push({ ... uvh_2024 ... });
}
```

**Nieuwe logica:**
```typescript
// Check if UVH terms should be added:
// 1. If there are catering items
// 2. If there's a selected accommodation where partner has no custom terms
const hasCatering = programItems.some(i => i.block_category === "catering");

// Check for accommodation without custom terms
let addUvhForAccommodation = false;
if (program.linked_accommodation_id) {
  const { data: selectedQuote } = await supabase
    .from("accommodation_quotes")
    .select("partner_id")
    .eq("request_id", program.linked_accommodation_id)
    .eq("status", "selected")
    .maybeSingle();
  
  if (selectedQuote) {
    const { data: accPartner } = await supabase
      .from("partners")
      .select("terms_pdf_path, uses_default_terms")
      .eq("id", selectedQuote.partner_id)
      .single();
    
    // Add UVH if partner has no custom terms
    if (!accPartner?.terms_pdf_path || accPartner?.uses_default_terms) {
      addUvhForAccommodation = true;
    }
  }
}

if (hasCatering || addUvhForAccommodation) {
  termsLogEntries.push({
    request_id: program.id,
    partner_id: "uvh",
    partner_name: "Koninklijke Horeca Nederland",
    terms_type: "uvh_2024",
    terms_version: "2024",
    terms_pdf_path: null,
    accepted_at: acceptedAt,
  });
}
```

## Overzicht wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `AcceptTermsCard.tsx` | Nieuwe prop `accommodationQuotes`, conditionele UVH weergave toevoegen |
| `DesktopProgramView.tsx` | Prop `accommodationQuotes` doorgeven aan AcceptTermsCard |
| `MobileProgramView.tsx` | Prop `accommodationQuotes` doorgeven aan AcceptTermsCard |
| `update-customer-program/index.ts` | UVH logging uitbreiden met accommodatie check |

## PDF Link blijft behouden
De bestaande PDF link in `AcceptedTermsCard.tsx` blijft ongewijzigd:
```typescript
const UVH_TERMS_URL = "https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf";
```

## Nieuwe UVH sectie in AcceptTermsCard

```tsx
{/* UVH 2024 - only if catering or accommodation without custom terms */}
{showUvhTerms && (
  <li className="flex items-center gap-2 text-sm">
    <span>•</span>
    <span className="font-medium">Uniforme Voorwaarden Horeca 2024</span>
    <Button variant="link" size="sm" asChild>
      <a href={UVH_TERMS_URL} target="_blank" rel="noopener noreferrer">
        <FileText className="h-3 w-3 mr-1" />
        Download PDF
      </a>
    </Button>
  </li>
)}
```

## Technisch detail: UVH conditionele logica

```typescript
// In AcceptTermsCard.tsx
const UVH_TERMS_URL = "https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf";

// Check if any items have catering category
const hasCateringItems = items.some(item => 
  item.block_category === "catering" && item.status !== "cancelled"
);

// Check if selected accommodation partner uses default terms
const selectedQuote = accommodationQuotes?.find(q => q.status === "selected");
const accommodationPartnerInfo = partnerTerms.find(p => p.id === selectedQuote?.partner_id);
const accommodationUsesDefaultTerms = selectedQuote && 
  (!accommodationPartnerInfo?.terms_pdf_path || accommodationPartnerInfo?.uses_default_terms);

// Show UVH if catering OR accommodation without custom terms
const showUvhTerms = hasCateringItems || accommodationUsesDefaultTerms;
```

