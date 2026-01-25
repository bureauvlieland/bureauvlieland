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
    email?: string;
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

// Cart item with preferred time, notes, and day assignment
export interface CartItemDetail {
  blockId: string;
  preferredTime: string | null; // e.g., "10:00" or null for "Flexibel"
  notes: string;
  dayIndex: number; // 0-based index: 0 = first date, 1 = second date, etc.
}

// Time slots for preferred time selector
export const timeSlots = [
  { value: "flexibel", label: "Flexibel" },
  { value: "08:00", label: "08:00" },
  { value: "08:30", label: "08:30" },
  { value: "09:00", label: "09:00" },
  { value: "09:30", label: "09:30" },
  { value: "10:00", label: "10:00" },
  { value: "10:30", label: "10:30" },
  { value: "11:00", label: "11:00" },
  { value: "11:30", label: "11:30" },
  { value: "12:00", label: "12:00" },
  { value: "12:30", label: "12:30" },
  { value: "13:00", label: "13:00" },
  { value: "13:30", label: "13:30" },
  { value: "14:00", label: "14:00" },
  { value: "14:30", label: "14:30" },
  { value: "15:00", label: "15:00" },
  { value: "15:30", label: "15:30" },
  { value: "16:00", label: "16:00" },
  { value: "16:30", label: "16:30" },
  { value: "17:00", label: "17:00" },
  { value: "17:30", label: "17:30" },
  { value: "18:00", label: "18:00" },
  { value: "18:30", label: "18:30" },
  { value: "19:00", label: "19:00" },
  { value: "19:30", label: "19:30" },
  { value: "20:00", label: "20:00" },
  { value: "20:30", label: "20:30" },
  { value: "21:00", label: "21:00" },
];

// Fee tiers based on group size
export const bureauFeeTiers = [
  { minPeople: 1, maxPeople: 20, feeAmount: 75 },
  { minPeople: 21, maxPeople: 40, feeAmount: 125 },
  { minPeople: 41, maxPeople: 60, feeAmount: 175 },
  { minPeople: 61, maxPeople: 100, feeAmount: 225 },
  { minPeople: 101, maxPeople: 9999, feeAmount: 275 },
];

// Helper function to calculate bureau fee
export const calculateBureauFee = (numberOfPeople: number): number => {
  const tier = bureauFeeTiers.find(
    (t) => numberOfPeople >= t.minPeople && numberOfPeople <= t.maxPeople
  );
  return tier?.feeAmount || 275;
};

// Helper function to format price for display
export const formatBlockPrice = (block: BuildingBlock): string => {
  if (block.price_display_override) return block.price_display_override;
  if (block.price_adult === null) return "Op aanvraag";
  
  const prefix = block.is_from_price ? "vanaf " : "";
  const price = `€ ${block.price_adult.toFixed(0).replace(".", ",")}`;
  
  return `${prefix}${price}`;
};

// Helper function to format price note
export const formatPriceNote = (block: BuildingBlock): string => {
  if (block.price_adult_note) return block.price_adult_note;
  
  switch (block.price_type) {
    case "per_person": return "p.p.";
    case "per_day": return "per dag";
    case "per_hour": return "per uur";
    case "total": return "totaal";
    default: return "";
  }
};

// Helper function to calculate indicative total for a list of blocks
export const calculateIndicativeTotal = (blocks: BuildingBlock[], numberOfPeople: number): number => {
  return blocks.reduce((total, block) => {
    // Skip self_arranged blocks (user pays externally)
    if (block.block_type === "self_arranged") return total;
    // Skip blocks without a price
    if (block.price_adult === null) return total;
    
    // Calculate based on price type
    switch (block.price_type) {
      case "per_person":
        return total + (block.price_adult * numberOfPeople);
      case "total":
      case "per_day":
      case "per_hour":
        return total + block.price_adult;
      default:
        return total;
    }
  }, 0);
};

// Helper function to group blocks by block type
export const groupBlocksByType = (blocks: BuildingBlock[]) => {
  return {
    bureau: blocks.filter((b) => b.block_type === "bureau"),
    partner: blocks.filter((b) => b.block_type === "partner"),
    self_arranged: blocks.filter((b) => b.block_type === "self_arranged"),
  };
};

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
