/**
 * Helpers for serving Supabase Storage images via the on-the-fly
 * image transformation endpoint, so we can request right-sized
 * thumbnails (and srcSet variants) instead of always loading the
 * full-resolution original.
 */

const OBJECT_SEGMENT = "/storage/v1/object/public/";
const RENDER_SEGMENT = "/storage/v1/render/image/public/";

export interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 20-100
  resize?: "cover" | "contain" | "fill";
}

/**
 * Returns a transformed image URL when the source is a Supabase Storage
 * public URL. For any other URL (external CDN, data URIs, etc.) the
 * original is returned untouched.
 */
export function transformImageUrl(url: string, opts: TransformOptions = {}): string {
  if (!url || typeof url !== "string") return url;
  if (!url.includes(OBJECT_SEGMENT)) return url;

  const rendered = url.replace(OBJECT_SEGMENT, RENDER_SEGMENT);
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(Math.round(opts.width)));
  if (opts.height) params.set("height", String(Math.round(opts.height)));
  params.set("quality", String(opts.quality ?? 75));
  // "cover" snijdt bij naar het opgegeven kader. Met alleen een breedte (of
  // alleen een hoogte) neemt Supabase de andere maat van het origineel, en
  // dan wordt "cover" een smalle strook uit de foto in plaats van een
  // verkleining. Zonder beide maten dus altijd "contain": schalen met behoud
  // van de verhouding.
  const bothDimensions = !!opts.width && !!opts.height;
  params.set("resize", opts.resize ?? (bothDimensions ? "cover" : "contain"));

  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}${params.toString()}`;
}

/**
 * Build a srcSet string for a set of widths.
 */
export function buildSrcSet(
  url: string,
  widths: number[],
  opts: Omit<TransformOptions, "width"> = {},
): string | undefined {
  if (!url || !url.includes(OBJECT_SEGMENT)) return undefined;
  return widths
    .map((w) => `${transformImageUrl(url, { ...opts, width: w })} ${w}w`)
    .join(", ");
}

/**
 * Het origineel achter een render-URL, voor het geval Supabase de
 * transformatie weigert (bijvoorbeeld een bronfoto boven de resolutielimiet).
 * Voor andere URL's wordt null teruggegeven.
 */
export function originalImageUrl(url: string): string | null {
  if (!url || !url.includes(RENDER_SEGMENT)) return null;
  const withoutParams = url.split("?")[0];
  return withoutParams.replace(RENDER_SEGMENT, OBJECT_SEGMENT);
}

/**
 * Vangnet voor de hele site: laadt een verkleinde foto niet (Supabase geeft
 * een 400 voor te grote bronfoto's), dan toont de browser het origineel.
 * Eén listener op document, zodat elke <img> erdoor gedekt is, ook in de
 * toekomst. Geeft de opruimfunctie terug.
 */
export function installImageFallback(root: Document = document): () => void {
  const onError = (event: Event) => {
    const el = event.target as HTMLElement | null;
    if (!el || el.tagName !== "IMG") return;
    const img = el as HTMLImageElement;
    const original = originalImageUrl(img.currentSrc || img.src);
    if (!original || img.dataset.fallbackApplied === "1") return;
    img.dataset.fallbackApplied = "1";
    img.removeAttribute("srcset");
    img.src = original;
  };
  root.addEventListener("error", onError, true);
  return () => root.removeEventListener("error", onError, true);
}
