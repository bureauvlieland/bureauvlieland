/**
 * Generates public/sitemap.xml at predev/prebuild time.
 *
 * Runs:
 *  - Static routes (handpicked, indexable public pages)
 *  - Dynamic /activiteit/<slug> for every published building block (minus hidden)
 *  - Wadlopen landing page
 *
 * Reads building_blocks via the public Supabase anon key (read-only).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://bureauvlieland.nl";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://blhspuifehausilnzwio.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaHNwdWlmZWhhdXNpbG56d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTM0NDAsImV4cCI6MjA3ODg4OTQ0MH0.shiugYb4lLf9KHksbfLx5bZYgtvfoGPSoWUyl3dONRI";

const HIDDEN_BLOCK_IDS = new Set([
  "boot-enkel-heen",
  "boot-enkel-terug",
  "boot-retour",
  "fiets-huur",
]);

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/onze-werkwijze", changefreq: "monthly", priority: "0.9" },
  { path: "/samenwerken", changefreq: "weekly", priority: "0.9" },
  { path: "/bouwstenen", changefreq: "weekly", priority: "0.9" },
  { path: "/voor-wie", changefreq: "monthly", priority: "0.8" },
  { path: "/over-ons", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/partners", changefreq: "weekly", priority: "0.7" },
  { path: "/catering", changefreq: "monthly", priority: "0.7" },
  { path: "/catering-aanvragen", changefreq: "monthly", priority: "0.6" },
  { path: "/voorbeeldprogrammas", changefreq: "weekly", priority: "0.8" },
  { path: "/evenementen", changefreq: "monthly", priority: "0.7" },
  
  // Landingspagina's
  { path: "/bedrijfsuitje-vlieland", changefreq: "monthly", priority: "0.9" },
  { path: "/teamuitje-vlieland", changefreq: "monthly", priority: "0.9" },
  { path: "/meerdaags-bedrijfsuitje-vlieland", changefreq: "monthly", priority: "0.8" },
  { path: "/heisessie-vlieland", changefreq: "monthly", priority: "0.8" },
  { path: "/bedrijfsuitje-ideeen-vlieland", changefreq: "monthly", priority: "0.7" },
  { path: "/incentive-reis-vlieland", changefreq: "monthly", priority: "0.7" },
  { path: "/groepsweekend-vlieland", changefreq: "monthly", priority: "0.7" },
  { path: "/jubileum-vlieland", changefreq: "monthly", priority: "0.7" },
  { path: "/familieweekend-vlieland", changefreq: "monthly", priority: "0.7" },
  { path: "/zakelijk-evenement-vlieland", changefreq: "monthly", priority: "0.7" },
  { path: "/wadlopen-vlieland", changefreq: "monthly", priority: "0.8" },
  { path: "/zeehondentochten-vlieland", changefreq: "monthly", priority: "0.8" },
  { path: "/activiteiten-vlieland", changefreq: "weekly", priority: "0.9" },
  // Juridische/utility-pagina's staan bewust NIET in de sitemap: ze zijn geen
  // zoekdoel en verdunnen het crawlbudget (Google zet ze op "gevonden, niet geïndexeerd").

  { path: "/veelgestelde-vragen", changefreq: "monthly", priority: "0.7" },
  { path: "/programma-samenstellen", changefreq: "weekly", priority: "0.9" },
  { path: "/programma-op-maat", changefreq: "monthly", priority: "0.8" },
  { path: "/logies-vlieland", changefreq: "monthly", priority: "0.7" },
  { path: "/activiteiten-boeken", changefreq: "weekly", priority: "0.8" },
  { path: "/offerte", changefreq: "monthly", priority: "0.8" },
];


/**
 * Haalt rijen op uit PostgREST. Werpt bij elke fout: een half opgehaalde
 * sitemap is erger dan geen nieuwe sitemap, want hij overschrijft een
 * correcte met een kortere en dat merkt niemand.
 */
async function fetchRows<T>(path: string, label: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status} ${await res.text().catch(() => "")}`.trim());
  }
  return res.json() as Promise<T[]>;
}

async function fetchBuildingBlockSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  const rows = await fetchRows<{ id: string; slug: string | null; updated_at: string }>(
    "building_blocks?select=id,slug,updated_at&status=eq.published",
    "building_blocks",
  );
  return rows
    .filter((r) => r.slug && !HIDDEN_BLOCK_IDS.has(r.id))
    .map((r) => ({ slug: r.slug!, updated_at: r.updated_at?.slice(0, 10) ?? today }));
}

function buildSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

async function fetchTemplateSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  const rows = await fetchRows<{ id: string; updated_at: string }>(
    "program_templates?select=id,updated_at&is_published=eq.true",
    "program_templates",
  );
  return rows.map((r) => ({ slug: r.id, updated_at: r.updated_at?.slice(0, 10) ?? today }));
}

/**
 * De dynamische bronnen leveren normaal tientallen pagina's. Leveren ze er
 * nul, dan is er iets mis met de bron, niet met de website — en overschrijven
 * we een goede sitemap met een die de helft van de vindbare pagina's mist.
 */
export function isSuspiciouslyEmpty(blockCount: number, templateCount: number): boolean {
  return blockCount === 0 && templateCount === 0;
}

async function main() {
  const [blocks, templates] = await Promise.all([fetchBuildingBlockSlugs(), fetchTemplateSlugs()]);

  if (isSuspiciouslyEmpty(blocks.length, templates.length)) {
    throw new Error(
      "geen enkele bouwsteen en geen enkel programma opgehaald - bron waarschijnlijk onbereikbaar",
    );
  }

  const blockEntries: SitemapEntry[] = blocks.map((b) => ({
    path: `/activiteit/${b.slug}`,
    lastmod: b.updated_at,
    changefreq: "monthly",
    priority: "0.7",
  }));
  const templateEntries: SitemapEntry[] = templates.map((t) => ({
    path: `/voorbeeldprogrammas/${t.slug}`,
    lastmod: t.updated_at,
    changefreq: "monthly",
    priority: "0.7",
  }));

  const all = [...staticEntries, ...blockEntries, ...templateEntries];
  const xml = buildSitemap(all);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${blockEntries.length} blocks + ${templateEntries.length} templates)`);
}

const isDirectRun =
  typeof process.argv[1] === "string" && import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) main().catch((err) => {
  // Bewust NIET stilzwijgend doorgaan. Een mislukte generatie die toch een
  // sitemap wegschreef, kostte ~50 vindbare pagina's zonder dat iemand het
  // zag. Nu blijft de bestaande sitemap staan en faalt de build luid.
  console.error("[sitemap] Generatie mislukt, bestaande sitemap.xml blijft staan:", err);

  // Ontsnapping voor werken zonder netwerk: dan wel doorgaan, maar zichtbaar.
  if (process.env.SITEMAP_ALLOW_STALE === "1") {
    console.warn("[sitemap] SITEMAP_ALLOW_STALE=1 gezet - doorgaan met de bestaande sitemap.");
    process.exit(0);
  }
  process.exit(1);
});
