

# Plan: Uitgebreide Partner Uitnodigingsmail

## Samenvatting

De huidige `partner_invitation` email template is kort en functioneel, maar mist de inhoudelijke briefing die nodig is om partners goed te informeren over de nieuwe werkwijze. Dit plan vervangt de template met een uitgebreide, professionele briefing die partners voorbereidt op de samenwerking.

---

## Huidige Situatie

De huidige template bevat alleen:
- Korte welkomstboodschap
- Opsomming van 4 features (activiteitsaanvragen, prijzen, facturen, bedrijfsgegevens)
- Link om wachtwoord in te stellen

**Wat ontbreekt:**
- Uitleg over de nieuwe digitale werkwijze
- Beschrijving van de klantflow (configurator → aanvraag → partner respons)
- Commissiemodel (15% activiteiten, 10% logies)
- Verwachtingen rondom reactietijd en activatie
- Collegiale toon die de langdurige relatie benadrukt

---

## Nieuwe Template Inhoud

### Structuur

```text
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Bureau Vlieland Partner Portaal                    │
├─────────────────────────────────────────────────────────────┤
│  1. Persoonlijke aanhef                                     │
│  2. Context: Evolutie van samenwerking, niet disruptie      │
│  3. Hoe het werkt:                                          │
│     - Klant stelt programma samen via configurator          │
│     - Partner ontvangt automatische aanvraag                │
│     - Partner reageert: Bevestigen / Alternatief / Afwijzen │
│  4. Facturatie & commissie:                                 │
│     - Partner factureert direct aan eindklant               │
│     - Bureau Vlieland stuurt periodieke commissiefactuur    │
│     - 15% op activiteiten, 10% op logies (excl. BTW)        │
│  5. Wat te doen nu:                                         │
│     - Account activeren (link)                              │
│     - Aanbod controleren en bijwerken                       │
│     - Binnen 14 dagen actief                                │
│  6. Afsluiting: Eerste jaar, feedback welkom                │
└─────────────────────────────────────────────────────────────┘
```

### Toonzetting

- Formeel Nederlands ("u" in plaats van "je") conform de projectrichtlijnen
- Collegiale en respectvolle toon
- Erkent langdurige samenwerking
- Positioneert digitalisering als verbetering, niet vervanging

---

## Technische Wijzigingen

### 1. Database Template Update

De `partner_invitation` template in de `email_templates` tabel wordt bijgewerkt met:

**Nieuw onderwerp:**
```
Welkom bij het Bureau Vlieland Partner Portaal - Uw digitale werkplek
```

**Nieuwe body_html:**
Uitgebreide HTML email met alle bovenstaande secties, professioneel opgemaakt met:
- Navy blue header (bestaande stijl)
- Duidelijke secties met iconen
- Overzichtelijke bullet points
- Call-to-action knop voor account activatie
- Commissiemodel in een highlighted box
- Afsluitende paragraaf over feedback en samenwerking

### 2. Extra Variabelen

Toevoegen aan de template variables:
- `partner_portal_link` (al beschikbaar in de code)

De bestaande variabelen (`partner_name`, `reset_link`) blijven behouden.

---

## Voorbeeld Sectie: Commissiemodel

```text
┌─────────────────────────────────────────────────────────────┐
│  💼 Facturatie & Commissie                                  │
├─────────────────────────────────────────────────────────────┤
│  U factureert uw diensten rechtstreeks aan de eindklant.    │
│                                                             │
│  Bureau Vlieland stuurt u periodiek een commissiefactuur    │
│  over de gerealiseerde omzet:                               │
│                                                             │
│  • Activiteiten: 15% commissie (excl. BTW)                  │
│  • Logies: 10% commissie (excl. BTW)                        │
│                                                             │
│  Deze commissie dekt de acquisitie, coördinatie en          │
│  klantenservice die Bureau Vlieland verzorgt.               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementatie

### Stap 1: Template Update Query
Een SQL update om de bestaande `partner_invitation` template te vervangen met de nieuwe, uitgebreide versie.

### Stap 2: Fallback Synchronisatie
De fallback template in `bulk-invite-partners/index.ts` en `invite-partner/index.ts` bijwerken zodat deze ook de uitgebreide versie gebruikt (voor het geval de database template niet beschikbaar is).

### Stap 3: Variables Array Update
De `variables` array in de database uitbreiden met eventuele nieuwe variabelen.

---

## Veiligheid & Testen

- **Preview modus actief:** Alle emails vanuit de lovable.app omgeving gaan naar erwin@bureauvlieland.nl
- **Subject prefix:** "[TEST]" wordt automatisch toegevoegd in preview
- **Na goedkeuring:** Template kan direct via Admin → Berichten worden bijgewerkt en getest

---

## Verwacht Resultaat

Partners ontvangen een complete, informatieve uitnodiging die:
1. De nieuwe werkwijze helder uitlegt
2. Vertrouwen wekt door transparantie over commissies
3. Concrete vervolgstappen geeft (activeren, aanbod bijwerken)
4. De collegiale relatie benadrukt

