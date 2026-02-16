/**
 * Helper utilities for loading images into jsPDF-compatible base64 strings.
 */

const LOAD_TIMEOUT_MS = 5_000;

/**
 * Load an image URL and return a JPEG base64 data-URI string.
 * Returns null on any error (CORS, 404, timeout).
 */
export const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
};

/**
 * Build a static map URL for given coordinates using OpenStreetMap.
 */
export const getStaticMapUrl = (lat: number, lng: number): string =>
  `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x200&markers=${lat},${lng},red-pushpin`;

export interface PreloadedItemImages {
  activityImage: string | null;
  mapImage: string | null;
}

/**
 * Preload activity image + static map for a single program item.
 * Resolves the image from image_url or image_asset (via assetMap lookup).
 */
export const preloadItemImages = async (item: {
  image_url?: string | null;
  image_asset?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}, resolveAsset?: (asset: string) => string | null): Promise<PreloadedItemImages> => {
  // Determine activity image URL
  let activityUrl: string | null = null;
  if (item.image_url) {
    activityUrl = item.image_url;
  } else if (item.image_asset && resolveAsset) {
    activityUrl = resolveAsset(item.image_asset);
  }

  // Determine map URL
  let mapUrl: string | null = null;
  if (item.location_lat && item.location_lng) {
    mapUrl = getStaticMapUrl(item.location_lat, item.location_lng);
  }

  const [activityImage, mapImage] = await Promise.all([
    activityUrl ? loadImageAsBase64(activityUrl) : Promise.resolve(null),
    mapUrl ? loadImageAsBase64(mapUrl) : Promise.resolve(null),
  ]);

  return { activityImage, mapImage };
};
