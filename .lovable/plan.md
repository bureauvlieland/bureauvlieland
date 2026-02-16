

## Plan: Prijsnotities links uitlijnen en overflow voorkomen

### Probleem
Op de Facturatie-tab lopen de omschrijvingen (admin_price_notes) onder de prijzen als een lange zin naar rechts uit het blok. Ze staan rechts uitgelijnd binnen het prijsblok en hebben geen tekstomloop.

### Oplossing
In beide componenten worden de notities:
- Links uitgelijnd op een eigen regel onder de activiteitnaam
- Voorzien van `break-words` zodat lange teksten netjes wrappen binnen het blok

### Wijzigingen

**1. `src/components/customer-portal/InvoiceProvidersCard.tsx`**
- De `admin_price_notes` paragrafen die nu in de `text-right shrink-0` div staan (bij de prijs) worden verplaatst naar buiten die div, op een eigen regel onder de flex-row
- Toevoegen van `break-words` class op alle `admin_price_notes` elementen
- Dit geldt voor 3 secties: bureau items (regel 163), bureau-central partner items (regel 203), en partner-direct items (regel 259)

**2. `src/components/customer-portal/PriceSummaryCard.tsx`**
- Toevoegen van `break-words` class op alle `admin_price_notes` paragrafen (regels 361, 379, 447)
- Deze staan al op een eigen regel, dus alleen de overflow-fix is nodig
