

# Plan: Admin Omgeving Bijwerken voor Logies Functionaliteiten

## Samenvatting

De admin-omgeving heeft de basis al (navigatie en pagina's), maar mist integratie met de nieuwe functionaliteiten:
- Logies statistieken op het dashboard
- Quote bijlagen/externe links weergave
- Koppeling tussen logies en programma-aanvragen

---

## 1. Dashboard Uitbreiden met Logies Statistieken

### Bestand: `src/pages/admin/AdminDashboard.tsx`

Toevoegen:
- Statistiek-kaart voor logies aanvragen (nieuw, in behandeling, offertes verstuurd)
- Recente logies aanvragen sectie naast recente programma-aanvragen

```text
Nieuwe statistieken:
- Actieve logies aanvragen
- Te verwerken logies (status: submitted)
- Offertes verstuurd
```

---

## 2. Quote Details Uitbreiden in Admin

### Bestand: `src/pages/admin/AdminAccommodationDetail.tsx`

In de quotes-tabel toevoegen:
- Kolom/indicatie voor externe offerte-link (`quote_external_url`)
- Kolom/indicatie voor bijlage (`quote_attachment_path`)
- Klikbare link naar de offerte-PDF of externe URL

Wijzigingen in de quotes-tabel:
```text
| Partner | Accommodatie | Prijs | P.p.p.n. | Bijlage | Geldig tot | Status | Actie |
                                            ^^^^^^^
                                            NIEUW: link naar offerte
```

---

## 3. Koppeling Logies - Programma Weergeven

### Bestand: `src/pages/admin/AdminAccommodationDetail.tsx`

Toevoegen:
- Sectie die toont of er een gekoppeld programma is
- Link naar `/admin/aanvragen/:id` als er een gekoppeld programma bestaat
- Of: CTA om programma aan te maken als er geen koppeling is

### Bestand: `src/pages/admin/AdminRequestDetail.tsx` (indien nodig)

Toevoegen:
- Sectie die toont of er gekoppelde logies zijn
- Link naar `/admin/logies/:id` voor de logies-aanvraag

---

## 4. Klantpagina Link vanuit Admin

### Beide detailpagina's

Toevoegen:
- "Bekijk als klant" knop die de uniforme klantpagina opent (`/mijn-programma/:token`)
- Zorgt voor snelle verificatie van de klantervaring

---

## Technische Details

### Aan te passen bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/admin/AdminDashboard.tsx` | Logies statistieken + recente logies aanvragen |
| `src/pages/admin/AdminAccommodationDetail.tsx` | Quote bijlagen/links tonen + gekoppeld programma |
| `src/pages/admin/AdminRequestDetail.tsx` | Gekoppelde logies tonen |

### Database queries uitbreiden

**AdminDashboard.tsx**:
```typescript
// Nieuwe query voor logies statistieken
const { data: accommodationRequests } = await supabase
  .from("accommodation_requests")
  .select("id, status");
```

**AdminAccommodationDetail.tsx**:
```typescript
// Gekoppeld programma ophalen
const { data: linkedProgram } = await supabase
  .from("program_requests")
  .select("id, customer_token, customer_name")
  .eq("linked_accommodation_id", id)
  .maybeSingle();
```

---

## UI Voorbeelden

### Dashboard met logies kaarten

```text
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Actieve        │ │ Te bevestigen  │ │ Bevestigde     │ │ Actieve        │
│ aanvragen      │ │ items          │ │ items          │ │ partners       │
│     12         │ │     5          │ │     28         │ │     8          │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘

┌────────────────┐ ┌────────────────┐ ┌────────────────┐   <-- NIEUW
│ Logies         │ │ Logies te      │ │ Offertes       │
│ aanvragen      │ │ verwerken      │ │ verstuurd      │
│     6          │ │     3          │ │     2          │
└────────────────┘ └────────────────┘ └────────────────┘
```

### Quote met bijlage indicator

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Partner        │ Accommodatie    │ Prijs   │ Offerte     │ Status       │
├──────────────────────────────────────────────────────────────────────────┤
│ Hotel Seeduyn  │ Standaardkamers │ €4.500  │ 📎 Bekijken │ ✓ Ontvangen │
│ Strandhotel    │ Deluxe kamers   │ €5.200  │ 🔗 Link     │ ✓ Ontvangen │
└──────────────────────────────────────────────────────────────────────────┘
```

### Gekoppeld programma sectie

```text
┌─────────────────────────────────────────────────────────┐
│  📎 Gekoppeld programma                                 │
│                                                          │
│  [Aanvraag bekijken] → /admin/aanvragen/uuid            │
│  [Bekijk als klant] → /mijn-programma/token             │
│                                                          │
│  Status: 3 activiteiten, 2 bevestigd                    │
└─────────────────────────────────────────────────────────┘
```

---

## Implementatievolgorde

1. **Dashboard** - Logies statistieken toevoegen
2. **AdminAccommodationDetail** - Quote bijlagen + gekoppeld programma
3. **AdminRequestDetail** - Gekoppelde logies weergeven (reverse lookup)
4. **"Bekijk als klant"** - Link naar uniforme klantpagina

---

## Voordelen

1. **Volledig overzicht**: Admins zien alle logies-activiteit op het dashboard
2. **Efficiënte workflow**: Direct toegang tot offerte-documenten
3. **Gekoppelde context**: Duidelijke relatie tussen logies en programma
4. **Klantperspectief**: Snel kunnen checken wat de klant ziet

