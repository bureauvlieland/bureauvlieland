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
  params.set("resize", opts.resize ?? "cover");

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
