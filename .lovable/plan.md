
# Plan: Uitbreiding Partner Dashboard Functionaliteit

## Overzicht
Dit plan beschrijft de verbeteringen aan het Partner Dashboard, inclusief het clickable maken van de "Te factureren" stat-kaart en de toevoeging van nieuwe handige functionaliteiten voor partners.

---

## Deel 1: Clickable Stats Kaarten

### Huidige situatie
De `PartnerCompactStats` component toont 4 statistieken (Nieuw, Wacht op klant, Klant akkoord, Te factureren) als statische kaarten zonder interactie.

### Aanpassing
Alle stats kaarten worden klikbaar met navigatie naar de relevante view:

| Stat | Klik-actie |
|------|------------|
| Nieuw | Activeer "Actie nodig" tab op dashboard |
| Wacht op klant | Activeer "In behandeling" tab |
| Klant akkoord | Activeer "In behandeling" tab |
| Te factureren | Navigeer naar Facturatie pagina |

### Wijzigingen
- **`PartnerCompactStats.tsx`**: Props uitbreiden met `onStatClick` callback
- **`PartnerDashboard.tsx`**: Handler toevoegen die navigeert of tab wisselt

---

## Deel 2: Nieuwe Functionaliteiten voor Partners

### 2.1 Quick-Copy Referentienummer
**Locatie**: PartnerItemSheet + PartnerUnifiedList

Een "Kopieer" knop naast het referentienummer zodat partners dit snel kunnen delen met klanten of voor hun eigen administratie.

### 2.2 Bulk Acties op Dashboard
**Locatie**: PartnerDashboard

- "Markeer alle als gelezen" voor nieuwe aanvragen
- Batch facturatie starten voor meerdere items tegelijk
- Export naar CSV van te factureren items

### 2.3 Aankomende Activiteiten Widget
**Locatie**: Nieuw component op Dashboard

Een compacte kalenderweergave van activiteiten die de komende 7-14 dagen gepland staan, gesorteerd op datum. Dit geeft partners direct inzicht in wat er binnenkort uitgevoerd moet worden.

```text
┌─────────────────────────────────────────┐
│  📅  Aankomende activiteiten            │
├─────────────────────────────────────────┤
│  ma 3 feb   Zeehondentocht (14 pers)   │
│  wo 5 feb   Strandwandeling (8 pers)   │
│  vr 7 feb   Zeehondentocht (22 pers)   │
└─────────────────────────────────────────┘
```

### 2.4 Notificatie Historie / Berichtencentrum
**Locatie**: Nieuwe pagina + kleine indicator in sidebar

Een overzicht van:
- Ontvangen aanvragen
- Statuswijzigingen door klanten
- Herinneringen van Bureau Vlieland
- Systeem notificaties

### 2.5 Jaar/Maand Statistieken Dashboard
**Locatie**: Uitbreiding PartnerFinance of nieuw tabblad

Uitgebreidere statistieken met:
- Maandelijkse omzet grafiek (recharts)
- Vergelijking met vorig jaar
- Top activiteiten (meest geboekt)
- Gemiddelde groepsgrootte

### 2.6 Snelle Beschikbaarheid Blokkering
**Locatie**: Dashboard of Instellingen

Partners kunnen snel periodes blokkeren waarin ze niet beschikbaar zijn (vakantie, onderhoud). Dit wordt zichtbaar voor admins bij nieuwe aanvragen.

```text
┌─────────────────────────────────────────┐
│  🚫  Niet beschikbaar                   │
├─────────────────────────────────────────┤
│  15-22 maart 2026 (Onderhoud boot)      │
│  + Periode toevoegen                    │
└─────────────────────────────────────────┘
```

### 2.7 Documenten Sectie
**Locatie**: Instellingen of nieuwe pagina

Centrale plek voor:
- Eigen algemene voorwaarden (al aanwezig)
- Certificaten/vergunningen uploaden
- Verzekeringsdocumenten

---

## Deel 3: Implementatie Prioriteit

### Fase 1 (Direct implementeren)
1. **Clickable stats kaarten** - Eenvoudig, hoge impact
2. **Quick-copy referentienummer** - Al deels aanwezig, afmaken
3. **Aankomende activiteiten widget** - Data beschikbaar

### Fase 2 (Op korte termijn)
4. Maand statistieken grafiek
5. Beschikbaarheid blokkering
6. Export naar CSV

### Fase 3 (Later)
7. Bulk acties
8. Notificatie historie
9. Documenten beheer

---

## Technische Details Fase 1

### 1. PartnerCompactStats clickable maken

```typescript
// Nieuwe props interface
interface PartnerCompactStatsProps {
  pending: number;
  waitingOnCustomer: number;
  accepted: number;
  toInvoice: number;
  onStatClick?: (stat: "pending" | "waiting" | "accepted" | "invoice") => void;
}
```

### 2. Aankomende Activiteiten Component

Nieuw component `PartnerUpcomingActivities.tsx`:
- Filter items op `effectiveStatus` = "accepted" of "confirmed"
- Sorteer op `selected_dates[day_index]` + `confirmed_time`
- Toon maximaal 5-7 items
- Klik opent de item sheet

### 3. Database aanpassingen

Voor beschikbaarheid blokkering (Fase 2):
```sql
CREATE TABLE partner_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Samenvatting

| Verbetering | Complexiteit | Impact |
|-------------|--------------|--------|
| Clickable stats | Laag | Hoog |
| Copy referentienummer | Laag | Medium |
| Aankomende activiteiten | Medium | Hoog |
| Maand statistieken | Medium | Medium |
| Beschikbaarheid blokkering | Medium | Hoog |
| Bulk acties | Hoog | Medium |
| Notificatie historie | Hoog | Medium |
