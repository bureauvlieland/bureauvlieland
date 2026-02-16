

## Plan: Projecten-pagina verbeteren met statussen en programmatypes

### Huidige situatie
De projecten-pagina toont nu alleen het type (Beide/Logies/Activ.) en losse statussen per logies-aanvraag. Er ontbreekt:
- Een overall projectstatus
- Het type programma (Maatwerk vs Self-service)
- Zinvolle filteropties gebaseerd op de daadwerkelijke data

### Wat er verandert

#### 1. Nieuwe kolom: Projectstatus
Een afgeleide status op basis van de beschikbare gegevens:

| Conditie | Label | Kleur |
|----------|-------|-------|
| `quote_status = 'concept'` | Concept | Grijs |
| `quote_status = 'offerte_verstuurd'` | Offerte verstuurd | Blauw |
| `terms_accepted_at` is gevuld | AV getekend | Groen |
| `completion_status = 'completed'` | Afgerond | Donkergroen |
| `status = 'cancelled'` | Geannuleerd | Rood |
| Geen quote_status, actief | Actief | Blauw |

Deze kolom vervangt de huidige "Type" kolom niet maar komt erbij, zodat je in een oogopslag de voortgang ziet.

#### 2. Programmatype zichtbaar maken
- De huidige "Type" badge (Beide/Logies/Activ.) wordt uitgebreid
- Bij projecten met `program_type = 'quote'` wordt een extra "Maatwerk" label getoond
- Bij self-service projecten wordt dit eventueel als "Self-service" getoond

#### 3. Verbeterde statusfilter
De statusfilter wordt vervangen door opties die matchen met de daadwerkelijke data:

- Alle statussen
- Concept (quote_status = concept)
- Offerte verstuurd (quote_status = offerte_verstuurd)
- AV getekend (terms_accepted_at gevuld)
- Afgerond (completion_status = completed)
- Geannuleerd
- Logies: In behandeling / Bevestigd

#### 4. Dashboard stats aanpassen
De vier statistiek-kaarten boven de tabel worden relevanter:
- **Totaal projecten** (behouden)
- **Concept** (aantal projecten in concept-fase)
- **Offerte verstuurd** (aantal met verstuurde offerte)
- **AV getekend** (aantal met getekende voorwaarden)

### Technische details

**Bestand:** `src/pages/admin/AdminProjects.tsx`

**Data-aanpassingen:**
- De query haalt nu ook `program_type`, `quote_status`, en `completion_status` op uit `program_requests`
- Het `Project` interface krijgt de velden `program_type`, `quote_status`, en `completion_status`
- Een helper-functie `getProjectStatus()` berekent de afgeleide status

**Tabel-kolommen (nieuwe volgorde):**
1. Type (Beide/Logies/Activ. + Maatwerk badge)
2. Status (nieuwe afgeleide projectstatus badge)
3. Referentie(s)
4. Klant
5. Logies
6. Activiteiten
7. Datum(s)
8. Personen
9. Acties

**Filter-logica:**
De statusfilter werkt op de afgeleide projectstatus in plaats van op de losse `program_status` / `accommodation_status` velden.

