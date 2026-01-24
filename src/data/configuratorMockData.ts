// Mock data for the Program Configurator
// This will be replaced by database queries after design approval

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
import silentDisco from "@/assets/silent-disco.jpg";
import strandBBQ from "@/assets/outdoor-dining.jpg";

export type BlockCategory = "activiteiten" | "catering" | "vervoer";

// BlockType determines who invoices the customer
// "bureau" - Bureau Vlieland invoices (own activities + Zuiver catering)
// "partner" - Partner invoices customer directly (Bureau gets 10% commission)
// "self_arranged" - Customer arranges and pays themselves (Doeksen, bike rental)
export type BlockType = "bureau" | "partner" | "self_arranged";

export interface BuildingBlock {
  id: string;
  name: string;
  description: string;
  category: BlockCategory;
  priceIndication: string;
  priceNote?: string;
  image: string;
  provider: string;
  providerId: string;
  blockType: BlockType;
  externalUrl?: string; // Only shown after request is submitted
  duration?: string;
  minPeople?: number;
  maxPeople?: number;
}

export interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionPercentage: number;
}

// Cart item with preferred time and notes
export interface CartItemDetail {
  blockId: string;
  preferredTime: string | null; // e.g., "10:00" or null for "Flexibel"
  notes: string;
}

export interface ProgramRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string;
  startDate: Date | undefined;
  numberOfDays: number;
  numberOfPeople: number;
  notes: string;
  items: CartItemDetail[];
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

// Providers / Partners
export const providers: Provider[] = [
  {
    id: "zeehonden",
    name: "Zeehondentochten Vlieland",
    email: "info@zeehondentochten.nl",
    phone: "0562-451234",
    commissionPercentage: 10,
  },
  {
    id: "vliehors",
    name: "Vliehors Expres",
    email: "info@vliehorsexpres.nl",
    phone: "0562-451235",
    commissionPercentage: 10,
  },
  {
    id: "outdoor",
    name: "Vlieland Outdoor Center",
    email: "info@vlielandoutdoor.nl",
    phone: "0562-451236",
    commissionPercentage: 10,
  },
  {
    id: "fortuna",
    name: "Fortuna Vlieland",
    email: "info@fortunavlieland.nl",
    phone: "0562-451237",
    commissionPercentage: 10,
  },
  {
    id: "oliva",
    name: "Trattoria Oliva",
    email: "info@trattoriaoliva.nl",
    phone: "0562-451238",
    commissionPercentage: 10,
  },
  {
    id: "cafeboven",
    name: "Café Boven",
    email: "info@cafeboven.nl",
    phone: "0562-451239",
    commissionPercentage: 10,
  },
  {
    id: "zuiver",
    name: "Zuiver Traiteur",
    email: "info@zuiver-traiteur.nl",
    phone: "0562-451240",
    commissionPercentage: 0, // No commission
  },
  {
    id: "paal50",
    name: "Paal 50",
    email: "info@paal50.nl",
    phone: "0562-451241",
    commissionPercentage: 10,
  },
];

// Building Blocks
export const buildingBlocks: BuildingBlock[] = [
  // ACTIVITEITEN
  {
    id: "zeehondentocht",
    name: "Zeehondentocht",
    description: "Vaar naar de zeehondenbanken en spot deze prachtige dieren in hun natuurlijke habitat.",
    category: "activiteiten",
    priceIndication: "€ 35",
    priceNote: "p.p.",
    image: sealTour,
    provider: "Zeehondentochten Vlieland",
    providerId: "zeehonden",
    blockType: "partner",
    duration: "2-3 uur",
    minPeople: 10,
    maxPeople: 40,
  },
  {
    id: "rescueboat",
    name: "RescueBoat Transfer",
    description: "Spectaculaire aankomst op Vlieland met 60 km/u over de Waddenzee. Een onvergetelijke start!",
    category: "activiteiten",
    priceIndication: "€ 45",
    priceNote: "p.p.",
    image: speedboat,
    provider: "Vlieland Outdoor Center",
    providerId: "outdoor",
    blockType: "partner",
    duration: "30 min",
    minPeople: 8,
    maxPeople: 24,
  },
  {
    id: "vliehors-expres",
    name: "Vliehors Expres",
    description: "Ontdek de 'Sahara van het Noorden' per vrachtwagen. De ongerepte westkant van het eiland.",
    category: "activiteiten",
    priceIndication: "€ 25",
    priceNote: "p.p.",
    image: dunesGroup,
    provider: "Vliehors Expres",
    providerId: "vliehors",
    blockType: "partner",
    duration: "2 uur",
    minPeople: 15,
    maxPeople: 50,
  },
  {
    id: "surfen",
    name: "Surfles",
    description: "Leer surfen op de golven van de Noordzee met ervaren instructeurs. Voor beginners én gevorderden.",
    category: "activiteiten",
    priceIndication: "€ 55",
    priceNote: "p.p.",
    image: surfActivity,
    provider: "Vlieland Outdoor Center",
    providerId: "outdoor",
    blockType: "partner",
    duration: "2,5 uur",
    minPeople: 6,
    maxPeople: 20,
  },
  {
    id: "ebike-tour",
    name: "E-bike Tour",
    description: "Verken het hele eiland op een e-bike met gids. Door bossen, duinen en langs het strand.",
    category: "activiteiten",
    priceIndication: "€ 40",
    priceNote: "p.p. incl. e-bike",
    image: cyclingTeam,
    provider: "Vlieland Outdoor Center",
    providerId: "outdoor",
    blockType: "partner",
    duration: "3 uur",
    minPeople: 8,
    maxPeople: 30,
  },
  {
    id: "vliegeren",
    name: "Powerkiten / Vliegeren",
    description: "Leer vliegeren op het strand met professionele begeleiding. Spectaculair en toegankelijk voor iedereen.",
    category: "activiteiten",
    priceIndication: "€ 35",
    priceNote: "p.p.",
    image: kiteFlying,
    provider: "Vlieland Outdoor Center",
    providerId: "outdoor",
    blockType: "partner",
    duration: "1,5 uur",
    minPeople: 10,
    maxPeople: 40,
  },
  {
    id: "silent-disco",
    name: "Silent Disco Beach",
    description: "Dans op het strand met draadloze koptelefoons. Drie kanalen, één geweldig feest onder de sterren.",
    category: "activiteiten",
    priceIndication: "€ 20",
    priceNote: "p.p.",
    image: silentDisco,
    provider: "Fortuna Vlieland",
    providerId: "fortuna",
    blockType: "partner",
    duration: "2-3 uur",
    minPeople: 20,
    maxPeople: 150,
  },
  {
    id: "beach-games",
    name: "Beach Games",
    description: "Teambuilding activiteiten op het strand: beachvolleybal, strandgolf, estafettes en meer.",
    category: "activiteiten",
    priceIndication: "€ 30",
    priceNote: "p.p.",
    image: beachActivity,
    provider: "Vlieland Outdoor Center",
    providerId: "outdoor",
    blockType: "partner",
    duration: "2 uur",
    minPeople: 12,
    maxPeople: 60,
  },
  {
    id: "vuurtoren",
    name: "Vuurtorenbezoek",
    description: "Beklim de vuurtoren voor een adembenemend uitzicht over het eiland en de Waddenzee.",
    category: "activiteiten",
    priceIndication: "€ 8",
    priceNote: "p.p.",
    image: lighthouseVlieland,
    provider: "Fortuna Vlieland",
    providerId: "fortuna",
    blockType: "partner",
    duration: "1 uur",
    minPeople: 1,
    maxPeople: 25,
  },

  // CATERING
  {
    id: "strand-bbq",
    name: "Strand BBQ",
    description: "Complete BBQ op het strand met vlees, vis, salades en drankjes. Ultiem genieten met zonsondergang.",
    category: "catering",
    priceIndication: "€ 55",
    priceNote: "p.p.",
    image: strandBBQ,
    provider: "Zuiver Traiteur",
    providerId: "zuiver",
    blockType: "bureau", // Bureau Vlieland invoices Zuiver catering
    duration: "3 uur",
    minPeople: 20,
    maxPeople: 100,
  },
  {
    id: "luxe-lunch",
    name: "Luxe Lunchbuffet",
    description: "Uitgebreid lunchbuffet met broodjes, salades, soep en verse sapjes op locatie naar keuze.",
    category: "catering",
    priceIndication: "€ 32",
    priceNote: "p.p.",
    image: lunchBuffet,
    provider: "Zuiver Traiteur",
    providerId: "zuiver",
    blockType: "bureau", // Bureau Vlieland invoices Zuiver catering
    duration: "1,5 uur",
    minPeople: 15,
    maxPeople: 80,
  },
  {
    id: "sunset-dinner",
    name: "Sunset Dinner",
    description: "Stijlvol 3-gangen diner met zicht op de zonsondergang. Lokale ingrediënten, verfijnde gerechten.",
    category: "catering",
    priceIndication: "€ 65",
    priceNote: "p.p.",
    image: sunsetDinner,
    provider: "Trattoria Oliva",
    providerId: "oliva",
    blockType: "partner",
    duration: "2,5 uur",
    minPeople: 20,
    maxPeople: 50,
  },
  {
    id: "borrel",
    name: "Borrel & Hapjes",
    description: "Uitgebreide borrel met warme en koude hapjes, bieren, wijnen en fris. Perfect voor netwerken.",
    category: "catering",
    priceIndication: "€ 38",
    priceNote: "p.p.",
    image: sunsetDinner,
    provider: "Café Boven",
    providerId: "cafeboven",
    blockType: "partner",
    duration: "2 uur",
    minPeople: 15,
    maxPeople: 60,
  },

  // VERVOER
  {
    id: "boot-retour",
    name: "Doeksen Boot Retour",
    description: "Reguliere veerdienst Harlingen-Vlieland v.v. Je regelt dit zelf rechtstreeks bij Doeksen.",
    category: "vervoer",
    priceIndication: "€ 24",
    priceNote: "p.p. retour (indicatief)",
    image: speedboat,
    provider: "Rederij Doeksen",
    providerId: "doeksen",
    blockType: "self_arranged",
    externalUrl: "https://www.doeksen.nl", // Shown after request is submitted
    duration: "1,5 uur enkele reis",
  },
  {
    id: "fiets-huur",
    name: "Fietshuur",
    description: "Standaard fiets of e-bike voor de duur van jullie verblijf. Je regelt dit zelf bij de fietsverhuurder.",
    category: "vervoer",
    priceIndication: "€ 12",
    priceNote: "p.p. per dag (indicatief)",
    image: cyclingTeam,
    provider: "Fietsverhuur Vlieland",
    providerId: "fietsen",
    blockType: "self_arranged",
    externalUrl: "https://www.fietsverhuurvlieland.nl", // Shown after request is submitted
  },
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

// Helper function to get block by ID
export const getBlockById = (id: string): BuildingBlock | undefined => {
  return buildingBlocks.find((block) => block.id === id);
};

// Helper function to get provider by ID
export const getProviderById = (id: string): Provider | undefined => {
  return providers.find((provider) => provider.id === id);
};

// Category labels for display
export const categoryLabels: Record<BlockCategory, string> = {
  activiteiten: "Activiteiten",
  catering: "Catering",
  vervoer: "Vervoer",
};

// Category icons (as string references for lucide-react)
export const categoryIcons: Record<BlockCategory, string> = {
  activiteiten: "Compass",
  catering: "Utensils",
  vervoer: "Ship",
};

// Block type labels for display
export const blockTypeLabels: Record<BlockType, string> = {
  bureau: "Gefactureerd door Bureau Vlieland",
  partner: "Gefactureerd door aanbieder",
  self_arranged: "Zelf te regelen",
};

// Helper function to group blocks by block type
export const groupBlocksByType = (blocks: BuildingBlock[]) => {
  return {
    bureau: blocks.filter((b) => b.blockType === "bureau"),
    partner: blocks.filter((b) => b.blockType === "partner"),
    self_arranged: blocks.filter((b) => b.blockType === "self_arranged"),
  };
};
