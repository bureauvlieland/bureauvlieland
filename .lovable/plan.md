

## Plan: Offerte-disclaimer teksten corrigeren

### Probleem
Op de offerte-preview staan twee zinnen die suggereren dat de klant pas na akkoord toegang krijgt tot de klantomgeving. In werkelijkheid krijgt de klant via de link in de offerte-email direct al toegang.

### Wijzigingen

**`src/pages/admin/AdminQuotePreview.tsx`**

Twee teksten worden aangepast:

1. **Regel 853** (blauwe indicatief-blok):
   - Was: "Na uw akkoord nemen wij contact op met de betrokken partners om beschikbaarheid en definitieve prijzen te bevestigen. U kunt de voortgang hiervan volgen in uw persoonlijke klantomgeving."
   - Wordt: "Na uw akkoord nemen wij contact op met de betrokken partners om beschikbaarheid en definitieve prijzen te bevestigen. U kunt de voortgang hiervan volgen in uw klantomgeving."
   - Deze zin klopt inhoudelijk al grotendeels, alleen het woord "persoonlijke" wordt verwijderd voor consistentie.

2. **Regel 868-870** (amber logiesaanvraag-blok):
   - Was: "Na uw akkoord ontvangt u toegang tot uw klantomgeving waar u de bevestigingen van partners kunt volgen."
   - Wordt: "U kunt de status van deze aanvraag volgen in uw klantomgeving."
   - De suggestie dat toegang pas na akkoord komt wordt volledig verwijderd.

