

# Plan: MijnActiviteitenPlanner (MAP) integratie

## Samenvatting

De twee werelden verbinden: het "op aanvraag" model van Bureau Vlieland en het "direct boekbaar" model van MijnActiviteitenPlanner. Partners die een MAP-tenant hebben krijgen een extra laag functionaliteit: live beschikbaarheid, actuele prijzen, en direct boekbare activiteiten -- alles onder de vlag van Bureau Vlieland met 10% commissie.

## Architectuur

```text
┌─────────────────────────────────────────────────┐
│                Bureau Vlieland                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Bouwsteen│  │ Partner  │  │ Publieke      │  │
│  │ (verrijkt│  │ Admin    │  │ Activiteiten  │  │
│  │ met MAP) │  │ Detail   │  │ Pagina        │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │           │
│       └──────┬───────┴───────────────┘           │
│              ▼                                   │
│    ┌─────────────────────┐                       │
│    │  Edge Functions     │                       │
│    │  - map-proxy        │                       │
│    │  - map-create-booking│                      │
│    └─────────┬───────────┘                       │
└──────────────┼───────────────────────────────────┘
               ▼
    ┌──────────────────────┐
    │ MijnActiviteitenPlanner │
    │  portal API (v1)     │
    │  X-Api-Key auth      │
    └──────────────────────┘
```

## Wat wordt gebouwd

### 1. Database: Partner MAP-koppeling
Nieuw veld op `partners` tabel: `map_tenant_slug` (text, nullable). Dit identificeert welke partners een MAP-tenant hebben. De centrale API key wordt als secret opgeslagen.

### 2. Edge Function: `map-proxy`
Centrale proxy voor alle MAP API calls. Gebruikt de ene API key. Endpoints:
- `GET /activities?slug={tenant}&dateStart=...&dateEnd=...` -- activiteiten ophalen
- `GET /activitytypes?slug={tenant}` -- activiteittypen ophalen
- `GET /activities/{id}?slug={tenant}` -- detail met beschikbaarheid (RemainingSlots)

### 3. Edge Function: `map-create-booking`
Maakt een boeking aan op MAP namens Bureau Vlieland:
- Ontvangt: activiteit ID, klantnaam, email, telefoon, aantal personen/kinderen
- Plaatst boeking via `POST /api/v1/bookings`
- Logt de boeking in een nieuwe `map_bookings` tabel met commissie-tracking
- Stuurt bevestigingsmail naar klant

### 4. Database: `map_bookings` tabel
Tracking van directe boekingen via Bureau Vlieland:
- `activity_id`, `activity_name`, `departure`, `partner_id`
- `customer_name`, `customer_email`, `customer_phone`
- `number_of_adults`, `number_of_children`
- `total_price`, `commission_percentage` (10%), `commission_amount`
- `booking_status`, `map_booking_id` (referentie naar MAP)

### 5. Bouwstenen verrijken met live data
Voor bouwstenen van partners met MAP-koppeling:
- Badge "Direct boekbaar" op de kaart
- Live prijzen ophalen en vergelijken met ingevoerde prijs
- Eerstvolgende beschikbare datum + resterende plekken tonen
- In admin: knop "Bekijk MAP planning" met popup van beschikbare activiteiten

### 6. Publieke "Losse Activiteiten" pagina
Vervangt de huidige link naar `boeking.mijnactiviteitenplanner.nl`. Eigen pagina op Bureau Vlieland:
- Overzicht van alle MAP-activiteiten van gekoppelde partners
- Gegroepeerd per partner of per type
- Kalenderweergave met beschikbaarheid
- Directe boekflow met klantgegevens + betaling (On Account via BV)
- Duidelijk Bureau Vlieland branding, 10% commissie inbegrepen in prijs

### 7. Admin: MAP Dashboard widget
- Overzicht van komende boekingen via Bureau Vlieland
- Commissie-tracking per partner
- Bezettingsgraad per activiteit

## Bestanden

| Actie | Bestand | Wat |
|-------|---------|-----|
| **Migratie** | SQL | `map_tenant_slug` op partners, `map_bookings` tabel |
| **Secret** | `MAP_API_KEY` | Centrale MijnActiviteitenPlanner API key |
| **Nieuw** | `supabase/functions/map-proxy/index.ts` | Proxy edge function |
| **Nieuw** | `supabase/functions/map-create-booking/index.ts` | Booking edge function |
| **Nieuw** | `src/pages/ActiviteitenBoeken.tsx` | Publieke direct-boek pagina |
| **Nieuw** | `src/hooks/useMapActivities.ts` | Hook voor MAP data fetching |
| **Nieuw** | `src/components/map/MapActivityCard.tsx` | Activiteitenkaart met live data |
| **Nieuw** | `src/components/map/MapBookingDialog.tsx` | Boekingsformulier |
| **Nieuw** | `src/components/map/MapCalendarView.tsx` | Kalender beschikbaarheid |
| **Edit** | `src/components/admin/AdminPartnerForm.tsx` | MAP tenant slug veld |
| **Edit** | `src/components/admin/AdminDashboard.tsx` | MAP boekingen widget |
| **Edit** | Bouwsteen kaarten | "Direct boekbaar" badge + live data |
| **Edit** | Routing | Nieuwe `/activiteiten-boeken` route |

## Volgorde van implementatie

1. Database migratie + API key secret opslaan
2. `map-proxy` edge function bouwen en testen
3. Admin: partner MAP-koppeling UI
4. Bouwstenen verrijken met live data
5. Publieke boekpagina met directe boekflow
6. `map-create-booking` edge function
7. MAP boekingen dashboard + commissie-tracking

## Technische details

- De MAP API gebruikt `X-Api-Key` header authenticatie (V1 endpoints)
- Alle MAP calls gaan via de edge function proxy om de API key server-side te houden
- De `map_tenant_slug` wordt gebruikt om de juiste tenant-URL te construeren (bijv. `activiteiten-vlieland`)
- Commissie van 10% wordt automatisch berekend en opgeslagen bij elke boeking
- Prijzen worden client-side opgehoogd met 10% voor de eindklant
- RLS: `map_bookings` alleen leesbaar voor admins

