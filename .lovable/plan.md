
# Plan: PDF-bijlage bij E-mail + BTW-correcties + Financieel Overzicht Uitbreiding

## Geïdentificeerde Problemen

### 1. PDF wordt niet meegestuurd als bijlage
**Huidig gedrag:** De `send-quote-offer` Edge Function stuurt alleen een HTML-e-mail met een link naar het klantportaal. De PDF wordt wel gegenereerd in de browser, maar niet bijgevoegd aan de e-mail.

### 2. BTW-berekening in PDF is incorrect
**Probleem in `AdminQuotePreview.tsx` regel 131-137:**
```typescript
const subtotal = itemsTotal * (request?.number_of_people || 1);  // Vermenigvuldigt pp-prijs
const vatAmount = (subtotal + bureauFee) * 0.21;  // Berekent 21% BTW OVER het totaal
const total = subtotal + bureauFee + vatAmount;   // Telt BTW erbij op
```

**Maar:** Prijzen in het systeem zijn al inclusief BTW. De berekening zou dus moeten zijn:
- Subtotaal = prijzen (incl. BTW)
- BTW = subtotaal / 1.21 × 0.21 (terugrekenen)
- Excl. BTW = subtotaal - BTW

### 3. Financieel Overzicht in AdminRequestDetail mist voorlopige prijzen
**Huidig:** `FinancialOverviewCard` toont alleen bevestigde bureau-items (`status === "confirmed"`).
**Gewenst:** Voor maatwerk-offertes wil je ook de voorlopige prijzen zien, zelfs als items nog niet bevestigd zijn.

---

## Voorgestelde Oplossingen

### A. PDF als bijlage meesturen

| Stap | Actie |
|------|-------|
| 1 | Frontend genereert PDF als Base64-string |
| 2 | Base64 wordt meegestuurd naar `send-quote-offer` Edge Function |
| 3 | Edge Function voegt PDF als bijlage toe aan Mailjet-bericht |

**Technische aanpak:**
```typescript
// Frontend: PDF genereren en als base64 meesturen
const pdfBlob = await generatePDF();
const base64 = await blobToBase64(pdfBlob);

await supabase.functions.invoke("send-quote-offer", {
  body: {
    requestId,
    validUntil,
    personalMessage,
    pdfBase64: base64,  // Nieuwe parameter
    pdfFilename: `Voorstel-${referenceNumber}.pdf`
  }
});

// Edge Function: Mailjet attachment
{
  From: { ... },
  To: [ ... ],
  Subject: "...",
  HTMLPart: emailHtml,
  Attachments: [
    {
      ContentType: "application/pdf",
      Filename: pdfFilename,
      Base64Content: pdfBase64
    }
  ]
}
```

### B. BTW-berekening corrigeren

**Huidige (fout):**
```
Prijs p.p.: €50 (incl. BTW)
Subtotaal (20 pers.): €1000
BTW (21%): €210    ← FOUT: berekent 21% over incl-prijs
Totaal: €1210      ← Onjuist
```

**Correct:**
```
Prijs p.p.: €50 (incl. BTW)
Subtotaal incl. BTW (20 pers.): €1000
Subtotaal excl. BTW: €826,45 (= €1000 / 1.21)
BTW (21%): €173,55 (= €1000 - €826,45)
Totaal incl. BTW: €1000  ← Gelijk aan subtotaal, want al incl.
```

**Aangepaste logica:**
```typescript
const calculateTotals = () => {
  const itemsTotal = items.reduce((sum, item) => sum + getItemPrice(item), 0);
  const bureauFee = calculateBureauFee(request?.number_of_people || 0);
  
  // Prijzen zijn per persoon, vermenigvuldigen
  const subtotalInclVat = (itemsTotal * (request?.number_of_people || 1)) + bureauFee;
  
  // Terugrekenen van BTW (prijzen zijn al inclusief)
  const subtotalExclVat = subtotalInclVat / 1.21;
  const vatAmount = subtotalInclVat - subtotalExclVat;
  
  return { 
    subtotalInclVat,   // Totaal incl. BTW
    subtotalExclVat,   // Totaal excl. BTW
    vatAmount,         // BTW-bedrag
    bureauFee 
  };
};
```

### C. Financieel Overzicht uitbreiden voor maatwerk-offertes

**Nieuwe sectie toevoegen:** "VOORLOPIGE PROGRAMMAKOSTEN"

| Element | Weergave |
|---------|----------|
| Alle activiteiten (ongeacht status) | Met indicatieve prijs |
| Badge per item | "Concept" / "Bevestigd" / "Optioneel" |
| Subtotaal voorlopig | Som van alle indicatieve prijzen |
| Coordinatiefee | Gebaseerd op groepsgrootte |

**Nieuwe component-props:**
```typescript
interface FinancialOverviewCardProps {
  numberOfPeople: number;
  items: ProgramRequestItem[];
  invoices: BureauInvoice[];
  onRegisterInvoice: () => void;
  isQuoteMode?: boolean;  // Nieuw: toon alle items, niet alleen bevestigde
}
```

---

## Implementatiestappen

| # | Bestand | Actie |
|---|---------|-------|
| 1 | `AdminQuotePreview.tsx` | Corrigeer BTW-berekening (prijzen zijn incl. BTW) |
| 2 | `AdminQuotePreview.tsx` | Voeg PDF base64 conversie toe en stuur mee naar Edge Function |
| 3 | `send-quote-offer/index.ts` | Accepteer PDF-bijlage en voeg toe aan Mailjet-bericht |
| 4 | `FinancialOverviewCard.tsx` | Voeg "VOORLOPIGE PROGRAMMAKOSTEN" sectie toe voor quote-modus |
| 5 | `AdminRequestDetail.tsx` | Geef `isQuoteMode={true}` door aan FinancialOverviewCard voor maatwerk-projecten |

---

## PDF Weergave na correctie

```text
╔════════════════════════════════════════════════════╗
║ BUREAU VLIELAND - Maatwerkvoorstel                 ║
╠════════════════════════════════════════════════════╣
║ Klant: Bedrijf X                                   ║
║ Datum: 15-16 maart 2025                            ║
║ Aantal: 25 personen                                ║
╠════════════════════════════════════════════════════╣
║ DAG 1 - 15 maart 2025                              ║
╠────────────────────────────────────────────────────╣
║ 10:00  Zeehondentocht (met 2 boten)      €45 p.p.  ║
║        Rederij Doeksen                             ║
║ 14:00  Wadlopen                          €35 p.p.  ║
║        Wadloopcentrum                              ║
╠════════════════════════════════════════════════════╣
║ Subtotaal (25 pers.)              €2.000,00        ║
║ Coördinatiekosten                    €100,00       ║
║ ──────────────────────────────────────────         ║
║ Subtotaal excl. BTW               €1.735,54        ║
║ BTW (21%)                           €364,46        ║
║ ──────────────────────────────────────────         ║
║ TOTAAL INCL. BTW                  €2.100,00        ║
╠════════════════════════════════════════════════════╣
║ ⚠ Dit voorstel is geldig tot 14 februari 2025     ║
║   Prijzen zijn onder voorbehoud.                   ║
║   Facturatie kan geschieden door partners.         ║
╚════════════════════════════════════════════════════╝
```

---

## Technische Details

### Mailjet Attachment Format
```javascript
{
  Messages: [{
    From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
    To: [{ Email: customerEmail, Name: customerName }],
    Subject: "Uw maatwerkvoorstel van Bureau Vlieland",
    HTMLPart: emailHtml,
    Attachments: [{
      ContentType: "application/pdf",
      Filename: "Voorstel-BV-2501-0001.pdf",
      Base64Content: "JVBERi0xLjQKJ..."  // Base64-encoded PDF
    }]
  }]
}
```

### Base64 Helper Function
```typescript
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
```
