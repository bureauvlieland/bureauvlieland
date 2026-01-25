import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface LogActivityParams {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an admin activity to the admin_activity_log table
 */
export async function logAdminActivity({
  action,
  entityType,
  entityId,
  details,
}: LogActivityParams): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn("No authenticated user for activity logging");
      return;
    }

    const { error } = await supabase.from("admin_activity_log").insert([{
      user_id: session.user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: (details ?? null) as Json,
    }]);

    if (error) {
      console.error("Failed to log admin activity:", error);
    }
  } catch (err) {
    console.error("Error logging admin activity:", err);
  }
}

// Predefined action types for consistency
export const AdminActions = {
  // Partner actions
  PARTNER_CREATED: "partner_created",
  PARTNER_UPDATED: "partner_updated",
  PARTNER_ACTIVATED: "partner_activated",
  PARTNER_DEACTIVATED: "partner_deactivated",
  PARTNER_INVITED: "partner_invited",
  
  // Request actions
  REQUEST_VIEWED: "request_viewed",
  REQUEST_STATUS_CHANGED: "request_status_changed",
  REQUEST_CANCELLED: "request_cancelled",
  
  // Item actions
  ITEM_STATUS_CHANGED: "item_status_changed",
  ITEM_COMMISSION_UPDATED: "item_commission_updated",
  
  // Todo actions
  TODO_CREATED: "todo_created",
  TODO_UPDATED: "todo_updated",
  TODO_DELETED: "todo_deleted",
  TODO_COMPLETED: "todo_completed",
  
  // Auth actions
  ADMIN_LOGIN: "admin_login",
  ADMIN_LOGOUT: "admin_logout",
} as const;

export const EntityTypes = {
  PARTNER: "partner",
  REQUEST: "program_request",
  ITEM: "program_request_item",
  TODO: "admin_todo",
  USER: "user",
} as const;
