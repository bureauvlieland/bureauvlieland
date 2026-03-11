

# Fix: Algemene voorwaarden link opent in nieuw tabblad

## Probleem

De link naar `/algemene-voorwaarden` in het contactformulier navigeert weg van de configurator. Bij terugkeer wordt de `phase` state gereset naar `"basics"` of `"program"` — het contactformulier is weg. De cart-data zit wel in localStorage (auto-save), maar de fase niet.

## Oplossing

Simpelste en beste fix: open de voorwaardenlink in een nieuw tabblad (`target="_blank"`). Dit voorkomt dat de gebruiker de configurator verlaat.

Aanvullend: zelfde fix toepassen op de voorwaardenlink in `StepContact.tsx` (logies-aanvraag) en `CookieConsent.tsx`.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/configurator/CheckoutContactForm.tsx` | `target="_blank" rel="noopener noreferrer"` op voorwaardenlink |
| `src/components/accommodation/steps/StepContact.tsx` | Idem |
| `src/components/CookieConsent.tsx` | Idem |

