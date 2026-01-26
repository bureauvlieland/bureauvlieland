
# Plan: Testfase Voorbereiding, Data Opschoning & Content Optimalisatie voor Self-Service

## Deel 1: Demo Data Opschonen

### Database Cleanup Script
De volgende test/demo data moet worden verwijderd uit de **Live** database voor productie:

**Te verwijderen tabellen/records:**
- `program_requests` - 4 test aanvragen
- `program_request_items` - gekoppelde items
- `program_request_history` - gekoppelde historie
- `shared_programs` - eventuele test shares

**SQL Cleanup (uit te voeren in Cloud View > Run SQL met Live geselecteerd):**
```sql
-- Eerst history verwijderen (foreign key constraint)
DELETE FROM program_request_history 
WHERE request_id IN (SELECT id FROM program_requests);

-- Dan items verwijderen
DELETE FROM program_request_items 
WHERE request_id IN (SELECT id FROM program_requests);

-- Dan requests zelf
DELETE FROM program_requests;

-- Eventuele test shared programs
DELETE FROM shared_programs 
WHERE expires_at < NOW() OR share_code LIKE 'TEST%';
```

---

## Deel 2: Content Optimalisatie voor Self-Service

### Kernboodschap Verschuiving

| Huidige focus | Nieuwe focus |
|---------------|--------------|
| "Neem contact op" | "Stel zelf samen" |
| "Offerte aanvragen" | "Start met je programma" |
| Passief (wij regelen) | Actief (jij kiest) |

### Wijzigingen per Pagina

#### 1. Homepage (Index.tsx)

**Hero sectie - Nieuwe CTA's:**
```
Primair:  "Stel je programma samen" → /programma-samenstellen
Secundair: "Bekijk onze diensten" → /diensten
```

**Hero tekst aanpassing:**
```
Huidige: "Bureau Vlieland organiseert eendaagse en meerdaagse programma's..."
Nieuw:   "Stel in 5 minuten je eigen programma samen. Kies uit activiteiten, 
         catering en vervoer – wij regelen de rest."
```

**CTA sectie onderaan:**
```
Huidige: "Neem contact op voor een vrijblijvend gesprek..."
Nieuw:   "Begin vandaag nog met je programma. Kies je bouwstenen, 
         geef je wensen door, en ontvang binnen 5 werkdagen bevestiging."
```

#### 2. Navigatie (Navigation.tsx)

**Desktop navigatie aanpassen:**
```
Huidige volgorde:
[Diensten ▼] [Voor wie ▼] [Samenwerken] [Bouwstenen] [Catering] [Contact] [Offerte aanvragen]

Nieuwe volgorde:
[Diensten ▼] [Voor wie ▼] [Bouwstenen] [Catering] [Contact] [Programma samenstellen ★]
```

**Wijzigingen:**
- "Offerte aanvragen" knop → "Programma samenstellen" (primaire CTA)
- "Samenwerken" verplaatsen naar footer of onder "Diensten" dropdown
- Accent kleur behouden voor primaire CTA

#### 3. Diensten pagina (Diensten.tsx)

**CTA sectie onderaan:**
```
Huidige: "Offerte aanvragen" + "Voor wie werken wij"
Nieuw:   "Stel je programma samen" + "Of vraag een op-maat offerte aan"
```

**Nieuwe tekst:**
```
"Weet je al wat je wilt? Stel direct je programma samen uit onze bouwstenen.
 Liever persoonlijk advies? Vraag een maatwerkofferte aan."
```

#### 4. Bouwstenen pagina (Voorbeeldprogrammas.tsx)

**Hero CTA is al goed:** "Start met samenstellen"

**Toevoegen: Directe link in intro:**
```
"Elk programma is uniek. Bekijk de mogelijkheden hieronder of 
 ga direct naar de configurator om je programma samen te stellen."
```

#### 5. Footer (Footer.tsx)

**Nieuwe sectie "Direct aan de slag":**
```
h4: "Direct aan de slag"
- Programma samenstellen → /programma-samenstellen  ← PROMINENT
- Bouwstenen bekijken → /bouwstenen
- Offerte aanvragen → /offerte
```

#### 6. Configurator pagina (ProgrammaSamenstellen.tsx)

**Hero tekst versterken:**
```
Huidige: "Stel je programma samen"
Nieuw:   "Bouw je eigen programma in 5 minuten"

Subtekst:
Huidige: "Kies uit activiteiten, catering en vervoer. Wij regelen de rest..."
Nieuw:   "Selecteer je favoriete bouwstenen, kies je datum en groepsgrootte. 
         Je aanvraag is vrijblijvend – je betaalt pas na bevestiging."
```

**Info banner vereenvoudigen:**
```
Huidige: 4 stappen met details
Nieuw:   3 eenvoudige stappen:
1. Kies bouwstenen → Voeg activiteiten, catering en vervoer toe
2. Vul je gegevens in → Datum, groepsgrootte en contactinfo  
3. Ontvang bevestiging → Aanbieders bevestigen binnen 5 werkdagen
```

---

## Deel 3: Structurele Route Wijzigingen

### URL Structuur Vereenvoudigen

| Route | Doel | Wijziging |
|-------|------|-----------|
| `/bouwstenen` | Inspiratie/overzicht modules | Behouden als informatief |
| `/programma-samenstellen` | Actieve configurator | Promoveren naar primaire CTA |
| `/offerte` | Traditioneel formulier | Behouden als alternatief |

**Geen URL wijzigingen nodig** - alleen de navigatie en messaging aanpassen.

---

## Deel 4: Checklist voor Testfase

### Functionele Tests

**Configurator Flow:**
- [ ] Bouwstenen toevoegen aan cart
- [ ] Datum en personen selecteren
- [ ] Meerdere dagen programma
- [ ] Aanvraag versturen
- [ ] Bevestigingsmail ontvangen

**Klantportaal:**
- [ ] Toegang via token link
- [ ] Items bekijken per dag
- [ ] Partner bevestigingen zien
- [ ] Voorstel accepteren (nieuwe flow)
- [ ] Voorwaarden accepteren
- [ ] Facturatiegegevens invullen

**Partner Portal:**
- [ ] Inloggen als partner
- [ ] Nieuwe aanvragen zien
- [ ] Bevestigen met prijs
- [ ] Niet beschikbaar melden
- [ ] "Mijn Aanbod" beheren
- [ ] Factuur registreren (na klant akkoord + uitvoering)

**Admin Dashboard:**
- [ ] Alle aanvragen zien
- [ ] Details bekijken
- [ ] Financieel overzicht
- [ ] Bureau factuur registreren

### Data Invoer Checklist

**Partners controleren:**
- [ ] Alle partners hebben correct email adres
- [ ] Partners zijn gekoppeld aan juiste bouwstenen
- [ ] Commissiepercentage correct (default 15%)

**Bouwstenen controleren:**
- [ ] Alle prijzen ingevuld
- [ ] Afbeeldingen beschikbaar
- [ ] Beschrijvingen compleet
- [ ] BTW instellingen correct

---

## Technisch Overzicht

### Bestanden te Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/Index.tsx` | Hero CTA's, messaging |
| `src/components/Navigation.tsx` | "Programma samenstellen" als primaire knop |
| `src/components/Footer.tsx` | "Direct aan de slag" sectie toevoegen |
| `src/pages/Diensten.tsx` | CTA sectie aanpassen |
| `src/pages/ProgrammaSamenstellen.tsx` | Hero tekst en info banner |
| `src/pages/Voorbeeldprogrammas.tsx` | Intro tekst met directe link |

### Geen Database Wijzigingen
Alle wijzigingen zijn front-end content updates.

---

## Samenvatting Prioriteiten

**Fase 1 - Nu:**
1. Demo data opschonen (Live database)
2. Partners en bouwstenen verifiëren
3. Basis functionaliteit testen

**Fase 2 - Content:**
4. Navigatie CTA wijzigen
5. Homepage hero en CTA's
6. Footer "Direct aan de slag"
7. Diensten pagina CTA's

**Fase 3 - Finetuning:**
8. Configurator messaging
9. Bouwstenen pagina tekst
10. Verdere A/B tests op basis van gebruik
