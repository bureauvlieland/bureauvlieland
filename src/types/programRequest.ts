// Status types for program request items
export type ItemStatus = "pending" | "confirmed" | "accepted" | "unavailable" | "alternative" | "cancelled" | "executed" | "invoiced" | "counter_proposed";

// Program type: self-service (customer-initiated) vs quote (admin-initiated)
export type ProgramType = "self_service" | "quote";

// Quote status for admin-created programs
export type QuoteStatus =
  | "concept"
  | "in_afstemming"
  | "offerte_verstuurd"
  | "akkoord_ontvangen"
  | "definitief_bevestigd"
  | "verlopen"
  | "geannuleerd";

// Item quote status for individual building blocks in quote mode
export type ItemQuoteStatus =
  | "concept"
  | "in_afstemming"
  | "bevestigd"
  | "optioneel";

export interface QuoteStatusInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const quoteStatusConfig: Record<QuoteStatus, QuoteStatusInfo> = {
  concept: {
    label: "Concept",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: "FileEdit",
    description: "Offerte wordt samengesteld",
  },
  in_afstemming: {
    label: "In afstemming",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "MessageCircle",
    description: "Afstemming met partners loopt",
  },
  offerte_verstuurd: {
    label: "Offerte verstuurd",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: "Send",
    description: "Klant heeft offerte ontvangen",
  },
  akkoord_ontvangen: {
    label: "Akkoord ontvangen",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle",
    description: "Klant heeft voorwaarden geaccepteerd",
  },
  definitief_bevestigd: {
    label: "Definitief bevestigd",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    icon: "CheckCircle2",
    description: "Alle reserveringen definitief",
  },
  verlopen: {
    label: "Verlopen",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/50",
    icon: "Clock",
    description: "Geldigheidsdatum verstreken",
  },
  geannuleerd: {
    label: "Geannuleerd",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: "XCircle",
    description: "Offerte is geannuleerd",
  },
};

export const itemQuoteStatusConfig: Record<ItemQuoteStatus, QuoteStatusInfo> = {
  concept: {
    label: "Concept",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: "FileEdit",
    description: "Nog niet bevestigd",
  },
  in_afstemming: {
    label: "In afstemming",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "MessageCircle",
    description: "In afstemming met partner",
  },
  bevestigd: {
    label: "Bevestigd",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle",
    description: "Door partner bevestigd",
  },
  optioneel: {
    label: "Optioneel",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: "HelpCircle",
    description: "Optioneel onderdeel",
  },
};

// Customer-facing labels (hide internal terminology)
export const customerItemQuoteStatusLabels: Record<ItemQuoteStatus, string> = {
  concept: "Onder voorbehoud",
  in_afstemming: "Onder voorbehoud",
  bevestigd: "Bevestigd",
  optioneel: "Optioneel",
};

export interface ItemStatusInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const itemStatusConfig: Record<ItemStatus, ItemStatusInfo> = {
  pending: {
    label: "Aangevraagd",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "Clock",
    description: "Wacht op reactie van de aanbieder",
  },
  confirmed: {
    label: "Bevestigd",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle",
    description: "De aanbieder heeft deze activiteit bevestigd",
  },
  accepted: {
    label: "Akkoord",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle2",
    description: "Jij hebt akkoord gegeven op deze activiteit",
  },
  unavailable: {
    label: "Niet beschikbaar",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/50",
    icon: "XCircle",
    description: "Deze activiteit is niet beschikbaar op de gevraagde datum",
  },
  alternative: {
    label: "Alternatief",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: "MessageSquare",
    description: "De aanbieder stelt een alternatief voor",
  },
  cancelled: {
    label: "Geannuleerd",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: "Ban",
    description: "Deze activiteit is geannuleerd",
  },
  executed: {
    label: "Uitgevoerd",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    icon: "CheckCircle2",
    description: "Deze activiteit is uitgevoerd",
  },
  invoiced: {
    label: "Gefactureerd",
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-950/50",
    icon: "FileText",
    description: "Deze activiteit is gefactureerd",
  },
  counter_proposed: {
    label: "Tegenvoorstel",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-950/50",
    icon: "ArrowLeftRight",
    description: "Je hebt een andere tijd voorgesteld",
  },
};

// Database types
export interface ProgramRequest {
  id: string;
  customer_token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  number_of_people: number;
  selected_dates: string[];
  general_notes: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  // Quote mode fields
  program_type: ProgramType;
  quote_status: QuoteStatus | null;
  quote_valid_until: string | null;
  quote_sent_at: string | null;
  quote_sent_by: string | null;
  quote_personal_message: string | null;
  admin_created_by: string | null;
}

export interface ProgramRequestItem {
  id: string;
  request_id: string;
  block_id: string;
  block_name: string;
  block_category: string;
  provider_name: string;
  provider_id: string;
  provider_email: string | null;
  block_type: string;
  price_indication: string | null;
  duration: string | null;
  day_index: number;
  preferred_time: string | null;
  customer_notes: string | null;
  status: ItemStatus;
  status_note: string | null;
  status_updated_at: string | null;
  status_updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  executed_at: string | null;
  // Customer acceptance
  customer_accepted_at: string | null;
  // Customer counter-proposal fields
  customer_counter_time: string | null;
  customer_counter_note: string | null;
  customer_counter_at: string | null;
  // Confirmed time (final time after acceptance)
  confirmed_time: string | null;
  // Quoted price fields (set when partner confirms)
  quoted_price: number | null;
  quoted_at: string | null;
  quoted_notes: string | null;
  // Partner proposal fields
  proposed_time: string | null;
  proposed_date: string | null;
  // Image fields (joined from building_blocks)
  image_url: string | null;
  image_asset: string | null;
  // Quote mode fields
  item_quote_status: ItemQuoteStatus | null;
  admin_price_override: number | null;
  admin_price_notes: string | null;
  skip_partner_notification: boolean;
}

export interface ProgramRequestHistory {
  id: string;
  request_id: string;
  item_id: string | null;
  action: string;
  actor: string;
  actor_name: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export interface ProgramRequestWithItems extends ProgramRequest {
  items: ProgramRequestItem[];
}

// Helper to calculate status summary
export function calculateStatusSummary(items: ProgramRequestItem[]) {
  const total = items.filter(i => i.block_type !== "self_arranged").length;
  const confirmed = items.filter(i => i.status === "confirmed").length;
  const pending = items.filter(i => i.status === "pending").length;
  const alternative = items.filter(i => i.status === "alternative").length;
  const unavailable = items.filter(i => i.status === "unavailable").length;
  const cancelled = items.filter(i => i.status === "cancelled").length;
  
  return {
    total,
    confirmed,
    pending,
    alternative,
    unavailable,
    cancelled,
    progress: total > 0 ? Math.round((confirmed / total) * 100) : 0,
  };
}

// Generate a secure random token
export function generateCustomerToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
