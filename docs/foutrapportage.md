# Foutrapportage

Tot nu toe verdwenen fouten in de browserconsole van de klant: als er iets
misging, hoorden we dat pas als iemand belde. Dit document beschrijft het
meldpunt dat daarvoor in de plaats komt.

## Aanzetten

Zonder configuratie verandert er niets: fouten gaan naar de console, precies
zoals voorheen, en er vertrekt geen enkel netwerkverzoek.

Zet één omgevingsvariabele om meldingen ook echt te ontvangen:

```
VITE_SENTRY_DSN=https://<publieke-sleutel>@<host>/<project-id>
```

Optioneel:

```
VITE_RELEASE=2026-09-03-a   # koppelt een regressie aan een specifieke deploy
```

De DSN is een *publieke* sleutel — die hoort in de frontend en is geen geheim.

## Gebruik in code

```ts
import { reportError } from "@/lib/errorReporting";

try {
  await betaalVerzoekVersturen(order);
} catch (err) {
  reportError(err, { where: "PartnerFinance: betaalverzoek", orderId: order.id });
  toast.error("Versturen mislukt");
}
```

`reportError` logt **altijd** naar `console.error`, dus het vervangt die
aanroep één-op-één. De tweede parameter is vrije context; `where` wordt
gebruikt om fouten te groeperen, dus houd die stabiel en beschrijvend.

Gebruik `addBreadcrumb("stap")` om vast te leggen wat aan een fout voorafging.
De laatste 20 stappen gaan als aanloop mee.

## Wat er automatisch gevangen wordt

| Soort fout | Vangnet |
|---|---|
| Crash tijdens renderen | `ErrorBoundary` — voorkomt het witte scherm |
| Losse exception | `window.onerror` |
| Niet-afgehandelde promise | `unhandledrejection` |
| Afgevangen fout in code | `reportError` op de plek zelf |

De grenzen staan op drie plekken: rond de hele app (`root`), rond de routes
(`route`, herstelt vanzelf bij wegnavigeren) en rond de chatwidget
(`presales-chat`, die mag de pagina nooit meeslepen).

## Wat er níet verstuurd wordt

Klantportaal- en partner-URL's bevatten toegangstokens in het pad. Wie zo'n
token heeft, kan bij de gegevens van die klant. Daarom worden ze geredigeerd
vóór verzending — zie `scrubUrl` in `src/lib/errorReporting.ts`:

- tokensegmenten na `/mijn-programma/`, `/programma-deelnemers/`,
  `/mijn-logies/`, `/concept/`, `/programma/` en `/partner/`
- queryparameters met `token`, `key`, `secret`, `password`, `auth`,
  `signature` of `code` in de naam
- het volledige URL-fragment (`#...`)

Zet je hier een nieuwe route met een token bij, vul dan
`TOKEN_PATH_PREFIXES` aan en voeg een test toe in
`src/lib/__tests__/errorReporting.test.ts`.

## Waarom geen Sentry-SDK

De lockfiles van dit project verwijzen naar een private registry; een extra
npm-pakket zou `install --frozen-lockfile` in CI breken. Het transport in
`errorReporting.sentry.ts` praat daarom rechtstreeks met de envelope-API van
Sentry — zo'n 130 regels, met tests op het HTTP-contract.

Wil je later alsnog de volledige SDK (sessies, source maps, performance), dan
vervang je alleen die factory. `reportError` en alle aanroepplekken blijven
ongewijzigd. Datzelfde geldt als je naar een andere leverancier wilt: één
regel in `errorReporting.init.ts`.

## Grenzen van deze stap

- Zonder source maps zijn stacktraces van de productiebundel beperkt leesbaar.
  Source maps uploaden is een losse vervolgstap.
- Buiten de kritieke paden (financieel, partner, klantportaal, e-mail) staan
  nog `console.error`-aanroepen die niet gemeld worden. Omzetten kan met
  hetzelfde patroon als hierboven.
