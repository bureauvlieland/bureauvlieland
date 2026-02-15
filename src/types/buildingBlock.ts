// Building Block types matching the database schema

export type BuildingBlockCategory = "outdoor" | "excursies" | "entertainment" | "locaties" | "catering" | "vervoer" | "services" | "overig" | "activiteiten";
export type BuildingBlockType = "bureau" | "partner" | "self_arranged";
export type BuildingBlockPriceType = "per_person" | "total" | "on_request";
export type BuildingBlockStatus = "concept" | "active" | "published";

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
  
  // BTW information
  price_includes_vat: boolean | null;
  vat_rate: number | null;
  
  // Images
  image_url: string | null;
  image_asset: string | null;
  
  // Publication status
  status: BuildingBlockStatus;
  is_published: boolean;
  is_active: boolean;
  sort_order: number;
  
  // Location
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  
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
  price_includes_vat: boolean;
  vat_rate: number;
  image_url: string;
  image_asset: string;
  is_published: boolean;
  is_active: boolean;
  sort_order: number;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string;
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

// Time slots for preferred time selector (5-minute intervals)
export const timeSlots: { value: string; label: string }[] = [
  { value: "flexibel", label: "Flexibel" },
  ...Array.from({ length: (21 - 8) * 12 + 1 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 5;
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mins = String(totalMinutes % 60).padStart(2, "0");
    const value = `${hours}:${mins}`;
    return { value, label: value };
  }),
];

// Fee tiers based on group size (Coordinatiefee)
export const bureauFeeTiers = [
  { minPeople: 1, maxPeople: 10, feeAmount: 50 },
  { minPeople: 11, maxPeople: 25, feeAmount: 100 },
  { minPeople: 26, maxPeople: 100, feeAmount: 250 },
  { minPeople: 101, maxPeople: 150, feeAmount: 350 },
  { minPeople: 151, maxPeople: 9999, feeAmount: 500 },
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

// Status labels for display
export const statusLabels: Record<BuildingBlockStatus, string> = {
  concept: "Concept",
  active: "Actief",
  published: "Gepubliceerd",
};

// Category labels for display
export const categoryLabels: Record<BuildingBlockCategory, string> = {
  outdoor: "Outdoor & Sport",
  excursies: "Excursies",
  entertainment: "Entertainment",
  locaties: "Locaties",
  catering: "Catering",
  vervoer: "Vervoer",
  services: "Services",
  overig: "Overig",
  activiteiten: "Activiteiten",
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
  on_request: "Op aanvraag",
};
