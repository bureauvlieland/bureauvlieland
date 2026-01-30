
# Plan: Logies-wizard Koppelen aan Bestaand Klantprogramma

## Geïdentificeerde Problemen

1. **Datums niet ingevuld**: De "Logies laten regelen" knop in het klantportaal linkt naar `/logies-aanvragen` zonder URL parameters
2. **Contactgegevens ontbreken**: Klant moet opnieuw naam, email, telefoon invullen terwijl deze al bekend zijn
3. **Losse aanvraag**: De logiesaanvraag wordt niet gekoppeld aan het bestaande programma

---

## Oplossing

### A. AccommodationSection aanpassen

De link in `AccommodationSection.tsx` moet URL parameters meekrijgen:

```typescript
// Oud:
<Link to="/logies-aanvragen">

// Nieuw:
<Link to={buildLogiesUrl()}>
```

**Parameters die doorgegeven worden:**
- `arrival` - eerste datum uit selectedDates
- `departure` - laatste datum uit selectedDates  
- `guests` - aantal personen
- `programToken` - de huidige customer_token (voor koppeling)

### B. LogiesAanvragen pagina uitbreiden

Nieuwe URL parameter uitlezen:
```typescript
const programToken = searchParams.get("programToken");
```

Deze doorgeven aan AccommodationWizard.

### C. AccommodationWizard uitbreiden

**Nieuwe props:**
```typescript
interface AccommodationWizardProps {
  onSuccess?: (token: string) => void;
  initialData?: InitialData;
  fromConfigurator?: boolean;
  linkedProgramToken?: string;  // NIEUW
}

interface InitialData {
  arrival_date?: Date;
  departure_date?: Date;
  number_of_guests?: number;
  // NIEUW - contactgegevens
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_company?: string;
}
```

**Nieuwe logica:**

1. **Contactgegevens ophalen**: Als `linkedProgramToken` aanwezig is, fetch het programma en pre-fill de contactgegevens
2. **Koppeling maken**: Bij submit, update het bestaande programma met `linked_accommodation_id` in plaats van een nieuw programma te maken

### D. Edge function aanpassen (send-accommodation-request)

Als er een `linkedProgramToken` wordt meegegeven:
1. Zoek het bestaande programma op basis van de token
2. Update het programma met `linked_accommodation_id`
3. Maak GEEN nieuw programma aan (onderdruk de trigger of handel dit af in de edge function)

---

## Implementatiestappen

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/components/customer-portal/AccommodationSection.tsx` | Props uitbreiden, URL builder toevoegen met alle parameters |
| 2 | `src/components/customer-portal/DesktopProgramView.tsx` | Program data doorgeven aan AccommodationSection |
| 3 | `src/components/customer-portal/MobileProgramView.tsx` | Zelfde als desktop |
| 4 | `src/pages/LogiesAanvragen.tsx` | programToken parameter uitlezen en doorgeven |
| 5 | `src/components/accommodation/AccommodationWizard.tsx` | linkedProgramToken prop, contactgegevens ophalen en pre-fillen, koppellogica bij submit |
| 6 | `supabase/functions/send-accommodation-request/index.ts` | Koppeling met bestaand programma afhandelen |

---

## Technische Details

### AccommodationSection - URL Builder

```typescript
interface AccommodationSectionProps {
  // bestaande props...
  customerToken?: string;  // NIEUW
  customerName?: string;   // NIEUW
  customerEmail?: string;  // NIEUW
  customerPhone?: string;  // NIEUW
  customerCompany?: string; // NIEUW
  numberOfPeople?: number; // NIEUW
}

const buildLogiesUrl = () => {
  const params = new URLSearchParams();
  
  // Datums uit selectedDates of accommodation
  if (selectedDates.length > 1) {
    const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    params.set("arrival", format(sorted[0], "yyyy-MM-dd"));
    params.set("departure", format(sorted[sorted.length - 1], "yyyy-MM-dd"));
  }
  
  if (numberOfPeople) {
    params.set("guests", numberOfPeople.toString());
  }
  
  if (customerToken) {
    params.set("programToken", customerToken);
  }
  
  return `/logies-aanvragen?${params.toString()}`;
};
```

### AccommodationWizard - Fetch en Pre-fill

```typescript
useEffect(() => {
  if (linkedProgramToken) {
    // Fetch program data voor contactgegevens
    const fetchProgramData = async () => {
      const { data, error } = await supabase.functions.invoke("get-customer-program", {
        body: {},
        headers: {},
      });
      // ... maar we kunnen ook direct de tabel queryen met de token
    };
    fetchProgramData();
  }
}, [linkedProgramToken]);
```

### Submit Logica Aanpassing

```typescript
const handleSubmit = async () => {
  // Bij linkedProgramToken: koppel aan bestaand programma
  if (linkedProgramToken) {
    // 1. Maak accommodation_request aan met linked_program_id
    // 2. Update program_requests.linked_accommodation_id
    // 3. Redirect naar /mijn-programma/:linkedProgramToken
  } else {
    // Bestaande flow: nieuw programma wordt aangemaakt via trigger
  }
};
```

---

## Klant-ervaring na implementatie

```
SITUATIE: Klant heeft programma met activiteiten maar nog geen logies

1. Klant ziet "Logies" sectie met banner:
   "Meerdaags verblijf? Wij helpen graag met passende logies."
   [Logies laten regelen →]

2. Klant klikt op knop → navigeert naar /logies-aanvragen?arrival=2026-02-10&departure=2026-02-12&guests=20&programToken=abc123

3. Wizard opent met:
   ✓ Datums al ingevuld (10 feb - 12 feb 2026)
   ✓ Aantal personen al ingevuld (20)
   ✓ Banner: "Gegevens overgenomen uit uw programma"

4. Klant doorloopt wizard, bij stap 5 (Contactgegevens):
   ✓ Naam, e-mail, telefoon, bedrijf al ingevuld
   ✓ Klant hoeft alleen te controleren en verzenden

5. Na verzenden:
   → Logiesaanvraag gekoppeld aan bestaand programma
   → Redirect naar /mijn-programma/abc123 (ZELFDE token)
   → Klant ziet nu logies + activiteiten in één overzicht
```

---

## Randgevallen

### Klant wijzigt gegevens in wizard
- Gewijzigde contactgegevens worden NIET teruggezet op het programma
- Alleen de logiesaanvraag krijgt de nieuwe gegevens
- Dit is acceptabel: logies kan aparte contactpersoon hebben

### Programma heeft al logies
- AccommodationSection toont dan geen CTA maar de bestaande logiesaanvraag
- Dit wordt al correct afgehandeld door de bestaande state checks

### Token verlopen of ongeldig
- Fetch voor contactgegevens faalt
- Wizard werkt nog steeds, maar zonder pre-filled data
- Geen koppeling mogelijk, nieuwe losse aanvraag wordt gemaakt
