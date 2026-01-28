
# End-to-End Test Plan: Complete Workflow Bureau Vlieland

Dit is een uitgebreide testchecklist om de volledige workflow te doorlopen, inclusief alle emails, berekeningen, en status-overgangen.

---

## Test Scenario Overzicht

We testen twee hoofdflows:

```text
FLOW A: ACTIVITEITEN
┌────────────────┐    ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  1. Klant      │───▶│  2. Partner    │───▶│  3. Klant      │───▶│  4. Partner    │
│  Configurator  │    │  Bevestigt     │    │  Accepteert    │    │  Factureert    │
└────────────────┘    └────────────────┘    └────────────────┘    └────────────────┘
        │                     │                     │                     │
        ▼                     ▼                     ▼                     ▼
   Email naar:           Email naar:          Billing info          Commissie
   - Bureau              - Klant              ingevoerd             berekend
   - Partner                                                        
   - Klant                                                          

FLOW B: LOGIES
┌────────────────┐    ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  1. Klant      │───▶│  2. Admin      │───▶│  3. Partner    │───▶│  4. Klant      │
│  Logies Wizard │    │  Vraagt offerte│    │  Dient offerte │    │  Selecteert    │
└────────────────┘    └────────────────┘    └────────────────┘    └────────────────┘
        │                     │                     │                     │
        ▼                     ▼                     ▼                     ▼
   Email naar:           Email naar:          Email naar:          Logies
   - Bureau              - Partners           - Klant              bevestigd
   - Klant                                                         
```

---

## FLOW A: Activiteiten Workflow

### Stap 1: Programma Aanvraag (Klant)

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Ga naar `/programma-samenstellen` | Configurator laadt | ☐ |
| Voeg 2-3 activiteiten toe (bijv. Vliehors Express, Zeehonden Safari) | Items in winkelwagen | ☐ |
| Vul groepsgrootte in (bijv. 25 personen) | Prijzen berekenen correct | ☐ |
| Selecteer datum(s) | Kalender werkt | ☐ |
| Vul contactgegevens in met TEST email | Validatie werkt | ☐ |
| Dien aanvraag in | Success melding | ☐ |

**Te controleren emails:**
| Email | Ontvanger | Inhoud Check |
|-------|-----------|--------------|
| Bevestigingsemail klant | Test email | Link naar portal, activiteiten lijst | ☐ |
| Notificatie Bureau | erwin@bureauvlieland.nl | Volledige aanvraag details | ☐ |
| Partner notificatie(s) | Partner emails (of test redirect) | Alleen hun activiteiten, klant contactgegevens | ☐ |

**Database checks:**
| Tabel | Verwachte records |
|-------|------------------|
| `program_requests` | 1 record met customer_token | ☐ |
| `program_request_items` | 2-3 items met status `pending` | ☐ |
| `program_request_history` | Initial submission entry | ☐ |

---

### Stap 2: Partner Bevestiging

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Log in als partner via `/partner/login` | Dashboard laadt | ☐ |
| Zie nieuwe aanvraag in "Nieuw" tab | Item met status `pending` | ☐ |
| Open item details | Sheet met alle info | ☐ |
| Vul prijs in (bijv. €45,00) | Validatie accepteert bedrag | ☐ |
| Optioneel: voeg opmerking toe | Tekst opgeslagen | ☐ |
| Klik "Bevestigen" | Status wordt `confirmed` | ☐ |

**Te controleren emails:**
| Email | Ontvanger | Inhoud Check |
|-------|-----------|--------------|
| Status update email | Klant email | Activiteit naam, bevestigde prijs, portal link | ☐ |

**Commissie berekening check:**
| Veld | Verwacht (bij €45,00 incl. 21% BTW) |
|------|-----------------------------------|
| Bedrag excl. BTW | €37,19 (45 / 1.21) | ☐ |
| Commissie 15% | €5,58 | ☐ |

---

### Stap 3: Klant Acceptatie

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Ga naar klantportal `/mijn-programma/:token` | Programma laadt | ☐ |
| Zie bevestigde activiteit met prijs | Groene status badge | ☐ |
| Klik "Accepteren" bij elk bevestigd item | Items worden `accepted` | ☐ |
| Vul facturatiegegevens in | Form validatie werkt | ☐ |
| Accepteer algemene voorwaarden | Checkbox + handtekening | ☐ |
| Onderteken | `terms_accepted_at` gevuld | ☐ |

**Status progression:**
```
pending → confirmed → accepted
```

**Prijsoverzicht check (PriceSummaryCard):**
| Element | Correct? |
|---------|----------|
| Activiteiten subtotaal | ☐ |
| BTW 21% berekening | ☐ |
| Coördinatiefee (staffel) | ☐ |
| Totaal incl. BTW | ☐ |

---

### Stap 4: Uitvoering & Facturatie (Partner)

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Partner markeert item als "Uitgevoerd" | Status → `executed` | ☐ |
| Partner klikt "Factuur registreren" | Dialog opent | ☐ |
| Vul in: bedrag €45, factuurnummer, datum | Validatie werkt | ☐ |
| Bevestig factuurregistratie | Status → `invoiced` | ☐ |

**Commissie verificatie:**
| Veld | Verwacht |
|------|----------|
| `invoiced_amount` | €45,00 | ☐ |
| `commission_percentage` | 15% | ☐ |
| `commission_amount` | €5,58 | ☐ |
| `commission_status` | `pending` | ☐ |
| Admin todo aangemaakt | "Commissie factureren: ..." | ☐ |

**Email check:**
| Email | Ontvanger | Inhoud |
|-------|-----------|--------|
| Factuurregistratie notificatie | erwin@bureauvlieland.nl | Partner naam, bedrag, commissie | ☐ |

---

### Stap 5: Admin Commissie Afhandeling

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Ga naar `/admin/commissies` | Overzicht laadt | ☐ |
| Filter op "Verwacht" | Pending commissies tonen | ☐ |
| Selecteer maand filter | Filtering werkt | ☐ |
| Bekijk commissie details | Partner, bedrag, percentage | ☐ |
| Bevestig commissie | Status → `confirmed` | ☐ |

---

## FLOW B: Logies Workflow

### Stap 1: Logies Aanvraag (Klant)

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Ga naar `/logies-vlieland` of `/logies-aanvragen` | Wizard laadt | ☐ |
| **Stap 1**: Datum & gasten | Validatie werkt | ☐ |
| **Stap 2**: Accommodatietype kiezen | Radio buttons werken | ☐ |
| **Stap 3**: Kamerverdeling | Aantallen correct | ☐ |
| **Stap 4**: Wensen (optioneel) | Multi-select werkt | ☐ |
| **Stap 5**: Contactgegevens | Validatie op email/telefoon | ☐ |
| Dien aanvraag in | Success scherm | ☐ |

**Database trigger check:**
| Verwacht | Check |
|----------|-------|
| `accommodation_requests` record aangemaakt | ☐ |
| `program_requests` record AUTO-aangemaakt via trigger | ☐ |
| `linked_accommodation_id` correct gekoppeld | ☐ |
| `linked_program_id` terug gekoppeld | ☐ |

**Emails:**
| Email | Ontvanger |
|-------|-----------|
| Bevestiging klant | Klant email | ☐ |
| Notificatie Bureau | erwin@bureauvlieland.nl | ☐ |

---

### Stap 2: Admin Stuurt Offerteaanvraag

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Ga naar `/admin/logies` | Lijst met aanvragen | ☐ |
| Open aanvraag detail | Alle klantinfo zichtbaar | ☐ |
| Klik "Offertes aanvragen" | Dialog met partner selectie | ☐ |
| Selecteer 2-3 logies partners | Checkboxes werken | ☐ |
| Bewerk email inhoud (optioneel) | Preview correct | ☐ |
| Verstuur aanvragen | Success melding | ☐ |

**Database checks:**
| Tabel | Verwacht |
|-------|----------|
| `accommodation_quotes` | 2-3 records met status `pending` | ☐ |
| `accommodation_requests.status` | `processing` | ☐ |

**Emails naar partners:**
| Check |
|-------|
| Elke geselecteerde partner ontvangt email | ☐ |
| Email bevat aanvraag details | ☐ |
| Link naar partnerportaal | ☐ |

---

### Stap 3: Partner Dient Offerte In

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Partner logt in | Dashboard laadt | ☐ |
| Ga naar "Logies aanvragen" tab | Pending requests zichtbaar | ☐ |
| Open aanvraag | Detail sheet | ☐ |
| Vul offerte in: naam, kamers, prijs, voorwaarden | Validatie werkt | ☐ |
| Optioneel: upload/link externe offerte | URL of PDF | ☐ |
| Dien offerte in | Status → `submitted` | ☐ |

**Email check:**
| Email | Ontvanger |
|-------|-----------|
| Offerte notificatie | Klant email | ☐ |

---

### Stap 4: Klant Selecteert Offerte

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Klant opent portal `/mijn-programma/:token` | Accommodatie sectie zichtbaar | ☐ |
| Bekijk ontvangen offertes | Vergelijkingskaarten | ☐ |
| Klik "Selecteer deze offerte" | Bevestigingsdialog | ☐ |
| Bevestig selectie | Status → `selected` | ☐ |

**Database update:**
| Veld | Verwacht |
|------|----------|
| Geselecteerde quote `status` | `selected` | ☐ |
| Andere quotes `status` | `rejected` | ☐ |
| `accommodation_requests.status` | `accepted` | ☐ |

---

### Stap 5: Logies Facturatie

| Actie | Verwacht Resultaat | Check |
|-------|-------------------|-------|
| Partner registreert factuur | Dialog werkt | ☐ |
| Vul bedrag, nummer, datum in | Validatie | ☐ |
| Bevestig | Record updated | ☐ |

**Commissie berekening (10% voor logies):**
| Veld | Voorbeeld (€1000 incl. 9% BTW) |
|------|-------------------------------|
| Bedrag excl. BTW | €917,43 (1000 / 1.09) | ☐ |
| Commissie 10% | €91,74 | ☐ |

---

## Berekeningen Verificatie Checklist

### BTW Berekeningen

| Type | BTW Tarief | Formule |
|------|------------|---------|
| Activiteiten | 21% | `incl / 1.21 = excl` | ☐ |
| Logies | 9% | `incl / 1.09 = excl` | ☐ |

### Commissie Berekeningen

| Partner Type | Default % | Basis |
|--------------|-----------|-------|
| Activiteit | 15% | Bedrag excl. BTW | ☐ |
| Logies | 10% | Bedrag excl. BTW | ☐ |
| Custom per partner | Variabel | `partner.commission_percentage` | ☐ |

### Coördinatiefee Staffel

| Groepsgrootte | Fee |
|---------------|-----|
| 1-10 | €50 | ☐ |
| 11-25 | €100 | ☐ |
| 26-100 | €250 | ☐ |
| 101-150 | €350 | ☐ |
| 151+ | €500 | ☐ |

---

## Email Delivery Checklist

| Trigger | Email Type | Ontvanger(s) | Template ID |
|---------|------------|--------------|-------------|
| Program request submit | Bevestiging | Klant | - |
| Program request submit | Notificatie | Bureau | - |
| Program request submit | Partner notificatie | Per partner | - |
| Partner confirms | Status update | Klant | STATUS_CONFIRMED |
| Partner unavailable | Status update | Klant | STATUS_UNAVAILABLE |
| Invoice registered | Notificatie | Bureau | - |
| Accommodation request | Bevestiging | Klant + Bureau | - |
| Admin sends quote request | Offerteaanvraag | Partners | - |
| Partner submits quote | Notificatie | Klant | - |

---

## Admin Todos Automatisch Aangemaakt

| Trigger | Todo Type | Priority |
|---------|-----------|----------|
| Partner bevestigt | `terms_reminder` (als alles confirmed) | Normal |
| Partner registreert factuur | `commission_pending` | Normal |
| Geen reactie partner (10 dagen) | `partner_reminder` | Normal |
| Geen reactie partner (21 dagen) | Escalatie | Urgent |

---

## Test Data Suggesties

### Test Klant

```
Naam: Test Klant Bureau Vlieland
Bedrijf: Testbedrijf B.V.
Email: [jouw test email]
Telefoon: 0612345678
Groepsgrootte: 25
```

### Test Partner (gebruik bestaande of maak test)

```
Zoek partner via /admin/partners
Of gebruik "impersonate" functie als admin
```

---

## Uitvoering Instructies

1. **Voorbereiding**
   - Open twee browser windows (incognito voor klant, normaal voor admin/partner)
   - Zorg dat je toegang hebt tot de test email inbox

2. **Volgorde**
   - Start met Flow A (activiteiten) omdat die vollediger is
   - Voer Flow B (logies) daarna uit

3. **Logging**
   - Check `/admin/berichten` voor verzonden emails
   - Check `/admin/logs` voor systeem activiteit
   - Check browser console voor errors

4. **Bij problemen**
   - Check Edge Function logs via Cloud backend
   - Bekijk network requests in browser DevTools
   - Controleer database records direct

---

## Aanbevolen Testtools

| Tool | Gebruik |
|------|---------|
| Incognito browser | Klant flow testen |
| Email client | Ontvangen emails checken |
| Admin panel | Verificatie van data |
| Mailtrap/test inbox | Email catching |
