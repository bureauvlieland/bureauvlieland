## Probleem

De klant heeft alles goedgekeurd, maar de huidige UI gooit drie verschillende labels door elkaar:
- "Akkoord" (geaccepteerd) — verwarrend, lijkt op partner-akkoord
- "Bevestigd" (bureau-onderdelen) — suggereert dat de aanbieder al heeft bevestigd
- Géén onderscheid voor partner-onderdelen waarop we nog wachten (zoals Zeehondentocht: klant heeft goedgekeurd, partner staat nog op `pending`)

Tooltips spreken bovendien een andere taal dan de labels.

## Oplossing: één bron, één label per situatie

Eén label voor "klant heeft dit goedgekeurd" met **één tekst** voor klant/admin/partner, en een tooltip die afhankelijk van de *partner*-stand de werkelijke vervolgactie uitlegt. Dezelfde derivation wordt overal gebruikt (admin, klant, partner) — geen lokale overrides meer.

### Nieuwe / aangepaste display-statussen in `src/lib/itemStatus.ts`

| Trigger | Status-key | Klantlabel | Admin-label | Partner-label |
|---|---|---|---|---|
| `customer_accepted_at` + partner `pending` (incl. bureau) | `klant_akkoord_wacht_partner` (nieuw) | **Door u goedgekeurd** | Klant akkoord — wacht op aanbieder | Klant akkoord — reactie gevraagd |
| `customer_accepted_at` + partner `confirmed`/`alternative` | `geaccepteerd` (bestaand, label vernieuwd) | **Door u goedgekeurd** | Klant akkoord — aanbieder bevestigd | Klant akkoord — bevestig in planning |
| Bureau-onderdeel (`provider_id="bureau"`) + klant akkoord | valt onder `klant_akkoord_wacht_partner` met *bureau*-tooltipvariant | **Door u goedgekeurd** | Bureau Vlieland regelt dit zelf | Bureau Vlieland regelt dit zelf |

Bestaande keys `wacht_op_partner`, `wacht_op_klant`, `prijs_gewijzigd`, `uitgevoerd`, `geannuleerd`, `niet_beschikbaar`, `self_arranged` blijven ongewijzigd.

### Tooltip-terminologie (gelijk aan label)
- Klant-tooltip "Door u goedgekeurd" varianten:
  - Wacht-op-partner: *"U hebt dit onderdeel goedgekeurd. Wij wachten nog op bevestiging van de aanbieder en houden u op de hoogte."*
  - Bevestigd door partner: *"U hebt dit onderdeel goedgekeurd. De aanbieder heeft het bevestigd."*
  - Bureau-onderdeel: *"U hebt dit onderdeel goedgekeurd. Bureau Vlieland regelt dit zelf — geen aanbieder-bevestiging nodig."*
- Admin- en partner-tooltips spiegelen exact dezelfde feiten en wie aan zet is.

### Derivation (`deriveItemDisplayStatus`)
```text
1. Terminale states (cancelled / executed / unavailable / self_arranged)
2. customer_accepted_at gezet?
   - openPriceChange ná akkoord → prijs_gewijzigd
   - provider_id="bureau" → klant_akkoord_wacht_partner (bureau-variant)
   - status="pending" (partner nog niet gereageerd) → klant_akkoord_wacht_partner
   - anders → geaccepteerd (partner bevestigd)
3. Geen klant-akkoord:
   - status="pending" → wacht_op_partner
   - anders → wacht_op_klant
```

De bureau-variant wordt onderscheiden door een extra contextveld in de derivation (we geven `item.provider_id` mee aan de badge-component voor tooltip-keuze) of door een dedicated sub-status `klant_akkoord_bureau`. Ik kies voor een **aparte key** `klant_akkoord_bureau` zodat de config statisch en testbaar blijft. Dus uiteindelijk twee nieuwe keys:
- `klant_akkoord_wacht_partner`
- `klant_akkoord_bureau`

### UI-opruiming
- `src/components/customer-portal/CustomerProgramItem.tsx`: lokale override (`if provider_id === "bureau" → 'Bevestigd'`) verwijderen — de derivation handelt dit nu af. Bestaande groene zin "U heeft dit programmaonderdeel goedgekeurd" onderaan de kaart verwijderen (dubbel met badge).
- `src/components/shared/ItemDisplayStatusBadge.tsx`: nieuwe toon-mapping (groen tint) voor beide nieuwe keys.
- Admin- en partner-views krijgen automatisch de nieuwe labels via `deriveItemDisplayStatus`.

### Tests
- `src/lib/__tests__/itemStatus.test.ts` uitbreiden:
  - klant akkoord + partner pending + provider_id≠bureau → `klant_akkoord_wacht_partner`
  - klant akkoord + provider_id=bureau → `klant_akkoord_bureau`
  - klant akkoord + partner confirmed → `geaccepteerd`
  - label-string-snapshot test dat klantlabel voor alle drie "Door u goedgekeurd" is.

## Bestanden
- `src/lib/itemStatus.ts` (config + derivation)
- `src/components/shared/ItemDisplayStatusBadge.tsx` (tone mapping)
- `src/components/customer-portal/CustomerProgramItem.tsx` (override + dubbele zin weg)
- `src/lib/__tests__/itemStatus.test.ts` (extra cases)

## Out of scope
Geen wijzigingen aan workflow-vlaggen, edge functions of database — alleen presentatielaag + derivation.
