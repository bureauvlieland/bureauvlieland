

# Plan: Partners importeren vanuit Excel

## Samenvatting
Importeer de leverancierslijst uit de Excel (43 bedrijven) naar de `partners` tabel. Dit omvat:
1. Bestaande partners bijwerken met ontbrekende gegevens
2. Nieuwe partners toevoegen met de juiste `partner_type`
3. Automatisch het type toewijzen op basis van de "Soort" kolom

---

## Analyse Excel vs Database

### Huidige partners (12 in database)
| Database ID | Naam | Match in Excel | Actie |
|-------------|------|----------------|-------|
| `bureau` | Bureau Vlieland | ✅ Ja | Update |
| `fortuna` | Brouwerij Fortuna | ✅ Ja (Fortvna Vlieland) | Update |
| `cafe-boven` | Café Boven | ✅ Ja (Trattoria Oliva & Café Boven) | Update |
| `fietsverhuur` | Fietsverhuur Jan Van Vlieland | ✅ Ja | Update |
| `rederij` | Rederij Doeksen | ✅ Ja | Update |
| `trattoria-oliva` | Trattoria Oliva | ✅ Ja | Update |
| `vliehors-expres` | Vliehors Expres | ✅ Ja | Update |
| `vlieland-outdoor-center` | Vlieland Outdoor Center | ✅ Ja | Update |
| `zeehonden` | Zeehondentochten Vlieland | ✅ Ja | Update |
| `zuiver` | Zuiver Traiteur | ✅ Ja | Update |
| `hotel-seeduyn` | Hotel Seeduyn | ✅ Ja (Westcord Strandhotel Seeduyn) | Update |
| `hotel-vlieland` | Strandhotel Vlieland | ❌ Niet gevonden | Geen actie |

### Nieuwe partners uit Excel (31 bedrijven)
Categorisering op basis van "Soort" en "Type" kolommen:

**Logies (11 nieuwe):**
- Badhotel Bruin (Hotel)
- De Herbergh van Flielant (Hotel)
- Het Vlielandhotel (Hotel)
- Hotel De Wadden (Hotel)
- Hotel Doniastate (Hotel)
- Kampeerterrein Stortemelk (Camping)
- Loodshotel (Hotel)
- Pension Hotelletje De Veerman (Hotel)
- Het Posthuys (Hotel)
- Vlierijck Appartementen (Hotel)
- Torenzicht (Groepsaccommodatie)
- Zeezicht Vlieland (Hotel)

**Activiteiten (20 nieuwe):**
- Badhuys Vlieland (Eten en drinken)
- Bagagevervoer Vlieland (Service)
- Bunkermuseum (Activiteit)
- De Bazuin Watertaxi (Vervoer)
- De Oude Stoep (Eten en drinken)
- De Vlielander Kaasbunker (Activiteit)
- Eetwinkeltje van Renee (Eten en drinken)
- Gerrit de Oesterman (Activiteit)
- Gestrand (Eten en drinken)
- Havenpaviljoen De Dining (Eten en drinken)
- Manege De Seeruyter (Activiteit)
- met Linde fotografie (Service)
- Paal 50 (Activiteit)
- Rederij Noordgat (Vervoer)
- Stichting Flidunen (Activiteit)
- Stichting Nicolaaskerk (Activiteit)
- Taxi van Koot (Service)
- TUKTUK Vlieland (Activiteit)
- Vlieland Yoga (Activiteit)
- Waddenrecreatiebedrijf Neptunus (Vervoer)
- Zuiver-Vlieland (Eten en drinken)

---

## Mapping: Excel Type → Partner Type

| Excel "Soort" | Partner Type |
|---------------|--------------|
| Logies | `accommodation` |
| Activiteiten | `activity_provider` |
| (Beide) | `both` |

| Excel "Type" (voor Logies) | accommodation_types |
|----------------------------|---------------------|
| Hotel | `["hotel"]` |
| Camping | `["camping"]` |
| Groepsaccommodatie | `["group"]` |

---

## Technische implementatie

### Stap 1: SQL Script genereren
Genereer INSERT/UPDATE statements voor alle partners:

```sql
-- Updates voor bestaande partners (ontbrekende gegevens aanvullen)
UPDATE partners SET 
  phone = '+31562700208',
  address_street = 'Sikkelduin 11',
  address_postal = '8899CG',
  address_city = 'Vlieland'
WHERE id = 'bureau' AND phone IS NULL;

-- Inserts voor nieuwe partners
INSERT INTO partners (id, name, email, phone, address_street, address_postal, address_city, partner_type, is_active)
VALUES 
  ('badhotel-bruin', 'Badhotel Bruin', 'receptie@badhotelbruin.com', NULL, 'Dorpsstraat 88', '8899AL', 'Vlieland', 'accommodation', true),
  ('gestrand', 'Gestrand B.V.', 'info@gestrandvlieland.nl', NULL, 'Havenweg 3 a', '8899BB', 'Vlieland', 'activity_provider', true),
  -- etc...
```

### Stap 2: ID generatie
Partner ID's worden gegenereerd volgens bestaand patroon:
- Naam in lowercase
- Spaties en speciale tekens vervangen door `-`
- Maximaal 30 karakters

Voorbeelden:
- "Badhotel Bruin" → `badhotel-bruin`
- "De Herbergh van Flielant V.O.F." → `de-herbergh-van-flielant`
- "Kampeerterrein Stortemelk" → `kampeerterrein-stortemelk`

### Stap 3: Data cleaning
- Telefoon formatteren (bijv. "0639269444" → "06 39 26 94 44")
- Email valideren en `<>` verwijderen
- Postcode formatteren (bijv. "8899AL" → "8899 AL")
- Plaatsnaam normaliseren (bijv. "VLIELAND" → "Vlieland")

---

## Commissie defaults

| Partner Type | Default commissie |
|--------------|-------------------|
| activity_provider | 15% |
| accommodation | 10% |
| both | 15% (activiteiten), 10% (logies) |

---

## Wat wordt NIET geïmporteerd

1. **Bureau Vlieland zelf** - Is al admin/eigenaar, niet als "partner"
2. Bedrijven zonder email-adres
3. Bedrijven buiten Vlieland (Harlingen, Terschelling) - optioneel (vervoerders zijn wel relevant)

---

## Uitvoering

### Bestanden die worden aangepast
Geen code-wijzigingen nodig - dit is een data-import via SQL migration.

### SQL Migration
Eén migratie met:
1. UPDATE statements voor bestaande partners
2. INSERT statements voor nieuwe partners
3. ON CONFLICT handling voor veilige re-runs

---

## Overzicht acties per partner

### Updates (11 partners)
| ID | Wat wordt bijgewerkt |
|----|---------------------|
| bureau | Telefoon, adres bijwerken |
| fortuna | Adres controleren |
| cafe-boven | Contactpersoon toevoegen |
| fietsverhuur | Adres bevestigen |
| rederij | Adres, email bijwerken |
| trattoria-oliva | Contactpersoon toevoegen |
| vliehors-expres | Email wijzigen naar hallo@paal50.nl |
| vlieland-outdoor-center | Adres bevestigen |
| zeehonden | Contactpersoon toevoegen |
| zuiver | Contactpersoon toevoegen |
| hotel-seeduyn | Naam, adres, email bijwerken |

### Nieuwe inserts (31 partners)
Alle bedrijven uit de Excel die nog niet in de database staan.

