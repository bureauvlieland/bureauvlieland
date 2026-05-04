import { supabase } from "@/integrations/supabase/client";
import { getItemSendCounts, type ItemForSendPhase } from "@/lib/projectWorkflow";

/**
 * Ensure that the auto-todo "send_items_to_partners" reflects the current
 * state of a project: create / update when there are items ready, mark as
 * done when none remain. Safe to call from any admin mutation that may
 * change item readiness.
 */
export async function ensureSendItemsTodo(requestId: string): Promise<void> {
  try {
    const { data: project } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_company, quote_status, status, cancelled_at")
      .eq("id", requestId)
      .maybeSingle();

    if (!project || project.status === "cancelled" || project.cancelled_at) {
      // Project gone or cancelled → close any open todo
      await closeOpenTodo(requestId);
      return;
    }

    const { data: items } = await supabase
      .from("program_request_items")
      .select(
        "id, status, skip_partner_notification, customer_approved_at, provider_id, block_type, day_index",
      )
      .eq("request_id", requestId);

    const itemList: ItemForSendPhase[] = (items ?? []) as ItemForSendPhase[];
    const { readyForPartner } = getItemSendCounts(itemList, {
      quote_status: project.quote_status,
    });

    const { data: existing } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", "send_items_to_partners")
      .eq("auto_entity_id", requestId)
      .neq("status", "done")
      .maybeSingle();

    if (readyForPartner === 0) {
      if (existing) {
        await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return;
    }

    const customerLabel = project.customer_company || project.customer_name;
    const approved =
      project.quote_status === "akkoord_ontvangen" ||
      project.quote_status === "definitief_bevestigd";
    const title = `Stuur onderdelen naar partners — ${customerLabel}`;
    const description = `${readyForPartner} ${
      readyForPartner === 1 ? "onderdeel is" : "onderdelen zijn"
    } klaar om naar de betrokken partners te sturen.`;
    const priority = approved ? "high" : "normal";

    if (existing) {
      await supabase
        .from("admin_todos")
        .update({ title, description, priority })
        .eq("id", existing.id);
    } else {
      await supabase.from("admin_todos").insert({
        title,
        description,
        priority,
        status: "todo",
        related_request_id: requestId,
        auto_type: "send_items_to_partners",
        auto_entity_id: requestId,
      });
    }
  } catch (err) {
    console.error("ensureSendItemsTodo failed", err);
  }
}

async function closeOpenTodo(requestId: string) {
  await supabase
    .from("admin_todos")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("auto_type", "send_items_to_partners")
    .eq("auto_entity_id", requestId)
    .neq("status", "done");
}
