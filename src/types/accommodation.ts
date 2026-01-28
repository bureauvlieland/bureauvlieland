// Accommodation types for the logies aanvraag system

export type AccommodationType = 'hotel' | 'vacation_home' | 'group_accommodation' | 'camping' | 'no_preference';

export type AccommodationRequestStatus = 'draft' | 'submitted' | 'processing' | 'quoted' | 'accepted' | 'cancelled' | 'expired';

export type AccommodationQuoteStatus = 'pending' | 'submitted' | 'selected' | 'rejected' | 'expired';

export interface AccommodationRequest {
  id: string;
  customer_token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  
  // Dates and guests
  arrival_date: string;
  departure_date: string;
  number_of_guests: number;
  
  // Accommodation preferences
  accommodation_type: AccommodationType;
  room_count: number | null;
  room_occupancy: string | null;
  room_types: string[];
  
  // Location and facilities
  location_preference: string[];
  facilities_required: string[];
  
  // Budget and wishes
  budget_range: string | null;
  special_requests: string | null;
  
  // Program integration
  wants_activities: boolean;
  linked_program_id: string | null;
  
  // Status
  status: AccommodationRequestStatus;
  admin_notes: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface AccommodationQuote {
  id: string;
  request_id: string;
  partner_id: string;
  
  // Accommodation details
  accommodation_name: string;
  description: string | null;
  room_configuration: RoomConfiguration[];
  
  // Pricing
  price_total: number;
  price_per_person_per_night: number | null;
  price_includes_vat: boolean;
  vat_rate: number;
  
  // What's included
  includes: string[];
  conditions: string | null;
  
  // Validity
  valid_until: string;
  
  // Status
  status: AccommodationQuoteStatus;
  submitted_at: string | null;
  selected_at: string | null;
  
  // Partner notes
  partner_notes: string | null;
  
  // Quote attachment/link (partner can attach their own quote document)
  quote_attachment_path: string | null;
  quote_attachment_filename: string | null;
  quote_external_url: string | null;
  
  // Invoice tracking
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  invoiced_file_path: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_status: string | null;
  commission_invoiced_at: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Joined data
  partner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RoomConfiguration {
  type: string;
  count: number;
  price_per_night: number;
  occupancy: number;
}

// Wizard form data
export interface AccommodationWizardData {
  // Step 1: Basics
  arrival_date: Date | undefined;
  departure_date: Date | undefined;
  number_of_guests: number;
  
  // Step 2: Type
  accommodation_type: AccommodationType;
  
  // Step 3: Rooms
  room_count: number;
  room_occupancy: string;
  room_types: string[];
  
  // Step 4: Wishes
  location_preference: string[];
  facilities_required: string[];
  budget_range: string;
  special_requests: string;
  
  // Step 5: Contact
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string;
  wants_activities: boolean;
}

// Options for the wizard
export const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: '🏨', description: 'Kamers met alle voorzieningen' },
  { value: 'vacation_home', label: 'Vakantiewoning', icon: '🏡', description: 'Appartement of huisje' },
  { value: 'group_accommodation', label: 'Groepsaccommodatie', icon: '🏕️', description: 'Voor grotere groepen' },
  { value: 'camping', label: 'Camping', icon: '⛺', description: 'Kampeerplaatsen of glamping' },
  { value: 'no_preference', label: 'Geen voorkeur', icon: '🔄', description: 'Alle opties bekijken' },
] as const;

export const ROOM_TYPES = [
  { value: 'single', label: 'Eenpersoonskamer' },
  { value: 'double', label: 'Tweepersoonskamer' },
  { value: 'twin', label: 'Twin (2 aparte bedden)' },
  { value: 'triple', label: 'Driepersoonskamer' },
  { value: 'family', label: 'Familiekamer (4+)' },
  { value: 'suite', label: 'Suite' },
] as const;

export const ROOM_OCCUPANCY_OPTIONS = [
  { value: '1', label: '1 persoon per kamer' },
  { value: '2', label: '2 personen per kamer' },
  { value: '3', label: '3 personen per kamer' },
  { value: '4+', label: '4 of meer per kamer' },
  { value: 'mixed', label: 'Gemengd' },
] as const;

export const LOCATION_PREFERENCES = [
  { value: 'village', label: 'In het dorp', icon: '🏘️' },
  { value: 'beach', label: 'Aan het strand', icon: '🏖️' },
  { value: 'nature', label: 'In de natuur', icon: '🌲' },
  { value: 'no_preference', label: 'Geen voorkeur', icon: '📍' },
] as const;

export const FACILITIES = [
  { value: 'breakfast', label: 'Ontbijt' },
  { value: 'half_board', label: 'Halfpension' },
  { value: 'full_board', label: 'Volpension' },
  { value: 'parking', label: 'Parkeren' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'meeting_room', label: 'Vergaderruimte' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'wellness', label: 'Wellness/Sauna' },
  { value: 'accessible', label: 'Rolstoeltoegankelijk' },
  { value: 'pets_allowed', label: 'Huisdieren toegestaan' },
] as const;

export const BUDGET_RANGES = [
  { value: '50-75', label: '€50 - €75 p.p.p.n.' },
  { value: '75-100', label: '€75 - €100 p.p.p.n.' },
  { value: '100-150', label: '€100 - €150 p.p.p.n.' },
  { value: '150+', label: '€150+ p.p.p.n.' },
  { value: 'no_max', label: 'Geen maximum' },
] as const;
