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
  status: string;
  status_note: string | null;
  status_updated_at: string | null;
  executed_at: string | null;
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
  };
}

export interface PartnerDashboardData {
  partner: {
    id: string;
    name: string;
    email: string;
    commission_percentage: number;
  };
  items: PartnerItem[];
  summary: {
    pendingConfirmation: number;
    confirmed: number;
    executed: number;
    pendingInvoice: number;
    invoiced: number;
    total: number;
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
