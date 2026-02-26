

# Geoptimaliseerde navigatiestructuur - 3 varianten

## Huidige situatie

De navigatie heeft **7 top-level elementen** plus een CTA-knop:

```text
[Logo] | Voor bedrijven v | Voor prive v | Logies | Diensten | Catering | Over ons v | [Start uw programma]
```

**Problemen:**
- Te veel keuzes op hetzelfde niveau (Hick's Law: meer opties = langzamere beslissing)
- "Diensten" en "Catering" zijn informatief maar nemen primaire ruimte in
- "Voorbeeldprogramma's" (social proof, hoge conversiewaarde) zit verstopt in een dropdown
- Geen direct contactkanaal (telefoon/WhatsApp)
- B2B en B2C krijgen gelijke visuele prioriteit terwijl B2B de primaire doelgroep is

---

## Variant A: "Funnel-first" (aanbevolen)

Maximale focus op conversie. Minder keuzes, sterkere hiërarchie.

```text
[Logo] | Bedrijfsuitjes v | Prive v | Inspiratie | Over ons v | 06-xxx | [Start uw programma]
```

**4 top-level items + telefoonnummer + CTA** (was 7)

| Element | Inhoud |
|---------|--------|
| Bedrijfsuitjes | Alle zakelijke landingspagina's (bedrijfsuitje, teambuilding, heisessie, etc.) |
| Prive | Trouwen, groepsweekend, jubileum, familieweekend |
| Inspiratie | Link naar /voorbeeldprogrammas (was verstopt in dropdown) |
| Over ons | Over Bureau Vlieland, Samenwerken, Contact |
| 06-xxx | Telefoonnummer als klikbare link (vertrouwen + direct contact) |
| CTA | "Start uw programma" (ongewijzigd) |

**Waar gaan Logies, Diensten en Catering?**
- "Logies" en "Catering" worden sub-items onder een mega-dropdown "Bedrijfsuitjes" of verhuizen naar de footer en relevante landingspagina's
- "Diensten" verdwijnt als top-level item; de inhoud is al beschikbaar via de homepage en landingspagina's

**Voordelen:** Minimale cognitieve belasting, telefoon wekt vertrouwen, voorbeeldprogramma's prominent
**Nadelen:** Logies en Catering minder vindbaar voor directe zoekers

---

## Variant B: "Gegroepeerd aanbod"

Consolideert het aanbod onder een enkel dropdown maar behoudt Logies als apart item (key revenue driver).

```text
[Logo] | Ons aanbod v | Logies | Inspiratie | Over ons v | [Bel ons] | [Start uw programma]
```

**4 top-level items + 2 knoppen** (was 7)

| Element | Inhoud |
|---------|--------|
| Ons aanbod | Mega-dropdown met 2 kolommen: "Voor bedrijven" (alle zakelijke pagina's) en "Voor prive" (trouwen, etc.) + onderaan: Diensten, Catering |
| Logies | Directe link (blijft prominent als key revenue driver) |
| Inspiratie | Link naar /voorbeeldprogrammas |
| Over ons | Over Bureau Vlieland, Samenwerken, Contact |
| Bel ons | Ghost-button met telefoonnummer of icoon |
| CTA | "Start uw programma" |

**Voordelen:** Logies blijft prominent, "Ons aanbod" geeft een compleet overzicht, minder top-level keuzes
**Nadelen:** Mega-dropdown kan overweldigend zijn als het niet goed is vormgegeven

---

## Variant C: "Doelgroep-gestuurd"

Behoudt de huidige doelgroep-scheiding maar comprimeert het aanbod.

```text
[Logo] | Voor bedrijven v | Voor prive v | Over ons v | 06-xxx | [Start uw programma]
```

**3 top-level items + telefoonnummer + CTA** (was 7)

| Element | Inhoud |
|---------|--------|
| Voor bedrijven | Alle zakelijke pagina's + Voorbeeldprogramma's bovenaan (highlighted) + Diensten + Catering als sub-items |
| Voor prive | Trouwen, groepsweekend, jubileum, familieweekend + Logies als sub-item |
| Over ons | Over Bureau Vlieland, Samenwerken, Contact |
| 06-xxx | Telefoonnummer |
| CTA | "Start uw programma" |

**Voordelen:** Heel weinig keuzes, gebruiker kiest meteen "ben ik zakelijk of prive?"
**Nadelen:** Logies en Catering zijn minder direct vindbaar; dropdown wordt langer

---

## Vergelijking

| Criterium | Variant A | Variant B | Variant C |
|-----------|-----------|-----------|-----------|
| Top-level items | 4 | 4 | 3 |
| Cognitieve belasting | Laag | Laag | Zeer laag |
| Logies vindbaar | Minder | Direct | In dropdown |
| Voorbeeldprogramma's | Prominent | Prominent | In dropdown |
| Telefoon zichtbaar | Ja | Ja | Ja |
| Complexiteit implementatie | Laag | Middel (mega-dropdown) | Laag |

---

## Technische aanpak (alle varianten)

Alleen het bestand `src/components/Navigation.tsx` wordt aangepast:

- Menu-items herstructureren volgens de gekozen variant
- Eventueel een mega-dropdown component toevoegen (variant B)
- Telefoonnummer toevoegen als `<a href="tel:+316...">` met Phone-icoon
- Mobiele navigatie meeveranderen (zelfde structuur, collapsible accordions)
- Geen database-wijzigingen, geen nieuwe routes

