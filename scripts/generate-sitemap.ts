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
  { path: "/algemene-voorwaarden", changefreq: "yearly", priority: "0.3" },
  { path: "/partner-voorwaarden", changefreq: "yearly", priority: "0.3" },
].map((e) => ({ ...e, lastmod: today }));

async function fetchBuildingBlockSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/building_blocks?select=id,slug,updated_at&status=eq.published`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn(`[sitemap] Building-blocks fetch failed: ${res.status}`);
      return [];
    }
    const rows: Array<{ id: string; slug: string | null; updated_at: string }> = await res.json();
    return rows
      .filter((r) => r.slug && !HIDDEN_BLOCK_IDS.has(r.id))
      .map((r) => ({ slug: r.slug!, updated_at: r.updated_at?.slice(0, 10) ?? today }));
  } catch (e) {
    console.warn("[sitemap] Could not fetch building blocks:", e);
    return [];
  }
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

async function main() {
  const blocks = await fetchBuildingBlockSlugs();
  const blockEntries: SitemapEntry[] = blocks.map((b) => ({
    path: `/activiteit/${b.slug}`,
    lastmod: b.updated_at,
    changefreq: "monthly",
    priority: "0.7",
  }));

  const all = [...staticEntries, ...blockEntries];
  const xml = buildSitemap(all);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${blockEntries.length} blocks)`);
}

main().catch((err) => {
  console.error("[sitemap] Generation failed:", err);
  process.exit(0); // Don't break dev/build on sitemap failure
});
