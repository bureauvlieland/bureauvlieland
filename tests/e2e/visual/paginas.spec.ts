import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Visuele regressie van het ontwerpsysteem: één pagina per paginasoort, op
 * desktop en telefoon, vergeleken met de referentie in __snapshots__.
 *
 * Deterministisch gemaakt door:
 * - de klok vast te zetten (datumafhankelijke aanroepen, zoals de agenda);
 * - Supabase-antwoorden (REST en edge functions) af te spelen uit een
 *   HAR-opname per pagina in fixtures/ (opnemen: UPDATE_FIXTURES=1);
 * - foto's te vervangen door een effen plaatshouder (het logo en svg's
 *   blijven) en alle andere externe verzoeken te blokkeren; de lettertypes
 *   komen van de preview-server zelf (public/fonts), zodat de tekst altijd
 *   met dezelfde bestanden wordt gezet;
 * - `prefers-reduced-motion` aan te zetten, zodat animaties direct in hun
 *   eindstand staan.
 *
 * `maxHoogte` knipt lange catalogi af: onder die hoogte herhaalt de lijst
 * zichzelf en de voettekst staat al op de kortere pagina's. Zo blijven de
 * referentiebestanden klein.
 */
const PAGES: { name: string; path: string; wachtOp?: string; maxHoogte?: number }[] = [
  { name: "home", path: "/", wachtOp: "Wat klanten zeggen" },
  { name: "landing-bedrijfsuitje", path: "/bedrijfsuitje-vlieland" },
  { name: "activiteit-wadexcursie", path: "/wadlopen-vlieland" },
  { name: "werkwijze", path: "/onze-werkwijze" },
  { name: "contact", path: "/contact" },
  { name: "catering", path: "/catering" },
  { name: "logies", path: "/logies-vlieland" },
  { name: "bouwstenen", path: "/bouwstenen", wachtOp: "Aan programma toevoegen", maxHoogte: 8000 },
  { name: "voorbeeldprogrammas", path: "/voorbeeldprogrammas", wachtOp: "Bekijk programma" },
  { name: "voorbeeldprogramma-detail", path: "/voorbeeldprogrammas/eilanddag-compleet", wachtOp: "Programma per dag" },
  { name: "bouwsteen-detail", path: "/activiteit/zeehondentocht", wachtOp: "In het kort" },
  { name: "activiteiten-vlieland", path: "/activiteiten-vlieland", maxHoogte: 8000 },
  { name: "ontwerp", path: "/ontwerp" },
];

const VASTE_TIJD = new Date("2026-09-21T12:00:00+02:00");
const UPDATE_FIXTURES = process.env.UPDATE_FIXTURES === "1";
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

// 4x3 effen grijsblauwe PNG; `object-cover` vult er een hele kaart mee.
const PLAATSHOUDER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAEUlEQVR42mN4/OYjHDHg5AAAgx0hAUHt88wAAAAASUVORK5CYII=",
  "base64",
);

const isSupabaseData = (url: URL) => /\/(rest|functions)\/v1\//.test(url.pathname);

const maakDeterministisch = async (page: Page, harBestand: string) => {
  await page.clock.setFixedTime(VASTE_TIJD);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "cookie-consent",
        JSON.stringify({ necessary: true, analytics: false, marketing: false, timestamp: 1758456000000 }),
      );
    } catch {
      /* geen opslag */
    }
  });

  // Alles wat niet van de preview-server komt: Supabase-data naar de
  // HAR-route (hieronder), foto's naar de plaatshouder, de rest weg.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    const isFoto = route.request().resourceType() === "image" && !/logo|\.svg(\?|$)/i.test(url.pathname);
    if (isFoto || /\/storage\/v1\//.test(url.pathname)) {
      return route.fulfill({ contentType: "image/png", body: PLAATSHOUDER });
    }
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return route.continue();
    if (isSupabaseData(url)) return route.fallback();
    return route.abort();
  });

  await page.routeFromHAR(harBestand, {
    url: /\/(rest|functions)\/v1\//,
    update: UPDATE_FIXTURES,
    updateContent: "embed",
    updateMode: "minimal",
    notFound: "abort",
  });
};

for (const pagina of PAGES) {
  test(pagina.name, async ({ page }, testInfo) => {
    test.skip(UPDATE_FIXTURES && testInfo.project.name !== "desktop", "opnemen gebeurt alleen op desktop");

    const paginafouten: string[] = [];
    page.on("pageerror", (e) => paginafouten.push(String(e)));

    await maakDeterministisch(page, path.join(FIXTURES, `${pagina.name}.har`));
    await page.goto(pagina.path);

    await expect(page.locator("h1").first()).toBeVisible();
    if (pagina.wachtOp) await expect(page.getByText(pagina.wachtOp).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    // Lui geladen afbeeldingen aanspreken, dan terug naar boven.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });

    const overloop = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overloop, "geen horizontale overloop").toBeLessThanOrEqual(0);
    expect(paginafouten, "geen paginafouten").toEqual([]);

    // De eigen lettertypes moeten geladen zijn; anders vergelijkt de test terugvalfonts.
    const fontsGeladen = await page.evaluate(() => document.fonts.check('16px "Inter"') && document.fonts.check('16px "Fraunces"'));
    expect(fontsGeladen, "Inter en Fraunces geladen").toBe(true);

    const hoogte = await page.evaluate(() => document.documentElement.scrollHeight);
    const breedte = page.viewportSize()?.width ?? 0;
    const clip = pagina.maxHoogte && hoogte > pagina.maxHoogte ? { x: 0, y: 0, width: breedte, height: pagina.maxHoogte } : undefined;
    await expect(page).toHaveScreenshot(`${pagina.name}.png`, { fullPage: true, clip });
  });
}
