
# LiveActivityFeed: meer details, betere context, dashboard layout

## Wat er al beschikbaar is in de data (volledig beeld na analyse)

### `admin_activity_log` — details JSON bevat al:
- `partner_invitation_resent`: `{ partner_name, partner_email }` — nu tonen we alleen actie, geen naam
- `partner_updated`: `{ name }` — partnernaam aanwezig maar niet getoond
- `quote_status_changed`: `{ old_status, new_status }` — statusovergang aanwezig maar niet getoond
- `item_status_changed`: `{ action, block_name, item_id }` — activiteitnaam aanwezig maar niet getoond
- `template_applied`: `{ template_name, items_added }` — volledig bruikbaar maar niet getoond
- `bulk_invite_partners`: `{ partner_names, successful, failed }` — volledig bruikbaar maar niet getoond
- `request_cancelled`: `{ reason }` — reden aanwezig maar niet getoond

### `program_request_history` — kolommen die er al zijn maar niet gebruikt worden:
- `item_id` — FK naar `program_request_items` — we fetchen dit **niet**, waardoor `block_name` en `provider_name` ontbreken bij `time_changed`, `item_accepted`, `counter_proposed`, `item_cancelled`
- `old_value` en `new_value` — bij `time_changed` staat hier `{ value: "18:00" }` resp. `{ value: "17:30" }` — de "van → naar" informatie is aanwezig maar niet uitgelezen
- `actor_name` — bij partner acties bevat dit al de partnernaam maar dit wordt niet getoond als subtitle

### Klantoffertes openen
- De edge function logt al `customer_portal_viewed` bij elke fetch — we kunnen ook detecteren wanneer een klant de offerte bekijkt (als `quote_status = 'offerte_verstuurd'`)
- Dit doen we door in de feed een aparte actie `quote_opened` te loggen

---

## Concrete verbeteringen per actie

### Klantacties (`program_request_history`)

| Actie | Nu | Verbeterd |
|-------|-----|-----------|
| `time_changed` | "Klant wijzigt tijdvoorkeur" · Naam | + activiteitnaam + provider + "18:00 → 17:30" uit old/new_value |
| `item_accepted` | "Klant heeft activiteit goedgekeurd" · Naam | + activiteitnaam + provider uit item_id join |
| `counter_proposed` | "Klant doet tegenvoorstel" · "notitie..." | + activiteitnaam + provider |
| `item_cancelled` | "Klant verwijdert activiteit" | + activiteitnaam + provider |
| `add_activity` | "Klant voegt activiteit toe" · notes | + bloknaam uit notes of new_value |
| `customer_portal_viewed` | "Klant heeft portaal bekeken" (gedimmed) | + exacte tijd altijd zichtbaar; bij quote_status=verzonden toevoeging "offerte geopend" |

### Partneracties (`program_request_history`)

| Actie | Nu | Verbeterd |
|-------|-----|-----------|
| `status_changed` (confirmed) | "Partner bevestigt activiteit" · notes | + activiteitnaam + prijs uit `new_value.quoted_price` (bv "€ 850,-") |
| `status_changed` (unavailable) | "Partner meldt niet beschikbaar" | + activiteitnaam + `new_value.status_note` als subtitle |
| `status_changed` (alternative) | "Partner stelt alternatief voor" | + activiteitnaam + toelichting |
| `status_changed` (executed) | "Partner markeert als uitgevoerd" | + activiteitnaam |

### Adminacties (`admin_activity_log`)

| Actie | Nu | Verbeterd |
|-------|-----|-----------|
| `partner_invitation_resent` | "Partneruitnodiging opnieuw verstuurd" (geen naam) | + `details.partner_name` + `details.partner_email` |
| `partner_updated` | "Admin wijzigt itemstatus" (fout label) | Correct label "Partnergegevens bijgewerkt" + `details.name` |
| `quote_status_changed` | "Offertestatuswijziging" (geen detail) | + "offerte_verstuurd → akkoord_ontvangen" uit `details.old_status`/`details.new_status` |
| `item_status_changed` | "Admin wijzigt itemstatus" | + `details.block_name` + actie (`activity_added` vs `activity_edited`) |
| `template_applied` | Onbekend label | "Template toegepast" + `details.template_name` + `details.items_added` activiteiten |
| `bulk_invite_partners` | Onbekend label | "Partners uitgenodigd" + `details.partner_names.join(', ')` |
| `request_cancelled` | Onbekend label | "Aanvraag geannuleerd" + `details.reason` als er een reden is |
| `partner_created` | Onbekend label | "Nieuwe partner aangemaakt" + partnernaam |

---

## Nieuwe `quote_opened` actie loggen

In `get-customer-program/index.ts` loggen we een extra actie wanneer de klant de portaalpagina opent **en** er een offerte verstuurd is (`quote_sent_at` gevuld):

```ts
// Log offerte-opening (alleen als offerte verstuurd is)
if (program.quote_sent_at) {
  supabase.from("program_request_history").insert({
    request_id: program.id,
    action: "quote_opened",
    actor: "customer",
    actor_name: program.customer_name,
    notes: "Klant heeft de offerte bekeken",
  }).then(() => {});
}
```

In de feed: label "Klant heeft offerte geopend", icoon `FileText` in groen, gedimmed (net als portal views).

---

## Item-details ophalen via batch-query

Voor acties met een `item_id` (time_changed, item_accepted, counter_proposed, item_cancelled, status_changed partner) doen we na de hoofdquery een extra batch-fetch:

```ts
// Collect alle item_ids uit history
const itemIds = historyData.filter(h => h.item_id).map(h => h.item_id);
if (itemIds.length > 0) {
  const { data: itemDetails } = await supabase
    .from("program_request_items")
    .select("id, block_name, provider_name")
    .in("id", itemIds);
  // Map op feed items
}
```

Dit voegt toe aan het `FeedItem` interface: `block_name` en `provider_name`.

---

## Tijdweergave: exacte tijd altijd zichtbaar

Momenteel staat de exacte tijd alleen achter een tooltip. We maken de exacte tijd **altijd zichtbaar** als tweede klein label rechts:

```
[relativeTime]
[14 jan · 16:42]   ← altijd zichtbaar, klein grijs
```

---

## Dashboard: volgorde sidebar aanpassen

Commissies omhoog, beschikbaarheid naar beneden. In `AdminDashboard.tsx`:
```tsx
<DashboardTodoWidget />
<PendingCommissionsCard />       {/* omhoog */}
<AdminUnavailabilityWidget />    {/* naar onder */}
```

---

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/components/admin/LiveActivityFeed.tsx` | item_id ophalen + batch-fetch block_name/provider_name; old_value/new_value uitlezen voor time_changed; uitgebreide getActionMeta en getSubtitle voor alle admin- en partner-acties; exacte tijd altijd zichtbaar; quote_opened actie; nieuwe actielabels voor template_applied, bulk_invite_partners, partner_updated, request_cancelled, partner_created |
| `src/pages/admin/AdminDashboard.tsx` | Volgorde sidebar: PendingCommissionsCard vóór AdminUnavailabilityWidget |
| `supabase/functions/get-customer-program/index.ts` | `quote_opened` loggen als fire-and-forget wanneer `quote_sent_at` gevuld |

Geen database-schemawijzigingen nodig — alle benodigde data is al aanwezig.
