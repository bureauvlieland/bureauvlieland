// Building Block types matching the database schema

export type BuildingBlockCategory = "activiteiten" | "catering" | "vervoer";
export type BuildingBlockType = "bureau" | "partner" | "self_arranged";
export type BuildingBlockPriceType = "per_person" | "total" | "per_hour" | "per_day" | "on_request";

export interface BuildingBlock {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  
  // Categorization
  category: BuildingBlockCategory;
  block_type: BuildingBlockType;
  
  // Partner link
  provider_id: string | null;
  provider?: {
    id: string;
    name: string;
  } | null;
  
  // Capacity
  min_people: number | null;
  max_people: number | null;
  duration: string | null;
  
  // Pricing - Adult
  price_adult: number | null;
  price_adult_note: string | null;
  price_type: BuildingBlockPriceType | null;
  
  // Pricing - Child
  price_child: number | null;
  price_child_note: string | null;
  price_child_min_age: number | null;
  price_child_max_age: number | null;
  
  // Pricing - Pet
  price_pet: number | null;
  price_pet_note: string | null;
  
  // Pricing - Display options
  is_from_price: boolean;
  price_display_override: string | null;
  price_extras: Record<string, unknown>;
  
  // Self-arranged specific
  external_url: string | null;
  
  // Images
  image_url: string | null;
  image_asset: string | null;
  
  // Publication status
  is_published: boolean;
  is_active: boolean;
  sort_order: number;
  
  // Extra metadata
  tags: string[] | null;
  seasonal_notes: string | null;
  
  // Audit
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuildingBlockFormData {
  id: string;
  name: string;
  description: string;
  short_description: string;
  category: BuildingBlockCategory;
  block_type: BuildingBlockType;
  provider_id: string;
  min_people: number | null;
  max_people: number | null;
  duration: string;
  price_adult: number | null;
  price_adult_note: string;
  price_type: BuildingBlockPriceType;
  price_child: number | null;
  price_child_note: string;
  price_child_min_age: number;
  price_child_max_age: number;
  price_pet: number | null;
  price_pet_note: string;
  is_from_price: boolean;
  price_display_override: string;
  external_url: string;
  image_url: string;
  image_asset: string;
  is_published: boolean;
  is_active: boolean;
  sort_order: number;
  tags: string[];
  seasonal_notes: string;
}

// Category labels for display
export const categoryLabels: Record<BuildingBlockCategory, string> = {
  activiteiten: "Activiteiten",
  catering: "Catering",
  vervoer: "Vervoer",
};

// Block type labels for display
export const blockTypeLabels: Record<BuildingBlockType, string> = {
  bureau: "Bureau Vlieland",
  partner: "Partner",
  self_arranged: "Zelf te regelen",
};

// Price type labels for display
export const priceTypeLabels: Record<BuildingBlockPriceType, string> = {
  per_person: "Per persoon",
  total: "Totaalprijs",
  per_hour: "Per uur",
  per_day: "Per dag",
  on_request: "Op aanvraag",
};
