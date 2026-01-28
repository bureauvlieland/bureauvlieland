
# Tekstanalyse: Aansluiting bij het Nieuwe Concept

## Samenvatting

Na analyse van alle publieke pagina's en componenten sluit de meerderheid goed aan bij het nieuwe concept. Er zijn echter enkele inconsistenties die aandacht verdienen.

---

## Wat al goed is

De volgende pagina's en componenten sluiten goed aan bij het nieuwe B2B-concept met self-service positionering:

| Pagina/Component | Status |
|------------------|--------|
| Homepage (Index.tsx) | Goed - CTA's zijn "Programma samenstellen" |
| Diensten.tsx | Goed - B2B focus |
| VoorWie.tsx | Goed - Alleen zakelijke doelgroepen |
| TrouwenOpVlieland.tsx | Goed - Duidelijke materiaal/logistiek afbakening |
| Samenwerken (Programmas.tsx) | Goed - White-label partner positionering |
| ForWho.tsx component | Goed - Zakelijke segmenten |
| Footer.tsx | Goed - "Direct aan de slag" sectie met configurator |
| ProgrammaSamenstellen.tsx | Goed - Self-service flow |

---

## Verbeterpunten

### 1. Testimonials.tsx - Bruiloftgetuigenis

**Probleem**: De getuigenis van "Daan en Nine - Bruidspaar" suggereert dat Bureau Vlieland volledige bruiloften organiseert:

> "Bureau Vlieland heeft voor ons de meest sprookjesachtige bruiloft aller tijden georganiseerd..."

Dit is inconsistent met het huidige concept waarin Bureau Vlieland expliciet GEEN weddingplanning doet, alleen materiaal en logistiek.

**Oplossing**: 
- Verwijderen van deze testimonial, of
- Vervangen door een zakelijke testimonial, of
- Herformuleren naar focus op materiaal/logistiek

---

### 2. CTA-structuur op landingspagina's

**Probleem**: Zeven landingspagina's hebben nog de oude CTA-structuur met focus op "offerte aanvragen" in plaats van self-service:

```
Huidige situatie:
- Primair: "Plan een vrijblijvend gesprek" (naar /contact)
- Secundair: "Vraag een voorstel aan" (naar /offerte)
```

Dit past niet bij het nieuwe "Jij kiest" self-service concept.

**Getroffen pagina's**:
1. BedrijfsuitjeVlieland.tsx
2. TeamuitjeVlieland.tsx
3. HeisessieVlieland.tsx
4. ZakelijkEvenementVlieland.tsx
5. MeerdaagsBedrijfsuitjeVlieland.tsx
6. IncentiveReisVlieland.tsx
7. BedrijfsuitjeIdeeenVlieland.tsx

**Voorgestelde nieuwe structuur**:
```
- Primair: "Stel je programma samen" (naar /programma-samenstellen)
- Secundair: "Liever persoonlijk advies?" (naar /contact)
```

---

### 3. Catering.tsx - Ontbrekende SEO en oude CTA

**Problemen**:
- Geen Helmet metadata (title/description ontbreken)
- CTA is "Vraag offerte aan" in plaats van configurator link
- Geen canonical URL

**Oplossing**:
- Helmet metadata toevoegen
- CTA aanpassen naar configurator of contact

---

### 4. Offerte.tsx pagina - Rol herdefiniëren

**Observatie**: De /offerte pagina bestaat naast de configurator, wat kan verwarren. 

**Overwegingen**:
- Deze pagina is bedoeld voor maatwerkaanvragen die niet via de configurator kunnen
- De positie als "secundaire" optie is correct
- Eventueel verduidelijken wanneer deze route te gebruiken (complexe programma's, grote groepen, speciale wensen)

---

## Implementatieplan

### Stap 1: Testimonials aanpassen
- Bruiloftgetuigenis verwijderen of vervangen door zakelijke testimonial

### Stap 2: CTA's op landingspagina's harmoniseren
Voor elk van de 7 landingspagina's de CTA-sectie aanpassen naar:
- Primair: "Stel je programma samen" met link naar /programma-samenstellen
- Secundair: "Liever persoonlijk advies?" met link naar /contact

### Stap 3: Catering pagina verbeteren
- Helmet metadata toevoegen met passende title en description
- CTA harmoniseren met rest van de site

---

## Technische details

### Bestandenlijst

| Bestand | Wijziging |
|---------|-----------|
| src/components/Testimonials.tsx | Bruiloftgetuigenis verwijderen/vervangen |
| src/pages/BedrijfsuitjeVlieland.tsx | CTA-sectie aanpassen |
| src/pages/TeamuitjeVlieland.tsx | CTA-sectie aanpassen |
| src/pages/HeisessieVlieland.tsx | CTA-sectie aanpassen |
| src/pages/ZakelijkEvenementVlieland.tsx | CTA-sectie aanpassen |
| src/pages/MeerdaagsBedrijfsuitjeVlieland.tsx | CTA-sectie aanpassen |
| src/pages/IncentiveReisVlieland.tsx | CTA-sectie aanpassen |
| src/pages/BedrijfsuitjeIdeeenVlieland.tsx | CTA-sectie aanpassen |
| src/pages/Catering.tsx | Helmet toevoegen, CTA aanpassen |

---

## Voorbeeld van nieuwe CTA-sectie

```tsx
{/* CTA Section */}
<section className="py-16 md:py-24 bg-primary text-primary-foreground">
  <div className="container mx-auto px-4 text-center">
    <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
      Klaar om te beginnen?
    </h2>
    <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
      Stel in 5 minuten je eigen programma samen. Kies je bouwstenen en ontvang 
      binnen 5 werkdagen bevestiging. Vrijblijvend en zonder verplichtingen.
    </p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button 
        asChild 
        size="lg" 
        variant="heroPrimary"
        className="text-lg px-8"
      >
        <Link to="/programma-samenstellen">Stel je programma samen</Link>
      </Button>
      <Button 
        asChild 
        size="lg" 
        variant="heroOutline"
        className="text-lg px-8"
      >
        <Link to="/contact">Liever persoonlijk advies?</Link>
      </Button>
    </div>
  </div>
</section>
```
