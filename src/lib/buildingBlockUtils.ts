// Utility functions for building blocks

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
export const getBlockImage = (block: BuildingBlock): string => {
  // 1. Try storage URL
  if (block.image_url) return block.image_url;
  
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
