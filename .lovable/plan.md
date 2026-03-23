

## Plan: Offerte-dialoog en portal-link verduidelijken

### Probleem

De admin ziet in de offerte-preview niet dat de klant een portal-link krijgt. De standaardtekst zegt vaag "via de knop in de e-mail" maar toont de URL niet. Dit creëert onzekerheid over de workflow.

### Aanpassingen

**1. `AdminSendQuoteDialog.tsx` — Portal-URL zichtbaar maken in preview**

- De `portalUrl` prop wordt al meegegeven maar niet gebruikt in het dialoog
- In de preview-modus: onder de e-mailtekst een duidelijke indicatie tonen dat de "Bekijk voorstel"-knop met portal-link automatisch wordt toegevoegd door de template
- De huidige vage melding "De volledige e-mail wordt opgemaakt vanuit de database-template" vervangen door een concreter blokje dat laat zien:
  - ✅ "Bekijk voorstel"-knop wordt automatisch toegevoegd
  - Link: `[portal URL]` (klikbaar, zodat admin kan verifiëren)
  - Programmadetails-tabel wordt automatisch toegevoegd

**2. `AdminSendQuoteDialog.tsx` — Standaardtekst verbeteren**

- De zin "U kunt het voorstel bekijken en akkoord geven via de knop in de e-mail" aanpassen naar iets explicieter, bijv.: "U kunt het volledige voorstel bekijken en akkoord geven via onderstaande knop."
- Dit sluit beter aan bij de HTML-template waar de CTA-knop direct onder de persoonlijke tekst staat

**3. Geen wijzigingen nodig aan edge function of database-template**

De `send-quote-offer` edge function bouwt de portal-URL correct op (`/mijn-programma/{customer_token}`) en de HTML-template bevat al de CTA-knop. Dit werkt goed.

### Technische details

Wijzigingen alleen in `src/components/admin/AdminSendQuoteDialog.tsx`:

1. Preview-footer (regel ~289-291): vervang de vage italic tekst door een gestructureerd blokje met portal-link info
2. `getDefaultIntro()` (regel ~87): tekst aanpassen
3. De `portalUrl` prop wordt al doorgegeven — deze gebruiken om de link te tonen in de preview

### Samenvatting workflow (ter bevestiging)

```text
Programma aanmaken → items toevoegen
        ↓
Publiceren naar klant → portaal wordt "live" (geen e-mail)
        ↓
Offerte versturen → e-mail met "Bekijk voorstel" knop + portal-link
        ↓
Klant opent portaal → kan akkoord geven
```

Alles werkt correct; alleen de admin-preview geeft onvoldoende zicht op wat de klant ontvangt.

