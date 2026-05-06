// Partner types for the partner portal

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kvk_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  commission_percentage: number;
  is_active: boolean;
  about_text: string | null;
  gallery_images: { url: string; alt?: string }[];
  location_lat: number | null;
  location_lng: number | null;
  location_description: string | null;
  website_url: string | null;
  highlight_features: string[];
}

export interface PartnerItem {
  id: string;
  request_id: string;
  block_id: string;
  block_name: string;
  block_category: string;
  provider_name: string;
  provider_id: string;
  block_type: string;
  price_indication: string | null;
  day_index: number;
  preferred_time: string | null;
  customer_notes: string | null;
  status: string; // pending | confirmed | accepted | executed | invoiced | unavailable | cancelled
  status_note: string | null;
  status_updated_at: string | null;
  executed_at: string | null;
  customer_accepted_at: string | null; // When customer accepted the partner's proposal
  customer_approved_at: string | null; // When customer approved in quote flow
  version: number;
  created_at: string;
  updated_at: string;
  duration: string | null;
  admin_price_notes: string | null;
  // Proposed alternative fields (set when partner proposes alternative)
  proposed_time: string | null;
  proposed_date: string | null;
  confirmed_time: string | null; // Final confirmed time after customer acceptance
  // Admin price override (set by admin, visible to partner as expected price)
  admin_price_override: number | null;
  admin_price_override_updated_at?: string | null;
  partner_price_change_acknowledged_at?: string | null;
  override_people?: number | null;
  price_type: string | null; // "per_person" | "total" | "per_person_per_day"
  // Quoted price fields (set when partner confirms)
  quoted_price: number | null;
  quoted_at: string | null;
  quoted_notes: string | null;
  // Customer counter proposal fields (when customer proposes alternative time)
  customer_counter_time: string | null;
  customer_counter_note: string | null;
  customer_counter_at: string | null;
  // Sibling items on same request (for conflict detection)
  sibling_items?: {
    id: string;
    request_id: string;
    block_name: string;
    day_index: number;
    preferred_time: string | null;
    proposed_time: string | null;
    confirmed_time: string | null;
    duration: string | null;
    status: string;
    provider_name: string;
  }[];
  // Invoice fields
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  invoiced_file_path: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_status: string | null;
  program_requests: {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_company: string | null;
    number_of_people: number;
    selected_dates: string[];
    status: string;
    reference_number: string | null;
    terms_accepted_at: string | null;
    cancellation_reason?: string | null;
    invoicing_mode?: string; // 'partner_direct' | 'bureau_central'
    // Billing details (only populated when terms_accepted_at is set)
    billing_company_name?: string | null;
    billing_kvk_number?: string | null;
    billing_vat_number?: string | null;
    billing_address_street?: string | null;
    billing_address_postal?: string | null;
    billing_address_city?: string | null;
    billing_contact_name?: string | null;
    billing_contact_email?: string | null;
    billing_reference?: string | null;
  };
}

export interface PartnerBuildingBlock {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string;
  block_type: string;
  duration: string | null;
  price_adult: number | null;
  price_adult_note: string | null;
  price_type: string | null;
  price_child: number | null;
  price_child_note: string | null;
  price_child_min_age: number | null;
  price_child_max_age: number | null;
  price_pet: number | null;
  price_pet_note: string | null;
  is_from_price: boolean;
  price_includes_vat: boolean | null;
  vat_rate: number | null;
  min_people: number | null;
  max_people: number | null;
  is_published: boolean;
  is_active: boolean;
  status: string;
  image_url: string | null;
  image_asset: string | null;
  seasonal_notes: string | null;
  tags: string[] | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  external_url: string | null;
  price_display_override: string | null;
  sort_order: number | null;
  map_activity_type_id?: number | null;
}

export interface PartnerDashboardData {
  partner: {
    id: string;
    name: string;
    email: string;
    commission_percentage: number;
    accommodation_commission_percentage?: number;
    partner_type?: string;
  };
  items: PartnerItem[];
  summary: {
    pending: number;
    confirmed: number;
    accepted: number;
    executed: number;
    closed: number;
    readyForInvoice: number;
    invoiced: number;
    total: number;
  };
  accommodationQuotes?: PartnerAccommodationQuote[];
  accommodationSummary?: {
    pending: number;
    submitted: number;
    selected: number;
    closed: number;
    total: number;
  };
}

export interface PartnerAccommodationQuote {
  id: string;
  request_id: string;
  partner_id: string;
  accommodation_name: string;
  description: string | null;
  price_total: number;
  price_per_person_per_night: number | null;
  price_includes_vat: boolean;
  vat_rate: number;
  includes: unknown;
  conditions: string | null;
  valid_until: string;
  status: string;
  submitted_at: string | null;
  partner_notes: string | null;
  quote_external_url: string | null;
  quote_attachment_path: string | null;
  quote_attachment_filename: string | null;
  room_configuration: unknown;
  created_at: string;
  updated_at: string;
  // Invoice fields
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  invoiced_file_path: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_status: string | null;
  accommodation_requests: {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_company: string | null;
    arrival_date: string;
    departure_date: string;
    number_of_guests: number;
    accommodation_type: string;
    room_count: number | null;
    room_types: string[];
    location_preference: string[];
    budget_range: string | null;
    special_requests: string | null;
    status: string;
    created_at: string;
    linked_program_id?: string | null;
    invoicing_mode?: string | null;
  };
}

export interface CommissionItem {
  id: string;
  block_name: string;
  provider_id: string;
  provider_name: string;
  invoiced_amount: number;
  invoiced_number: string;
  invoiced_date: string;
  commission_percentage: number;
  commission_amount: number;
  commission_status: string;
  commission_invoiced_at: string | null;
  invoiced_file_path: string | null;
  program_requests: {
    id: string;
    customer_name: string;
    customer_company: string | null;
    selected_dates: string[];
  };
  partner: Partner | null;
}

export interface CommissionSummary {
  totalItems: number;
  totalCommission: number;
  status: string;
}

export interface CommissionsByPartner {
  partner: Partner | null;
  items: CommissionItem[];
  totalCommission: number;
}

export interface AdminCommissionsData {
  items: CommissionItem[];
  byPartner: CommissionsByPartner[];
  summary: CommissionSummary;
}
