
# Plan: Email Leesbaarheid, Naamswijziging, Maatwerk Toevoeging & Partner Handleidingen

## Samenvatting

Dit plan lost vier problemen op:
1. **Leesbaarheid emails** - Header tekst en button zijn nauwelijks zichtbaar
2. **Naamswijziging** - "Erwin Bontje" → "Erwin Soolsma"
3. **Maatwerk programma's** - Toevoegen dat Bureau Vlieland ook maatwerk maakt via het portaal
4. **Partner Handleidingen** - Nieuwe pagina met documentatie voor partners

---

## Stap 1: Email Leesbaarheid Verbeteren

### Geïdentificeerde Problemen

Op basis van de screenshot:
- **Header**: Witte/lichte tekst op lichtgrijze gradient is onleesbaar
- **CTA Button**: De "Account Activeren" knop is nauwelijks zichtbaar
- **Sectie headers**: Groene tekst op groene achtergrond (ecfdf5) is te zacht

### Aanpassingen per Template

**Partner Invitation Template (database + fallbacks):**

| Element | Huidige stijl | Nieuwe stijl |
|---------|--------------|--------------|
| Header achtergrond | linear-gradient #1e3a5f → #2d5a87 | Solid #1e3a5f (donkerder navy) |
| Header tekst | white + rgba(255,255,255,0.9) | white + white (volle opacity) |
| "Hoe werkt het" sectie | bg #f8fafc, tekst #1e3a5f | bg #eef4fa, tekst #1e3a5f (donkerder) |
| "Wat kunt u nu doen" sectie | bg #ecfdf5, tekst #065f46 | bg #d1fae5, tekst #064e3b (donkerder) |
| CTA Button | gradient + box-shadow | Solid #1e3a5f + dikker padding |

**Alle Email Templates:**
- Controleer alle templates in de database op contrast problemen
- Specifiek aanpassen: teal headers (#0f766e) zijn goed, deze blijven

---

## Stap 2: Naamswijziging

### Locaties met "Erwin Bontje"

1. **Database template**: `partner_invitation` - regel 107
2. **Edge function fallback**: `invite-partner/index.ts` - regel 125
3. **Edge function fallback**: `bulk-invite-partners/index.ts` - regel 134

### Wijziging

```
Erwin Bontje → Erwin Soolsma
```

---

## Stap 3: Maatwerk Programma's Toevoegen

### Nieuwe Sectie in Partner Invitation

Na de "Hoe werkt het?" sectie, toevoegen:

**Nieuwe tekst:**
```
Naast programma's die klanten zelf samenstellen, gebruiken wij het portaal 
ook voor maatwerk programma's die we op verzoek van de klant uitwerken. 
De werkwijze voor aanvragen en facturatie blijft hetzelfde.
```

### Locaties

- Database template: `partner_invitation`
- Fallback in `invite-partner/index.ts`
- Fallback in `bulk-invite-partners/index.ts`

---

## Stap 4: Partner Handleidingen Pagina

### Nieuwe Route

`/partner/handleidingen` - Toegankelijk via de partner sidebar

### Pagina Structuur

```text
┌─────────────────────────────────────────────────────────────┐
│  Partner Handleidingen                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 Aan de slag                                             │
│  ├─ Account activeren                                       │
│  ├─ Wachtwoord wijzigen                                     │
│  └─ Bedrijfsgegevens bijwerken                              │
│                                                             │
│  📨 Aanvragen verwerken                                     │
│  ├─ Nieuwe aanvraag ontvangen                               │
│  ├─ Aanvraag bevestigen                                     │
│  ├─ Alternatief voorstellen                                 │
│  ├─ Niet beschikbaar melden                                 │
│  └─ Reageren op tegenvoorstel                               │
│                                                             │
│  📅 Beschikbaarheid beheren                                 │
│  ├─ Niet-beschikbare periodes instellen                     │
│  └─ Beschikbaarheid per activiteit                          │
│                                                             │
│  💰 Facturatie                                              │
│  ├─ Factuur registreren                                     │
│  ├─ Commissiepercentages                                    │
│  ├─ Overzicht commissies                                    │
│  └─ Uitbetaling door Bureau Vlieland                        │
│                                                             │
│  🏨 Logies (voor logiespartners)                            │
│  ├─ Offerte indienen                                        │
│  ├─ Offerte wijzigen                                        │
│  └─ Kamerindeling opgeven                                   │
│                                                             │
│  ❓ Veelgestelde vragen                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Inhoud per Sectie

**Aan de slag:**
- Stap-voor-stap uitleg account activatie
- Waar instellingen te vinden
- Hoe beschikbaarheid in te stellen

**Aanvragen verwerken:**
- Uitleg van elk status type
- Wat de klant ziet na reactie
- Tijdlijnen en verwachtingen

**Beschikbaarheid beheren:**
- Hoe blokken aan te maken/verwijderen
- Relatie met automatische aanvragen

**Facturatie:**
- Uitleg commissiemodel (15% activiteiten, 10% logies)
- Hoe factuur te registreren
- Wanneer commissie wordt afgerekend
- Referentienummers op facturen

**Logies:**
- Alleen zichtbaar voor logiespartners
- Offerte flow uitleg
- Kamerindeling optie

**Veelgestelde vragen:**
- "Wat als ik per ongeluk een aanvraag afwijs?"
- "Hoe kan ik mijn commissiepercentage aanpassen?"
- "Wat gebeurt er als de klant annuleert?"

### Technische Implementatie

1. **Nieuwe pagina**: `src/pages/PartnerGuides.tsx`
2. **Layout**: Gebruikt `PartnerLayout` voor consistentie
3. **Navigatie**: Toevoegen aan sidebar in `PartnerLayout.tsx`
4. **Routing**: Toevoegen aan `App.tsx`

---

## Implementatie Volgorde

### Fase 1: Database Template Update
SQL UPDATE voor `partner_invitation` met:
- Verbeterde kleuren/contrast
- Naam wijziging
- Maatwerk sectie toevoeging

### Fase 2: Edge Function Fallbacks
Update beide fallback templates in:
- `supabase/functions/invite-partner/index.ts`
- `supabase/functions/bulk-invite-partners/index.ts`

### Fase 3: Partner Handleidingen
1. Creëer `src/pages/PartnerGuides.tsx`
2. Update `PartnerLayout.tsx` met nieuwe menu-item
3. Update `App.tsx` met route

### Fase 4: Deploy & Test
- Deploy edge functions
- Test email via preview (gaat naar jouw emailadres)
- Controleer handleidingen pagina

---

## Bestanden die worden gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/invite-partner/index.ts` | Fallback template: contrast, naam, maatwerk |
| `supabase/functions/bulk-invite-partners/index.ts` | Fallback template: contrast, naam, maatwerk |
| `src/pages/PartnerGuides.tsx` | **Nieuw**: Handleidingen pagina |
| `src/components/partner-portal/PartnerLayout.tsx` | Sidebar menu uitbreiden |
| `src/App.tsx` | Route toevoegen |
| Database `email_templates` | Template update via SQL |

---

## Handleidingen Content (Excerpt)

### Aanvraag Bevestigen

> Wanneer u een aanvraag bevestigt, ontvangt de klant direct een bevestigingsmail. 
> De activiteit wordt in hun programma gemarkeerd als "Bevestigd".
>
> **Let op:** Na bevestiging kunt u de datum/tijd niet meer wijzigen. 
> Neem bij wijzigingen contact op met Bureau Vlieland.

### Commissiemodel

> Bureau Vlieland rekent commissie over de door u gefactureerde omzet (excl. BTW):
>
> - **Activiteiten**: 15% commissie
> - **Logies**: 10% commissie
>
> U factureert rechtstreeks aan de eindklant. Bureau Vlieland stuurt u periodiek 
> een commissiefactuur op basis van de geregistreerde facturen in het portaal.
