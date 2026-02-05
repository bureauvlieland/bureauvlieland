
# Plan: Commissiepercentages in Handleidingen + Routefix

## Samenvatting
Twee problemen moeten worden opgelost:

1. **Handleidingen pagina**: Toont hardcoded percentages (15%/10%) in plaats van de daadwerkelijke commissiepercentages van de partner
2. **Route error**: De `PartnerYtdModule` linkt naar `/partner/facturatie` maar de correcte route is `/partner/finance`

---

## 1. Handleidingen - Dynamische Commissiepercentages

### Huidige situatie
In `PartnerGuides.tsx` (regel 269-278) staan vaste percentages:
```tsx
<span className="text-lg font-bold text-primary">15%</span>  // Activiteiten
<span className="text-lg font-bold text-primary">10%</span>  // Logies
```

### Oplossing
De handleidingen pagina moet de werkelijke commissiepercentages van de ingelogde partner ophalen en tonen:

**Stappen:**
1. Fetch partnergegevens via de bestaande dashboard functie
2. Toon de daadwerkelijke percentages in plaats van hardcoded waarden
3. Toon alleen relevante categorieën op basis van `partner_type`

**Resultaat:**
- Activiteitenpartner ziet: "Activiteiten: 8%"
- Logiespartner ziet: "Logies: 10%"
- Partner met "both" ziet beide percentages

---

## 2. Route Error - YtdModule

### Huidige situatie
In `PartnerYtdModule.tsx` (regel 44):
```tsx
<Link to={`/partner/facturatie${urlSuffix}`}>
```

Dit is de verkeerde route. De juiste route is `/partner/finance`.

### Oplossing
Corrigeer de link naar:
```tsx
<Link to={`/partner/finance${urlSuffix}`}>
```

---

## Technische Implementatie

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/PartnerGuides.tsx` | Ophalen en tonen van daadwerkelijke commissiepercentages |
| `src/components/partner-portal/PartnerYtdModule.tsx` | Route fix naar `/partner/finance` |

### PartnerGuides.tsx Wijzigingen

1. Voeg state en useEffect toe om partnergegevens op te halen
2. Vervang hardcoded percentages door dynamische waarden
3. Toon alleen relevante categorieën op basis van partner type

**Nieuw data-ophalen:**
```tsx
const [partnerData, setPartnerData] = useState<{
  commission_percentage: number;
  accommodation_commission_percentage?: number;
  partner_type?: string;
} | null>(null);

useEffect(() => {
  // Fetch partner data van get-partner-dashboard
  // Of direct van partners tabel via RLS
}, []);
```

**Dynamische weergave:**
```tsx
{/* Toon activiteiten commissie indien relevant */}
{(!partnerData?.partner_type || partnerData.partner_type !== 'accommodation') && (
  <div className="flex justify-between items-center">
    <span className="font-medium">Activiteiten</span>
    <span className="text-lg font-bold text-primary">
      {partnerData?.commission_percentage ?? 15}%
    </span>
  </div>
)}

{/* Toon logies commissie indien relevant */}
{(partnerData?.partner_type === 'accommodation' || partnerData?.partner_type === 'both') && (
  <div className="flex justify-between items-center">
    <span className="font-medium">Logies</span>
    <span className="text-lg font-bold text-primary">
      {partnerData?.accommodation_commission_percentage ?? 10}%
    </span>
  </div>
)}
```

---

## Resultaat

Na implementatie:
- Handleidingen toont de juiste commissiepercentages per partner (8%/10% in jouw geval)
- Commissiepercentages worden alleen getoond voor relevante diensten (activiteiten en/of logies)
- YtdModule navigeert correct naar de facturatiepagina zonder error
- Consistentie tussen Instellingen en Handleidingen pagina's
