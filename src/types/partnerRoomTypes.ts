export interface PartnerRoomType {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  size_sqm: number | null;
  bed_configuration: string | null;
  max_occupancy: number;
  facilities: string[];
  images: { url: string; alt?: string }[];
  price_per_night: number | null;
  price_includes_vat: boolean;
  vat_rate: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PartnerRoomTypeInsert {
  partner_id: string;
  name: string;
  description?: string | null;
  size_sqm?: number | null;
  bed_configuration?: string | null;
  max_occupancy?: number;
  facilities?: string[];
  images?: { url: string; alt?: string }[];
  price_per_night?: number | null;
  price_includes_vat?: boolean;
  vat_rate?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface PartnerRoomTypeUpdate {
  name?: string;
  description?: string | null;
  size_sqm?: number | null;
  bed_configuration?: string | null;
  max_occupancy?: number;
  facilities?: string[];
  images?: { url: string; alt?: string }[];
  price_per_night?: number | null;
  price_includes_vat?: boolean;
  vat_rate?: number;
  is_active?: boolean;
  sort_order?: number;
}

export const ROOM_FACILITIES = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'tv', label: 'TV' },
  { value: 'balcony', label: 'Balkon' },
  { value: 'terrace', label: 'Terras' },
  { value: 'sea_view', label: 'Zeezicht' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'airco', label: 'Airconditioning' },
  { value: 'safe', label: 'Kluis' },
  { value: 'kettle', label: 'Waterkoker' },
  { value: 'coffee_machine', label: 'Koffiemachine' },
  { value: 'bath', label: 'Bad' },
  { value: 'shower', label: 'Douche' },
  { value: 'hairdryer', label: 'Haardroger' },
  { value: 'wheelchair', label: 'Rolstoeltoegankelijk' },
  { value: 'pets', label: 'Huisdieren toegestaan' },
] as const;

export const BED_CONFIGURATIONS = [
  { value: '1_single', label: '1 eenpersoonsbed' },
  { value: '2_single', label: '2 eenpersoonsbedden' },
  { value: '1_double', label: '1 tweepersoonsbed' },
  { value: '1_queen', label: '1 queensize bed' },
  { value: '1_king', label: '1 kingsize bed' },
  { value: '1_queen_2_single', label: '1 queensize + 2 eenpersoonsbedden' },
  { value: 'bunk', label: 'Stapelbedden' },
] as const;

export function getFacilityLabel(value: string): string {
  return ROOM_FACILITIES.find(f => f.value === value)?.label || value;
}

export function getBedConfigLabel(value: string): string {
  return BED_CONFIGURATIONS.find(b => b.value === value)?.label || value;
}
