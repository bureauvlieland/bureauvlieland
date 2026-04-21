

## Homepagina-aanpassingen op basis van feedback

Ik pak de zeven concrete punten aan, in volgorde van impact. Hieronder per punt wat er gebeurt en in welk bestand.

### 1. "Duplicate" voorbeeldprogramma-sectie (`ProgramTemplatesPreview.tsx`)
De sectie wordt maar één keer gerenderd, maar in de database hebben twee templates `sort_order = 0` ("Eilandbeleving Compleet" en "Relax and Enjoy Vlieland"). Daardoor lijken de eerste twee kaarten visueel op dubbele content. Oplossing:
- Limiet van 4 → **3 templates**, zodat het raster strakker oogt.
- Filter op `DISTINCT name` op clientzijde en sorteer secundair op `name` om herhaling te voorkomen.
- Migratie: `sort_order` van de twee `0`-templates corrigeren (`relax-and-enjoy-vlieland` → 1, rest +1).

### 2. Hero opschonen (`HeroEditorial.tsx`)
- Vuurtoren-foto (col-span-4) krijgt méér ademruimte: kolomverdeling wordt 7/4 met een `lg:gap-12` en `lg:pl-8` op de fotokolom; op tablets (md) blijft hij verborgen i.p.v. ingeklemd.
- Achtergrondfoto: `opacity-40` → `opacity-25` plus een sterker verticaal gradient zodat de tekst niet meer "doorloopt" op het personenbeeld. We voegen een extra `bg-ocean-deep/40` overlay achter het tekstblok toe (alleen op de tekstkolom, via een gemaskeerd panel).
- Coördinaten-meta blijft (werkt goed).

### 3. Stats-strip (`HeroEditorial.tsx`)
Vervang "1 telefoontje genoeg" door **"100% maatwerk"** — past bij de andere meetbare items en laat de "één aanspreekpunt"-belofte intact in `ErwinManifesto` en `FinalCTA`.

### 4. Bouwstenen-grid leesbaarheid (`ActivitiesShowcase.tsx`)
- Gradient-overlay versterken: van `from-ocean-deep via-ocean-deep/30 to-transparent` → `from-ocean-deep via-ocean-deep/70 to-ocean-deep/10` plus een extra constant `bg-ocean-deep/15` zodat tekst altijd contrast heeft.
- Truncatie "Wadlopexct…": de smalle `col-span-2` cel veroorzaakt clipping. Layout aanpassen naar veiligere proporties: `7/5`, `4/4/4`, `5/7`. Geen cellen smaller dan `col-span-4` op md+, en titels `break-words` + `pr-10` om ruimte voor het pijl-icoon te garanderen.

### 5. Manifesto-pijlers verzwaren (`ErwinManifesto.tsx`)
De drie kolommen "Lokaal / Eén regie / Op maat" krijgen meer visueel gewicht:
- Kop in `font-display text-2xl text-primary-foreground` (i.p.v. kleine sunset-caps).
- Body `text-base text-sand` (i.p.v. `text-sm text-sand/80`).
- Bovenrand met sunset-accent (`border-t-2 border-sunset/40 pt-4`), per kolom genummerd `01 / 02 / 03` in italic display-font.

### 6. Testimonials prioriteren (`Testimonials.tsx`)
- Volgorde: **Jort Kelder** als eerste kaart (herkenbare naam) met tag "Journalist & presentator" i.p.v. "Amsterdam".
- Districon Group als tweede; minder bekende namen achteraan.
- Geen nieuwe data toevoegen — alleen `testimonials`-array herschikken en Jort's `company`-veld bijwerken.

### 7. Tekstuele en kleine punten
- **Template "Relax and Enjoy Vlieland"** → migratie hernoemen naar **"Ontspannen Eilandweekend"** (NL, behoudt karakter). Slug blijft, alleen `name` wordt aangepast.
- **Footer copyright**: gebruikt al `new Date().getFullYear()`. De gebruiker zag waarschijnlijk een gecachte versie; geen wijziging nodig — dit bevestig ik in de samenvatting.
- **CTA's** blijven ongewijzigd (3× "Stel uw programma samen" werkt).
- **Typografie-mix** (serif italic accenten) consistent toepassen op vervolgpagina's: niet in deze ronde, wel als notitie voor later.

---

### Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/components/home/HeroEditorial.tsx` | Hero-compositie + stat-vervanging |
| `src/components/home/ActivitiesShowcase.tsx` | Layout-proporties + sterkere overlay |
| `src/components/home/ProgramTemplatesPreview.tsx` | Limit 3 + dedupe |
| `src/components/home/ErwinManifesto.tsx` | Drie pijlers groter & contrastrijker |
| `src/components/Testimonials.tsx` | Volgorde + Jort's tag |
| **Migratie** (nieuw SQL bestand) | `program_templates`: rename "Relax and Enjoy" + sort_order fix |

### Wat we NIET doen
- Geen nieuwe assets toevoegen (gebruiken bestaande hero/lighthouse/beach/Erwin foto's).
- Geen nieuwe componenten.
- Geen wijziging aan `Footer.tsx` (jaartal is al dynamisch).

