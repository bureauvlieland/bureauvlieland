

## Plan: Mail naar Zeezicht versturen + klantmelding verbeteren

### 1. Mail naar Zeezicht alsnog versturen

De code voor het versturen is net toegevoegd, maar was nog niet actief toen je het gastenaantal wijzigde. Ik kan de edge function direct aanroepen om de mail alsnog te versturen naar Zeezicht met de juiste inhoud over de wijziging.

**Actie**: `send-accommodation-quote-request` edge function aanroepen met:
- De huidige accommodation request ID
- Partner ID van Zeezicht
- Onderwerp en body over de gastenaantalwijziging

Hiervoor moet ik het request ID en partner ID ophalen uit de database.

### 2. Klantmelding contextueel maken

**Probleem**: Na het resetten van de offerte ziet de klant weer dezelfde generieke banner "Wij verzamelen offertes voor u" — alsof het een nieuwe aanvraag is. De klant (Milou) heeft al een offerte gekozen en weet niet waarom die weg is.

**Oplossing**: `AccommodationStatusBanner.tsx` uitbreiden met een "heraanvraag" status die verschijnt wanneer er eerder een offerte was geselecteerd maar nu is gereset.

Detectie: als er een quote bestaat met `status = "pending"` die eerder `"selected"` was (te herkennen aan `selected_at` datum die gevuld is, of via `program_request_history` met `action = "people_changed"`).

Eenvoudiger: check of `request.status === "processing"` en er een history-event `people_changed` bestaat. Of — het simpelst — kijk of er quotes met `submitted_at` in het verleden zijn die nu `status = "pending"` hebben (= ze waren eerder ingediend, nu gereset).

**Nieuwe banner-variant** (amber, maar met andere tekst):
> "Het aantal gasten is gewijzigd. Bureau Vlieland heeft de accommodatie gevraagd om een aangepaste offerte in te dienen. U ontvangt bericht zodra deze binnen is."

### Bestanden
1. Edge function call (via tooling) — mail naar Zeezicht versturen
2. `src/components/accommodation-portal/AccommodationStatusBanner.tsx` — contextuele melding bij herofferte

