## Wat er speelt

De WhatsApp-knoppen linken nu naar `https://wa.me/31562700208?text=...`. Op desktop stuurt `wa.me` door naar `api.whatsapp.com/send`, en die pagina weigert te laden zodra de navigatie *niet* in een echt nieuw tabblad gebeurt (bijvoorbeeld binnen een iframe zoals het Lovable-preview­venster, of wanneer de popup geblokkeerd wordt). Dat geeft precies `ERR_BLOCKED_BY_RESPONSE`.

Bevestigd in de code:
- `src/components/site/PreSalesChatWidget.tsx` — twee knoppen (regel 163 en 215) met `wa.me`-link.
- `src/pages/VeelgesteldeVragen.tsx` (regel 258) — zelfde soort link.
- `src/components/configurator/ShareProgramDialog.tsx` en `src/components/customer-portal/ShareWithParticipantsDialog.tsx` gebruiken `window.open("https://wa.me/?text=...")` voor delen — zelfde risico.

## Wat ik ga bouwen

1. **Eén hulpmodule** `src/lib/whatsappLink.ts`
   - `buildWhatsAppHref({ phone, text })`: kiest automatisch de juiste variant.
     - Desktop → `https://web.whatsapp.com/send?phone=...&text=...` (opent WhatsApp Web/Desktop en wordt niet geblokkeerd).
     - Mobiel/tablet → `https://wa.me/<nummer>?text=...` (opent de app).
   - `openWhatsApp(href)`: opent via `window.open(href, "_blank", "noopener")` en valt terug op `window.top`-navigatie als de popup geblokkeerd wordt, zodat er nooit een dood tabblad ontstaat.

2. **Widget aanpassen** (`PreSalesChatWidget.tsx`)
   - Beide WhatsApp-knoppen gebruiken de nieuwe helper.
   - Fallback-regel eronder: het telefoonnummer als klikbare `tel:`-link plus een "kopieer nummer"-knop, zodat de bezoeker altijd verder kan als WhatsApp niet opent.

3. **Overige plekken gelijktrekken**
   - FAQ-pagina en de twee deel-dialogen (configurator + klantportaal) gaan door dezelfde helper, zodat er één gedrag is.

4. **Test**
   - Vitest-test op `buildWhatsAppHref`: juiste host per user-agent, nummer zonder `+`/spaties, tekst correct ge-encodeerd, en delen-zonder-nummer (alleen tekst) blijft werken.

## Technische noot

`web.whatsapp.com/send` is de door WhatsApp bedoelde desktop-ingang en stelt geen frame-blokkerende headers in op de doorstuur, waardoor de melding verdwijnt. In het preview-venster van Lovable blijft een echte app-koppeling beperkt (iframe), maar met de popup-fallback krijgt de bezoeker daar nu een werkende link in plaats van een foutpagina; op de live site werkt het volledig.
