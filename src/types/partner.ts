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
  version: number;
  created_at: string;
  updated_at: string;
  duration: string | null;
  // Quoted price fields (set when partner confirms)
  quoted_price: number | null;
  quoted_at: string | null;
  quoted_notes: string | null;
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
    terms_accepted_at: string | null;
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
  price_type: string | null;
  min_people: number | null;
  max_people: number | null;
  is_published: boolean;
  is_active: boolean;
  image_url: string | null;
  image_asset: string | null;
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
