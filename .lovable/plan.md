
# Plan: Uniforme Klant-URL Architectuur

## ✅ STATUS: GEÏMPLEMENTEERD

De uniforme klant-URL architectuur is volledig geïmplementeerd. Alle projecten zijn nu benaderbaar via `/mijn-programma/:token`.

---

## Wat is er gedaan

### Fase 1: Database Trigger ✅
- `create_program_for_accommodation()` functie aangemaakt
- Trigger `auto_create_program_for_accommodation` actief
- Bij elke nieuwe `accommodation_request` wordt automatisch een `program_request` aangemaakt

### Fase 2: Migratie Bestaande Data ✅
- Alle bestaande standalone accommodation requests zijn gekoppeld aan nieuwe program requests
- Bidirectionele koppeling via `linked_program_id` en `linked_accommodation_id`

### Fase 3: Edge Functions ✅
- `send-accommodation-request`: Haalt nu program token op via join en gebruikt `/mijn-programma/:token`
- `notify-accommodation-quote`: Idem, altijd uniforme URL in notificatie-emails

### Fase 4: Frontend Routes ✅
- `AdminProjects.tsx`: "Bekijk als klant" gaat nu altijd naar `/mijn-programma/:token`
- `AccommodationQuotes.tsx`: Oude `/mijn-logies/:token` URLs worden automatisch redirect naar de uniforme URL

---

## Data Flow

```text
KLANT START LOGIES WIZARD
         │
         ▼
1. Insert in accommodation_requests
2. Database trigger maakt automatisch program_request
3. Bidirectionele koppeling via foreign keys
         │
         ▼
Bevestigingsmail met link:
https://bureauvlieland.nl/mijn-programma/{program_token}
         │
         ▼
Klant bezoekt /mijn-programma/:token
- Ziet logies sectie met offertes
- Kan activiteiten toevoegen
- Kan billing details invullen
- Alles op één plek
```

---

## Voordelen

1. **Eén URL per klant**: Geen verwarring, geen dubbele links
2. **Naadloze uitbreiding**: Activiteiten toevoegen wijzigt niets aan de URL
3. **Eenvoudiger admin**: Alle projecten werken hetzelfde
4. **Betere klantervaring**: Alles op één overzichtelijke plek
5. **Toekomstbestendig**: Nieuwe features hoeven maar één flow te ondersteunen
