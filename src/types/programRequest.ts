// Status types for program request items
export type ItemStatus = "pending" | "confirmed" | "unavailable" | "alternative" | "cancelled";

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
  // Quoted price fields (set when partner confirms)
  quoted_price: number | null;
  quoted_at: string | null;
  quoted_notes: string | null;
  // Image fields (joined from building_blocks)
  image_url: string | null;
  image_asset: string | null;
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
