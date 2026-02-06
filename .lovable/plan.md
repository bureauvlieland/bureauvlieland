
# Plan: Project Communicatie Tracking via Reguliere Mailprogramma's

## De Uitdaging

Je wilt alle e-mailcommunicatie rond een project bijhouden terwijl iedereen gewoon zijn eigen mailprogramma (Outlook, Gmail, etc.) blijft gebruiken. Dit is een veelvoorkomende behoefte bij bureaus die veel projectcommunicatie hebben.

## Mogelijke Oplossingen

### Optie A: Uniek Project E-mailadres met Auto-Forwarding

Elk project krijgt een uniek e-mailadres dat automatisch wordt doorgestuurd naar een centrale inbox en gelogd in het systeem.

```text
Voorbeeld:
  Project BV-2602-0001 → bv-2602-0001@mail.bureauvlieland.nl
  
Workflow:
  1. Klant stuurt mail naar bv-2602-0001@mail.bureauvlieland.nl
  2. Mail wordt automatisch:
     - Doorgestuurd naar info@bureauvlieland.nl
     - Opgeslagen in de database als communicatie-log
  3. Admin kan alle correspondentie zien in het project-detail
```

**Voordelen:**
- Volledig automatisch
- Klanten kunnen direct reageren naar project-adres
- Geen handmatig werk

**Nadelen:**
- Vereist mailserver configuratie (bijv. Mailgun, SendGrid, of eigen domein setup)
- Maandelijkse kosten voor inkomende e-mail verwerking

---

### Optie B: BCC/Forward Logging (Aanbevolen voor Snelle Start)

Een simpel systeem waarbij admins en partners emails kunnen forwarden naar een centraal adres dat ze automatisch koppelt aan het juiste project.

```text
Workflow:
  1. Admin ontvangt email van klant in reguliere inbox
  2. Admin forward de mail naar: log@bureauvlieland.nl
  3. Systeem herkent het project via:
     - Referentienummer in onderwerp (BV-2602-0001)
     - Of klant e-mailadres matching
  4. Email wordt gelogd in project timeline
```

**Voordelen:**
- Werkt met bestaande mailprogramma's
- Geen configuratie voor eindgebruikers
- Flexibel - je kiest zelf wat je logt

**Nadelen:**
- Vereist handmatige actie (forwarden)
- Kan emails missen als mensen vergeten te forwarden

---

### Optie C: Handmatige Communicatie Log (Eenvoudigste)

Een notitie-systeem in de admin/portal waar communicatie handmatig wordt vastgelegd.

```text
┌────────────────────────────────────────────────────────────┐
│ Communicatie Log                                     [+ Nieuw] │
├────────────────────────────────────────────────────────────┤
│ 📧 6 feb 14:32 - Email van klant                           │
│    "Kunnen we de blokarttocht verplaatsen naar woensdag?"  │
│                                                             │
│ 📞 5 feb 10:15 - Telefoongesprek                           │
│    "Besproken: aankomst wordt 09:30 i.p.v. 10:00"          │
│                                                             │
│ 📧 4 feb 16:45 - Email aan klant                           │
│    "Offerte aangepast met extra activiteit"                │
└────────────────────────────────────────────────────────────┘
```

**Voordelen:**
- Geen externe integraties nodig
- Direct te implementeren
- Kan ook telefoongesprekken en notities loggen

**Nadelen:**
- Volledig handmatig
- Risico op incomplete logging

---

### Optie D: Hybride Aanpak (Beste van Beide)

Combineer automatische uitgaande email logging (al aanwezig) met handmatige inkomende communicatie logging + optionele forward-to-log functie.

```text
Huidige situatie:
  ✓ Uitgaande emails → Automatisch gelogd (email_log tabel)
  
Toevoegen:
  + Handmatige communicatie entries (nieuw: project_communications tabel)
  + Optionele forward-to-log edge function
```

---

## Aanbevolen Aanpak: Optie D (Hybride)

### Fase 1: Handmatige Communicatie Log

**Nieuwe database tabel: `project_communications`**

| Kolom | Type | Omschrijving |
|-------|------|--------------|
| id | uuid | Primaire sleutel |
| request_id | uuid | Gekoppeld project |
| accommodation_id | uuid | OF gekoppeld logies project |
| communication_type | text | 'email_in', 'email_out', 'phone', 'note' |
| direction | text | 'inbound', 'outbound', 'internal' |
| subject | text | Onderwerp (optioneel) |
| content | text | Samenvatting of volledige tekst |
| contact_name | text | Naam van contact |
| contact_email | text | Email van contact |
| logged_by | uuid | Admin die het logde |
| logged_at | timestamptz | Wanneer gelogd |
| communication_date | timestamptz | Wanneer communicatie plaatsvond |
| metadata | jsonb | Extra data (bijlagen, etc.) |

**UI Toevoegingen:**

1. **AdminRequestDetail** - Nieuwe "Communicatie" tab/sectie
2. **AddCommunicationDialog** - Modal om entry toe te voegen
3. **CommunicationTimeline** - Chronologisch overzicht

### Fase 2: Forward-to-Log (Toekomstig)

Een edge function die emails ontvangt via webhook (bijv. via Mailgun of SendGrid inbound parsing) en automatisch logt.

---

## Implementatie Fase 1

### Database Migratie

```sql
CREATE TABLE project_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES program_requests(id),
  accommodation_id UUID REFERENCES accommodation_requests(id),
  communication_type TEXT NOT NULL DEFAULT 'note',
  direction TEXT NOT NULL DEFAULT 'internal',
  subject TEXT,
  content TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  logged_by UUID REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ DEFAULT now(),
  communication_date TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- RLS: alleen admins
ALTER TABLE project_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage communications" 
  ON project_communications FOR ALL 
  USING (is_admin(auth.uid()));
```

### Nieuwe Componenten

| Component | Locatie | Functie |
|-----------|---------|---------|
| AddCommunicationSheet | src/components/admin/ | Toevoegen van communicatie |
| ProjectCommunicationsCard | src/components/admin/ | Overzicht in project detail |

### Bestaande Aanpassingen

| Bestand | Wijziging |
|---------|-----------|
| AdminRequestDetail.tsx | Communicatie-sectie toevoegen |
| AdminAccommodationDetail.tsx | Communicatie-sectie toevoegen |

---

## Resultaat

Na implementatie:
- **Uitgaande emails**: Automatisch gelogd (bestaand systeem)
- **Inkomende emails/telefoon**: Handmatig te loggen met notities
- **Volledige timeline**: Combinatie van automatische + handmatige entries
- **Klantcontextschakelaar**: Snel zien wat er besproken is

---

## Technische Onderdelen

### Nieuwe Bestanden
1. `src/components/admin/AddCommunicationSheet.tsx`
2. `src/components/admin/ProjectCommunicationsCard.tsx`
3. Database migratie voor `project_communications` tabel

### Te Wijzigen Bestanden
1. `src/pages/admin/AdminRequestDetail.tsx` - Communicatie-sectie integreren
2. `src/pages/admin/AdminAccommodationDetail.tsx` - Communicatie-sectie integreren
