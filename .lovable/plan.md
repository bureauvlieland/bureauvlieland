

# Fix misleidende labels op admin projectdetailpagina

## Probleem

Op de admin projectdetailpagina worden twee misleidende zaken getoond:

1. **"Aangevraagd" status** -- Suggereert dat partnermails al verstuurd zijn, terwijl het project nog in de opbouwfase zit
2. **"Partner -> Klant" facturatie** -- Suggereert dat partners direct factureren, terwijl Bureau Vlieland centraal factureert (vorige issue)

Dit komt doordat de pagina niet goed rekening houdt met het `invoicing_mode` en `program_type` van het project.

## Oplossing

### Fix 1: Facturatielabel (eerder besproken)

**Bestand:** `src/pages/admin/AdminRequestDetail.tsx`

```
// Van:
const isBureauInvoiced = item.block_type === "bureau";

// Naar:
const isBureauInvoiced = request?.invoicing_mode === "bureau_central" || item.block_type === "bureau";
```

Wanneer het project op `bureau_central` staat, tonen alle items "Bureau -> Klant".

### Fix 2: Status labels context-afhankelijk maken

**Bestand:** `src/types/programRequest.ts`

Het label "Aangevraagd" blijft correct voor self-service projecten. Voor quote-modus projecten wordt de status-kolom in de tabel al vervangen door de `item_quote_status` selector (Concept / In afstemming / Bevestigd / Optioneel). Echter, als een project per ongeluk als `self_service` is aangemaakt maar eigenlijk als offerte wordt gebruikt, ziet de admin het verkeerde label.

**Bestand:** `src/pages/admin/AdminRequestDetail.tsx`

Aanvulling: wanneer `invoicing_mode === "bureau_central"` en het project is niet expliciet in quote-modus, toon dan een contextgerichter label voor `pending` items:

```
// In de self-service statusweergave:
const displayLabel = (request?.invoicing_mode === "bureau_central" && item.status === "pending")
  ? "Nog niet verstuurd"
  : statusInfo.label;
```

Dit maakt het voor de admin direct duidelijk dat er nog geen communicatie naar partners is gegaan.

### Fix 3: Projecttype-indicator toevoegen

Optioneel maar nuttig: een duidelijke indicator bovenaan de pagina die toont welk facturatiemodel actief is, zodat de context altijd zichtbaar is.

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/pages/admin/AdminRequestDetail.tsx` | Facturatie-label fix + status-label aanpassing voor bureau_central projecten |

Twee kleine, gerichte aanpassingen -- geen nieuwe componenten of database-wijzigingen nodig.

