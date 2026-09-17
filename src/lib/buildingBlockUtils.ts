// Utility functions for building blocks
import { transformImageUrl, type TransformOptions } from "@/lib/supabaseImage";

import sealTour from "@/assets/seal-tour.jpg";
import speedboat from "@/assets/speedboat.jpg";
import cyclingTeam from "@/assets/cycling-team.jpg";
import surfActivity from "@/assets/surf-activity.jpg";
import beachActivity from "@/assets/beach-activity.jpg";
import sunsetDinner from "@/assets/sunset-dinner.jpg";
import lunchBuffet from "@/assets/lunch-buffet.jpg";
import lighthouseVlieland from "@/assets/lighthouse-vlieland.jpg";
import dunesGroup from "@/assets/dunes-group.jpg";
import kiteFlying from "@/assets/kite-flying.jpg";
import strandBbq from "@/assets/strand-bbq.jpg";
import silentDisco from "@/assets/silent-disco.jpg";
import outdoorDining from "@/assets/outdoor-dining.jpg";

import type { BuildingBlock } from "@/types/buildingBlock";

// Mapping of asset filenames to imported images
const assetMap: Record<string, string> = {
  "seal-tour.jpg": sealTour,
  "speedboat.jpg": speedboat,
  "cycling-team.jpg": cyclingTeam,
  "surf-activity.jpg": surfActivity,
  "beach-activity.jpg": beachActivity,
  "sunset-dinner.jpg": sunsetDinner,
  "lunch-buffet.jpg": lunchBuffet,
  "lighthouse-vlieland.jpg": lighthouseVlieland,
  "dunes-group.jpg": dunesGroup,
  "kite-flying.jpg": kiteFlying,
  "silent-disco.jpg": silentDisco,
  "outdoor-dining.jpg": outdoorDining,
  "strand-bbq.jpg": strandBbq,
};

/**
 * Get the image URL for a building block
 * Priority: image_url (storage) > image_asset (local) > placeholder
 */
/** Standaardbreedte voor bouwsteenfoto's op de site; groot genoeg voor een hero, klein genoeg voor mobiel. */
export const BLOCK_IMAGE_DEFAULT: TransformOptions = { width: 1200, quality: 78 };

/**
 * Foto van een bouwsteen. Storage-foto's gaan via de image-transformatie van
 * Supabase (verkleind en gecomprimeerd), zodat een upload van 6 MB niet als
 * 6 MB bij de bezoeker aankomt. Andere URL's en lokale assets blijven zoals ze zijn.
 */
export const getBlockImage = (block: BuildingBlock, transform: TransformOptions = BLOCK_IMAGE_DEFAULT): string => {
  // 1. Try storage URL — but ignore stale Vite build-hash paths like "/assets/foo-XYZ.jpg"
  //    (these are leftover from older deploys and no longer resolve).
  if (block.image_url && !/^\/assets\/.+-[A-Za-z0-9_]{6,}\.[a-z]+$/i.test(block.image_url)) {
    return transformImageUrl(block.image_url, transform);
  }

  // 2. Fallback to local asset
  if (block.image_asset && assetMap[block.image_asset]) {
    return assetMap[block.image_asset];
  }

  // 3. Placeholder
  return "/placeholder.svg";
};

/**
 * Get the provider name for display
 */
export const getProviderName = (block: BuildingBlock): string => {
  return block.provider?.name || "Bureau Vlieland";
};

/**
 * Check if a block is self-arranged
 */
export const isSelfArranged = (block: BuildingBlock): boolean => {
  return block.block_type === "self_arranged";
};
