
# Verbeterd Activiteitenoverzicht op het Admin Dashboard

## Probleem en doel

Het huidige dashboard toont alleen statistische aantallen en recente aanvragen. De activiteitenlog (/admin/logs) bevat uitsluitend admin-handelingen. Klant- en partneractiviteiten (zoals een partner die een offerte indient, of een klant die de voorwaarden accepteert) staan alleen verborgen in de `program_request_history` tabel — niet zichtbaar op het dashboard.

Het doel: een **gecombineerde live activiteitenstrook** op het dashboard die in één oogopslag laat zien wat er in de applicatie gebeurt.

---

## Wat er al beschikbaar is (bestaande data)

### `program_request_history` tabel (klant- en partneracties)
Bevat al automatisch gelogde acties:

| actor | action | Betekenis |
|-------|--------|-----------|
| partner | status_changed | Partner bevestigt, meldt onbeschikbaar, alternatief, uitgevoerd |
| customer | time_changed | Klant wijzigt gewenste tijd |
| customer | terms_accepted | Klant ondertekent voorwaarden |
| customer | billing_updated | Klant vult factuurgegevens in |
| customer | item_cancelled | Klant verwijdert activiteit |
| customer | counter_proposed | Klant doet tegenvoorstel |
| customer | item_accepted | Klant geeft akkoord op activiteit |
| admin | admin_sent_to_partners | Admin notificeert partners |

### `admin_activity_log` tabel (admin-acties)
| action | Betekenis |
|--------|-----------|
| request_viewed | Admin opent een aanvraag |
| item_status_changed | Admin wijzigt itemstatus |
| partner_invited / updated | Partnerbeheer |
| quote_status_changed | Offerteflow |

### Klantpaginabezoeken (nog niet gelogd)
De `request_viewed` actie in `admin_activity_log` is een **admin** die een aanvraag opent — géén klant. Klantbezoeken aan `/mijn-programma/:token` worden nu **niet** geregistreerd. Dit moeten we toevoegen.

---

## Wat we bouwen

### 1. Klantbezoeken loggen (nieuw)

In de `get-customer-program` edge function (die elke paginalading van het klantportaal aanroept) voegen we een INSERT toe in `program_request_history`:

```
action: "customer_portal_viewed"
actor: "customer"
actor_name: [customer_name van het programma]
notes: "Klant heeft het portaal bezocht"
```

Dit is de meest betrouwbare plek: de edge function wordt aangeroepen bij elke fetch van het klantportaal.

### 2. Nieuwe dashboardcomponent: `LiveActivityFeed`

Een nieuwe component `src/components/admin/LiveActivityFeed.tsx` die een gecombineerde feed toont van recente activiteiten uit beide bronnen:

**Databronnen:**
- `program_request_history` (laatste 30 items) — voor klant/partneracties
- `admin_activity_log` (laatste 20 items) — voor relevante admin-acties (géén request_viewed, want die zijn saai)

**Weergave per item:**
- Pictogram (klant, partner of admin)
- Beschrijving in begrijpelijke taal
- Klantnaam + link naar het project
- Tijdstip (relatief: "3 minuten geleden")

**Actietypes met label en icoon:**

| action | Actor | Label | Icoon |
|--------|-------|-------|-------|
| customer_portal_viewed | customer | "Klant heeft portaal bekeken" | Eye |
| terms_accepted | customer | "Klant heeft voorwaarden ondertekend" | FileCheck |
| item_accepted | customer | "Klant heeft activiteit goedgekeurd" | ThumbsUp |
| counter_proposed | customer | "Klant doet tegenvoorstel" | MessageSquare |
| time_changed | customer | "Klant wijzigt tijdvoorkeur" | Clock |
| billing_updated | customer | "Klant heeft factuurgegevens ingevuld" | Receipt |
| status_changed (confirmed) | partner | "Partner bevestigt activiteit" | CheckCircle |
| status_changed (unavailable) | partner | "Partner meldt niet beschikbaar" | XCircle |
| status_changed (alternative) | partner | "Partner stelt alternatief voor" | ArrowLeftRight |
| status_changed (executed) | partner | "Partner markeert als uitgevoerd" | PlayCircle |
| quote_status_changed | admin | "Offertestatuswijziging" | FileText |
| partner_invited | admin | "Partner uitgenodigd" | UserPlus |

**Filtering:**
- Filter-tabs: Alles / Klanten / Partners / Admin
- Klikbaar item opent direct het betreffende project (via `related_request_id`)

### 3. Dashboard aanpassen

De bestaande dashboardpagina (`AdminDashboard.tsx`) krijgt de `LiveActivityFeed` als extra sectie, boven de bestaande "Recente aanvragen" kaarten:

```
[Stats cards]
[Accommodatie stats]
[Todo widget]
[Partner beschikbaarheid | Commissies]
[NIEUW: Live activiteitenfeed]       <-- nieuw
[Recente aanvragen | Recente logies]
```

---

## Technische details

### Bestanden die worden aangemaakt

| Bestand | Doel |
|---------|------|
| `src/components/admin/LiveActivityFeed.tsx` | Nieuwe dashboardcomponent |

### Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/get-customer-program/index.ts` | Klantbezoek loggen in `program_request_history` |
| `src/pages/admin/AdminDashboard.tsx` | `LiveActivityFeed` toevoegen |

### Data ophalen in LiveActivityFeed

De component voert twee queries uit en combineert de resultaten:

**Query 1** – recente history (klant/partner):
```sql
SELECT h.*, pr.customer_name, pr.customer_company, pr.reference_number
FROM program_request_history h
JOIN program_requests pr ON pr.id = h.request_id
WHERE h.actor IN ('customer', 'partner')
ORDER BY h.created_at DESC
LIMIT 30
```

**Query 2** – relevante admin-acties:
```sql
SELECT * FROM admin_activity_log
WHERE action NOT IN ('request_viewed')
ORDER BY created_at DESC
LIMIT 20
```

Beide lijsten worden samengevoegd en gesorteerd op tijdstip.

### Klantbezoek loggen in edge function

In `get-customer-program/index.ts`, na het ophalen van het programma:
```ts
// Log customer portal view (fire-and-forget, non-blocking)
supabase.from("program_request_history").insert({
  request_id: program.id,
  action: "customer_portal_viewed",
  actor: "customer",
  actor_name: program.customer_name,
  notes: "Klant heeft het portaal bezocht",
}).then(() => {}); // non-blocking
```

Dit blokkeert de response niet (fire-and-forget), dus de klantpagina wordt er niet langzamer van.

### Aandachtspunt: RLS

De `program_request_history` INSERT via service role key in de edge function werkt al. De admin SELECT via `is_admin(auth.uid())` is al aanwezig.

---

## Samenvatting wijzigingen

| Bestand | Type | Wijziging |
|---------|------|-----------|
| `supabase/functions/get-customer-program/index.ts` | Aanpassen | Klantbezoek loggen (non-blocking) |
| `src/components/admin/LiveActivityFeed.tsx` | Nieuw | Gecombineerde activiteitenstrook |
| `src/pages/admin/AdminDashboard.tsx` | Aanpassen | LiveActivityFeed opnemen |

Geen database-schemawijzigingen nodig (de bestaande tabellen zijn toereikend).
