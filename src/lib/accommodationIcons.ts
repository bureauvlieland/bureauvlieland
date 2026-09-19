import {
  BedDouble,
  Croissant,
  Home,
  Hotel,
  LayoutGrid,
  Lightbulb,
  MapPin,
  MessageCircle,
  Soup,
  Store,
  Tent,
  TreePine,
  Umbrella,
  Users,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * Lijniconen voor de logieskeuzes (type verblijf, locatie, verzorging),
 * in plaats van de emoji's uit `src/types/accommodation.ts`. Emoji's worden
 * door elk besturingssysteem anders en in kleur getekend; Erwin vond ze
 * niet passen (19 september 2026). Onbekende waarden vallen terug op een
 * neutraal icoon, zodat een nieuwe optie nooit zonder icoon staat.
 */
export const ACCOMMODATION_TYPE_ICONS: Record<string, LucideIcon> = {
  hotel: Hotel,
  vacation_home: Home,
  group_accommodation: Users,
  camping: Tent,
  no_preference: LayoutGrid,
};

export const LOCATION_ICONS: Record<string, LucideIcon> = {
  village: Store,
  beach: Umbrella,
  nature: TreePine,
  no_preference: MapPin,
};

export const BOARD_ICONS: Record<string, LucideIcon> = {
  room_only: BedDouble,
  breakfast: Croissant,
  half_board: UtensilsCrossed,
  full_board: Soup,
  all_inclusive: Wine,
  other: MessageCircle,
  no_preference: Lightbulb,
};

export const accommodationTypeIcon = (value?: string | null): LucideIcon =>
  (value && ACCOMMODATION_TYPE_ICONS[value]) || LayoutGrid;
export const locationIcon = (value?: string | null): LucideIcon => (value && LOCATION_ICONS[value]) || MapPin;
export const boardIcon = (value?: string | null): LucideIcon => (value && BOARD_ICONS[value]) || BedDouble;
