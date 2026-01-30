

# Plan: Facturatie-Flow Validatie bij Bureau Vlieland Items

## Huidige Situatie Geanalyseerd

De code werkt technisch correct, maar er zijn enkele onduidelijkheden die verduidelijking nodig hebben:

### Wat gebeurt er wanneer "Bureau Vlieland" wordt gekozen als facturerende partij?

| Aspect | Partner facturatie | Bureau Vlieland facturatie |
|--------|-------------------|---------------------------|
| `block_type` | `"partner"` | `"bureau"` |
| `provider_id` | Originele partner ID | `"bureau-vlieland"` |
| Partner ziet item? | ✅ Ja | ❌ Nee |
| Klant ziet juiste groepering? | ✅ Ja (onder "Aanbieders") | ✅ Ja (onder "Bureau Vlieland") |
| Admin factureert klant | ❌ Nee | ✅ Ja |

## Problemen Geïdentificeerd

### 1. Partner Verliest Zichtbaarheid
Wanneer een admin kiest voor "Bureau Vlieland" als facturerende partij, verdwijnt het item uit de partner dashboard. Dit is **by design**, maar:
- Partner krijgt geen notificatie over de activiteit
- Partner kan de activiteit niet markeren als "uitgevoerd"
- Alle coördinatie moet via Bureau Vlieland lopen

### 2. Ontbrekende Admin-zijde Weergave
In de AdminRequestDetail pagina is niet duidelijk zichtbaar wie er moet factureren en aan wie:
- Bureau items zouden een indicator moeten hebben "Te factureren door: Bureau Vlieland → Klant"
- Partner items zouden moeten tonen "Te factureren door: [Partner] → Klant"

---

## Voorgestelde Verbeteringen

### A. Visuele Indicator in AdminRequestDetail
Voeg een badge toe bij elk item dat aangeeft wie factureert:
- 🏢 "Bureau → Klant" voor bureau items
- 👥 "Partner → Klant" voor partner items

### B. Waarschuwing in AdminAddActivitySheet
Wanneer admin "Bureau Vlieland" kiest als facturerende partij, toon een waarschuwing:
> "Let op: De partner ontvangt geen notificatie en ziet dit item niet in hun portaal. Coördinatie met de uitvoerder verloopt via Bureau Vlieland."

### C. Behoud Originele Provider Info (optioneel)
Voeg velden toe om de "uitvoerende partner" te tracken, los van de "facturerende partij":
- `invoiced_by`: `"bureau"` | `"partner"`
- `executed_by_partner_id`: Originele partner ID (voor coördinatie)

---

## Implementatiestappen

| # | Actie | Bestand |
|---|-------|---------|
| 1 | Voeg waarschuwingsbanner toe wanneer "Bureau Vlieland" wordt gekozen | `AdminAddActivitySheet.tsx` |
| 2 | Voeg facturatie-indicator badge toe in AdminRequestDetail | `AdminRequestDetail.tsx` |
| 3 | Voeg "Gefactureerd door" kolom toe in item-lijst | `AdminRequestDetail.tsx` |

---

## Test Scenarios (Handmatig)

### Scenario 1: Bureau Vlieland Facturatie
1. Open AdminRequestDetail voor een maatwerkofferte
2. Klik "Activiteit toevoegen"
3. Selecteer een activiteit (bijv. Zeehondentocht)
4. Kies "Bureau Vlieland" als facturerende partij
5. Bevestig toevoeging
6. **Verificatie Admin**: Item toont `block_type: bureau` en `provider_id: bureau-vlieland`
7. **Verificatie Partner Portal**: Log in als Zeehondentochten Vlieland → Item mag NIET zichtbaar zijn
8. **Verificatie Klantpagina**: Item staat onder "Factuur Bureau Vlieland"

### Scenario 2: Partner Facturatie
1. Voeg dezelfde activiteit toe maar kies de partner als facturerende partij
2. **Verificatie Partner Portal**: Item IS zichtbaar bij partner
3. **Verificatie Klantpagina**: Item staat onder "Facturen aanbieders"

---

## Technische Details

### AdminAddActivitySheet.tsx - Huidige logica (correct)
```typescript
// Regel 115-120
const isBureauInvoiced = invoicedBy === "bureau";
const providerId = isBureauInvoiced 
  ? "bureau-vlieland" 
  : (selectedBlock.provider_id || "bureau-vlieland");
const blockType = isBureauInvoiced 
  ? "bureau" 
  : selectedBlock.block_type;
```

### get-partner-dashboard - Filter logica (correct)
```typescript
// Regel 73-74 - Partner ziet alleen items waar provider_id = eigen ID
.eq("provider_id", partner.id)
.neq("block_type", "self_arranged")
```

### PriceSummaryCard.tsx - Groepering (correct)
```typescript
// Regel 50-57 - Bureau vs Partner items gescheiden
const confirmedBureauItems = confirmedItems.filter(
  (item) => item.block_type === "bureau"
);
const confirmedPartnerItems = confirmedItems.filter(
  (item) => item.block_type === "partner"
);
```

---

## Conclusie

De huidige implementatie is **functioneel correct**:
- ✅ Bureau items worden correct gefilterd uit partner dashboard
- ✅ Klant ziet correcte facturatie-groepering
- ✅ Admin kan kiezen wie factureert

**Aanbevelingen voor UX-verbetering:**
1. Voeg visuele indicator toe in admin interface
2. Toon waarschuwing wanneer partner niet genotificeerd wordt

