## Root cause gevonden

Corrien Bakker en Judith Schoonhoven zijn **bekende klanten** — beiden hebben eerder een programma-aanvraag ingediend (Corrien 11 mei 2026, Judith 23 april 2026, óók een logies-aanvraag). Ze zijn geen kwaadwillende onbekenden.

**Waarom belanden ze op de Lovable-preview?** In `supabase/functions/_shared/email-templates.ts:198-209` staat:

```ts
export function getPortalBaseUrl(origin?: string): string {
  if (origin?.includes("bureauvlieland.nl")) return "https://bureauvlieland.nl";
  if (origin?.includes("lovable.app")) return origin;   // ← hier
  return "https://bureauvlieland.nl";
}
```

Als een klant een aanvraag doet vanaf `bureauvlieland.lovable.app` (of een `id-preview--…lovable.app` link die iemand ooit heeft doorgestuurd/gescreenshot), krijgt zij álle bevestigings- en portalmails terug met links die naar diezelfde `lovable.app`-URL wijzen. Klikt ze daarop, dan opent haar browser het project *binnen de Lovable-editor-shell* → daar ziet ze bovenin de knop "Verzoek toegang" en denkt dat dat bij haar klantpagina hoort.

Dit wordt door 24 edge functions gebruikt: `send-quote-offer`, `resend-customer-link`, `send-arrival-reminder`, `send-guest-details-reminder`, `accept-quote-proposal`, `cancel-program-request`, `publish-program-changes`, `send-project-email`, `notify-partner-*`, `send-items-to-partners`, `send-accommodation-*`, enz. — dus zowel klant- als partnermails.

## Voorstel

### Wijziging (1 bestand, ~5 regels)

`supabase/functions/_shared/email-templates.ts` — `getPortalBaseUrl` altijd `https://bureauvlieland.nl` laten retourneren voor productie-links, met alleen een expliciete uitzondering voor **lokale ontwikkeling** (`localhost`/`127.0.0.1`) zodat local dev nog werkt:

```ts
export function getPortalBaseUrl(origin?: string): string {
  // Local development only
  if (origin?.includes("localhost") || origin?.includes("127.0.0.1")) {
    return origin;
  }
  // Everything else (production, lovable preview, cron) → canonical domain
  return "https://bureauvlieland.nl";
}
```

**Effect:**
- Klanten en partners krijgen voortaan altijd `https://bureauvlieland.nl/…` in mails, ook als een admin per ongeluk via `bureauvlieland.lovable.app` iets triggert.
- Geen "Verzoek toegang"-knop meer voor eindgebruikers, want de Lovable-shell wordt niet meer geraakt.
- De `isTestMode()`-detectie (die op basis van origin het `[TEST]`-prefix zet en mails naar `TEST_EMAIL` reroutet) blijft onaangetast — die zit in een aparte functie en gebruikt dezelfde `origin`-parameter los.
- Preview-testen door admins: als je een testmail naar jezelf triggert vanaf `id-preview…lovable.app`, staat er nog steeds `[TEST]` in het onderwerp en gaat de mail naar het test-adres, maar de link erin wijst naar productie. Dat is acceptabel — je test doorgaans of de mail *verzonden* wordt, niet of de link naar de preview linkt.

### Corresponderende testupdate

`supabase/functions/_shared/email-templates.test.ts` — één test-case aanpassen die nu verwacht dat `getPortalBaseUrl("https://foo.lovable.app")` de lovable-URL retourneert. Vervangen door verwachting dat het `https://bureauvlieland.nl` retourneert. `localhost`-case toevoegen.

### Deploy

Na de wijziging: alle 24 gebruikers van `getPortalBaseUrl` opnieuw deployen zodat de nieuwe shared-helper live gaat. Deployment gebeurt via `deploy_edge_functions` in één batch.

### Wat gebeurt er met de twee openstaande verzoeken?

Los van deze code-fix: **klik "Decline all"** in het Share-menu. Corrien en Judith verliezen daar niets mee — hun klantportaal op `bureauvlieland.nl` blijft gewoon werken (dat staat volledig los van Lovable-project-access). Deze code-fix voorkomt dat het in de toekomst nog opnieuw gebeurt.

### Niet in scope (bewust)

- `PRODUCTION_DOMAINS`-array in `update-customer-program` en `publish-program-changes` (allow-list voor CORS/origin-check) — die mag `bureauvlieland.lovable.app` blijven bevatten, want dat is een backend-side check en heeft niets met linkgeneratie te maken.
- `social-meta-oauth-callback` `lovable.app`-referentie: dat is een OAuth-redirect voor social media login, geen klant-mail.
- `send-partner-mailing` `lovable.app`-check: gebruikt origin alleen om `isPreview` te bepalen voor test-routing, retourneert geen URL.

Zeg "ga" en ik voer het uit + deploy.
