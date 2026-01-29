

## Hybride Navigatiemodel voor Bureau Vlieland

Dit plan beschrijft de complete herstructurering van de navigatie en sitearchitectuur naar een hybride model dat zowel de bureau-identiteit als de platform-mogelijkheden combineert.

---

### Samenvatting van wijzigingen

De nieuwe navigatiestructuur:

```text
HOOFDMENU (links)              RECHTS
---------------------          ----------------------
Voor bedrijven (dropdown)      Contact (outline button)
Voor privé & trouwen (dropdown)    Programma samenstellen (primary CTA)
Programma samenstellen (link)
Logies (link)
Over ons (dropdown)
```

---

### Fase 1: Nieuwe Pagina's Aanmaken

Drie nieuwe SEO-landingspagina's voor de "Voor privé & trouwen" sectie:

| Pagina | Route | Beschrijving |
|--------|-------|--------------|
| Groepsweekend Vlieland | `/groepsweekend-vlieland` | Vrienden, verenigingen, sportclubs |
| Jubileum Vlieland | `/jubileum-vlieland` | Verjaardagen, jubilea, pensioenfeesten |
| Familieweekend Vlieland | `/familieweekend-vlieland` | Familie-reünies, grote familieuitjes |

Elke pagina volgt dezelfde structuur als bestaande landingspagina's:
- Hero sectie met relevante afbeelding
- Breadcrumb navigatie
- Gestructureerde data (JSON-LD)
- Twee CTA's onderaan: "Zelf samenstellen" en "Maatwerk aanvragen"

---

### Fase 2: Navigatie Component Herstructureren

De `Navigation.tsx` wordt volledig herschreven met de nieuwe menustructuur:

**1. Voor bedrijven (dropdown)**
```text
├─ Bedrijfsuitje Vlieland (highlighted)
├─ Meerdaags bedrijfsuitje
├─ Teambuilding
├─ Heisessie
├─ Zakelijk evenement
└─ Incentive reis
```

**2. Voor privé & trouwen (dropdown)**
```text
├─ Trouwen op Vlieland
├─ Groepsweekend (NIEUW)
├─ Jubileum (NIEUW)
└─ Familieweekend (NIEUW)
```

**3. Programma samenstellen**
- Direct link naar `/programma-samenstellen`
- Geen dropdown

**4. Logies**
- Direct link naar `/logies-vlieland`
- Geen dropdown

**5. Over ons (dropdown)**
```text
├─ Over Bureau Vlieland
├─ Werkwijze
├─ Samenwerken
├─ Partners (→ horeca links)
└─ Contact
```

---

### Fase 3: CTA-structuur Harmoniseren

Alle zakelijke en privé landingspagina's krijgen dezelfde dubbele CTA-structuur:

```text
┌─────────────────────────────────────────┐
│  Klaar om te beginnen?                  │
│                                         │
│  [Stel je programma samen]  [Maatwerk]  │
│       (primary)              (outline)  │
└─────────────────────────────────────────┘
```

Dit wordt toegepast op:
- Alle "Voor bedrijven" pagina's (7 stuks)
- Alle "Voor privé & trouwen" pagina's (4 stuks)

---

### Fase 4: Footer Aanpassen

De footer wordt gereorganiseerd om de nieuwe structuur te weerspiegelen:

```text
Kolom 1: Contact + socials
Kolom 2: Zakelijke uitjes (bestaand)
Kolom 3: Privé & trouwen (NIEUW)
Kolom 4: Direct aan de slag (Programma samenstellen, Maatwerkofferte)
Kolom 5: Over ons + Online Boeken + Partners
```

---

### Fase 5: App.tsx Routes Toevoegen

Nieuwe routes toevoegen:
```typescript
<Route path="/groepsweekend-vlieland" element={<GroepsweekendVlieland />} />
<Route path="/jubileum-vlieland" element={<JubileumVlieland />} />
<Route path="/familieweekend-vlieland" element={<FamilieweekendVlieland />} />
```

---

### Fase 6: Redirects Updaten

`public/_redirects` uitbreiden voor eventuele legacy-links.

---

### Fase 7: Taalkundige Aanpassingen

Conform de strategie-instructies worden termen aangepast:
- "Diensten" → verdwijnt uit navigatie (te generiek)
- "Bouwstenen" → alleen binnen de tool, niet in navigatie
- "Catering" → binnen zakelijke context, niet los
- Alle labels: oplossingsgerichte formulering

---

### Technisch Overzicht

**Nieuwe bestanden:**
```text
src/pages/GroepsweekendVlieland.tsx
src/pages/JubileumVlieland.tsx
src/pages/FamilieweekendVlieland.tsx
```

**Aangepaste bestanden:**
```text
src/components/Navigation.tsx (volledig herschreven)
src/components/Footer.tsx (kolommen gereorganiseerd)
src/App.tsx (3 nieuwe routes)
public/_redirects (optioneel)
```

**Pagina's met CTA-update:**
- `TrouwenOpVlieland.tsx` - CTA's aanpassen
- Bestaande zakelijke pagina's behouden hun huidige CTA's

---

### Visuele Hiërarchie

```text
Desktop navigatie:
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo]  Voor bedrijven ▾  Voor privé ▾  Samenstellen  Logies  Over ▾│ Contact  [Programma samenstellen]
└──────────────────────────────────────────────────────────────────────┘

- "Voor bedrijven" krijgt font-weight: semibold
- "Programma samenstellen" CTA rechts blijft accent-kleur
- "Logies" iets minder prominent (geen bold)
```

---

### Impact op SEO

De nieuwe structuur verbetert de interne linkstructuur:
- Duidelijke hiërarchie voor zoekmachines
- Thematische clustering (zakelijk vs. privé)
- Sterke interne links via dropdowns

---

### Niet inbegrepen in dit plan

- Inhoudelijke wijzigingen aan bestaande pagina's (behalve CTA's)
- Verwijdering van de `/diensten` of `/voor-wie` pagina's (blijven bestaan voor SEO)
- Wijzigingen aan de configurator

