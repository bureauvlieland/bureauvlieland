

## Plan: Fix twee issues in partnerportaal

### Issue 1: "Te factureren" / "Facturatie" link gaat naar loginpagina

**Oorzaak**: De route is `/partner/facturatie` maar alle links verwijzen naar `/partner/finance`. Dat pad bestaat niet in de router, waardoor de gebruiker op een niet-bestaande pagina terechtkomt.

**Fix**: In twee bestanden het pad corrigeren:
- `src/pages/PartnerDashboard.tsx` regel 678: `/partner/finance` → `/partner/facturatie`
- `src/components/partner-portal/PartnerYtdModule.tsx` regel 44: `/partner/finance` → `/partner/facturatie`

Daarnaast: de `onNavigate("invoice")` handler in PartnerDashboard (regel 658-664) navigeert bij "invoice" naar `setActiveTab("action")` i.p.v. naar de facturatiepagina. Dit corrigeren zodat die ook naar `/partner/facturatie` navigeert met behoud van de impersonate parameter.

### Issue 2: Items van verwijderde projecten retroactief naar "Afgerond"

**Oorzaak**: Projecten die vóór de `notify-partner-cancellation` functie zijn verwijderd, hebben hun `program_request_items` nooit op `cancelled` gezet. Die items staan nog op `pending`/`confirmed` etc. maar horen bij een `program_requests` met `status = 'deleted'`.

**Fix**: In `supabase/functions/get-partner-dashboard/index.ts`:
- Na het ophalen van items, items waarvan `program_requests.status === 'deleted'` automatisch behandelen als `cancelled` (effectieve status overschrijven in de response).
- Optioneel: een eenmalige migratie om alle `program_request_items` die bij een `deleted` program_request horen en nog een actieve status hebben, op `cancelled` te zetten. Dit is het schoonste.

Ik stel voor om de migratie-aanpak te gebruiken zodat de data structureel klopt:

```sql
UPDATE program_request_items
SET status = 'cancelled', updated_at = now()
WHERE request_id IN (
  SELECT id FROM program_requests WHERE status = 'deleted'
)
AND status IN ('pending', 'confirmed', 'accepted', 'alternative', 'counter_proposed', 'executed');
```

En hetzelfde voor accommodation_quotes:
```sql
UPDATE accommodation_quotes
SET status = 'rejected', updated_at = now()
WHERE request_id IN (
  SELECT ar.id FROM accommodation_requests ar
  JOIN program_requests pr ON ar.linked_program_id = pr.id
  WHERE pr.status = 'deleted'
)
AND status IN ('pending', 'submitted');
```

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/pages/PartnerDashboard.tsx` | `/partner/finance` → `/partner/facturatie` + fix `onNavigate("invoice")` |
| `src/components/partner-portal/PartnerYtdModule.tsx` | `/partner/finance` → `/partner/facturatie` |
| Migratie (SQL) | Items van verwijderde projecten retroactief op `cancelled`/`rejected` zetten |

Drie kleine aanpassingen.

