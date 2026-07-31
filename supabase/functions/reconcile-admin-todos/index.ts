// Reconcile open admin_todos: close ones whose anchor is resolved, then
// invoke check-pending-items to (re)create new ones.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  fetchLastContactByProject,
  REMINDER_TYPES_GUARDED_BY_COOLDOWN,
} from "../_shared/project-activity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Todo {
  id: string;
  auto_type: string | null;
  auto_entity_id: string | null;
  related_request_id: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const closedIds = new Set<string>();
  const reasons: Record<string, number> = {};

  const markClosed = (id: string, reason: string) => {
    if (closedIds.has(id)) return;
    closedIds.add(id);
    reasons[reason] = (reasons[reason] ?? 0) + 1;
  };

  try {
    const { data: todos, error } = await supabase
      .from("admin_todos")
      .select("id, auto_type, auto_entity_id, related_request_id, created_at")
      .in("status", ["todo", "in_progress"])
      .not("auto_type", "is", null);
    if (error) throw error;

    const list = (todos ?? []) as Todo[];

    // Bucket by entity for batched lookups
    const requestIds = new Set<string>();
    const itemIds = new Set<string>();
    const quoteIds = new Set<string>();
    const purchaseInvoiceIds = new Set<string>();
    const batchIds = new Set<string>();

    const isUuid = (s: string | null | undefined) =>
      !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    for (const t of list) {
      if (t.related_request_id && isUuid(t.related_request_id)) {
        requestIds.add(t.related_request_id);
      }
      if (!t.auto_entity_id) continue;
      const type = t.auto_type ?? "";
      const eid = t.auto_entity_id;
      if (
        type === "purchase_invoice_pending" ||
        type === "purchase_invoice_inbox" ||
        type === "commission_unlinked_invoice"
      ) {
        if (isUuid(eid)) purchaseInvoiceIds.add(eid);
      } else if (type === "commission_pending") {
        if (isUuid(eid)) batchIds.add(eid);

      } else if (
        type === "quote_pending_partner" ||
        type === "quote_expiring_soon" ||
        type === "quote_expired_partner"
      ) {
        if (isUuid(eid)) quoteIds.add(eid);
      } else if (
        type === "request_no_response" ||
        type === "quote_pending_customer" ||
        type === "new_request_received" ||
        type === "new_program_request" ||
        type === "new_accommodation_request" ||
        type === "all_partners_responded" ||
        type === "customer_inputs_missing" ||
        type === "customer_date_change_partner_notify" ||
        type === "customer_cancellation" ||
        type === "send_items_to_partners" ||
        type === "invoicing_ready"
      ) {
        if (isUuid(eid)) requestIds.add(eid);
      } else if (
        type === "post_execution_invoice_check" ||
        type === "post_execution_feedback" ||
        type === "book_ferry_tickets" ||
        type === "stale_pending_change" ||
        type === "partner_reminder" ||
        type === "partner_status_update" ||
        type === "commission_missing_invoice"
      ) {
        if (isUuid(eid)) itemIds.add(eid);

      }
    }

    // Fetch related rows in batches
    const [reqs, items, quotes, pInvoices, batches] = await Promise.all([
      requestIds.size
        ? supabase
            .from("program_requests")
            .select(
              "id, status, quote_status, completion_status, terms_accepted_at, billing_company_name, linked_accommodation_id, expires_at, cancelled_at, number_of_people, selected_dates",
            )
            .in("id", [...requestIds])
        : Promise.resolve({ data: [], error: null }),
      itemIds.size
        ? supabase
            .from("program_request_items")
            .select(
              "id, request_id, status, customer_approved_at, executed_at, booking_reference, pending_changed_at, pending_added, pending_marked_for_removal, invoiced_number, commission_basis, commission_status",
            )

            .in("id", [...itemIds])
        : Promise.resolve({ data: [], error: null }),
      quoteIds.size
        ? supabase
            .from("accommodation_quotes")
            .select("id, status")
            .in("id", [...quoteIds])
        : Promise.resolve({ data: [], error: null }),
      purchaseInvoiceIds.size
        ? supabase
            .from("partner_purchase_invoices")
            .select("id, status, item_id, commission_exempt, partner_id, invoice_number")

            .in("id", [...purchaseInvoiceIds])
        : Promise.resolve({ data: [], error: null }),
      batchIds.size
        ? supabase
            .from("payment_batches")
            .select("id, status")
            .in("id", [...batchIds])
        : Promise.resolve({ data: [], error: null }),
    ]);

    // CRITICAL: if any lookup failed, abort instead of treating rows as
    // missing — otherwise valid todos get closed as "project_deleted".
    if (reqs.error) throw new Error(`program_requests lookup failed: ${reqs.error.message}`);
    if (items.error) throw new Error(`program_request_items lookup failed: ${items.error.message}`);
    if (quotes.error) throw new Error(`accommodation_quotes lookup failed: ${quotes.error.message}`);
    if (pInvoices.error) throw new Error(`partner_purchase_invoices lookup failed: ${pInvoices.error.message}`);
    if (batches.error) throw new Error(`payment_batches lookup failed: ${batches.error.message}`);

    const requestMap = new Map<string, any>(
      ((reqs.data ?? []) as any[]).map((r) => [r.id, r]),
    );
    const itemMap = new Map<string, any>(
      ((items.data ?? []) as any[]).map((r) => [r.id, r]),
    );
    const quoteMap = new Map<string, any>(
      ((quotes.data ?? []) as any[]).map((r) => [r.id, r]),
    );
    const pInvoiceMap = new Map<string, any>(
      ((pInvoices.data ?? []) as any[]).map((r) => [r.id, r]),
    );
    const batchMap = new Map<string, any>(
      ((batches.data ?? []) as any[]).map((r) => [r.id, r]),
    );

    // Allocaties per inkoopfactuur (voor commission_unlinked_invoice).
    const allocatedInvoiceIds = new Set<string>();
    if (purchaseInvoiceIds.size) {
      const { data: allocs, error: allocError } = await supabase
        .from("partner_purchase_invoice_allocations")
        .select("invoice_id, item_id")
        .in("invoice_id", [...purchaseInvoiceIds]);
      if (allocError) {
        throw new Error(
          `partner_purchase_invoice_allocations lookup failed: ${allocError.message}`,
        );
      }
      for (const a of (allocs ?? []) as { invoice_id: string; item_id: string | null }[]) {
        if (a.item_id) allocatedInvoiceIds.add(a.invoice_id);
      }
    }



    // Facturen die via een factuurnummer aan een programma-onderdeel of
    // logies-offerte hangen. Spiegelt `invoiceIsLinked` uit de gedeelde
    // reconciliatiemodule, zodat de opschoner exact dezelfde definitie van
    // "gekoppeld" gebruikt als de werklijst en de taakgenerator.
    const invoiceKeyOf = (partnerId?: string | null, invoiceNumber?: string | null) =>
      `${(partnerId ?? "").trim().toLowerCase()}::${(invoiceNumber ?? "").trim().toLowerCase()}`;
    const linkedInvoiceKeys = new Set<string>();
    {
      const numbers = [
        ...new Set(
          [...pInvoiceMap.values()]
            .map((i: any) => i.invoice_number)
            .filter((n: unknown): n is string => typeof n === "string" && n.trim() !== ""),
        ),
      ];
      if (numbers.length) {
        const [quoteLinks, itemLinks] = await Promise.all([
          supabase
            .from("accommodation_quotes")
            .select("partner_id, invoiced_number")
            .in("invoiced_number", numbers),
          supabase
            .from("program_request_items")
            .select("provider_id, invoiced_number")
            .in("invoiced_number", numbers),
        ]);
        if (quoteLinks.error) {
          throw new Error(`accommodation_quotes link lookup failed: ${quoteLinks.error.message}`);
        }
        if (itemLinks.error) {
          throw new Error(`program_request_items link lookup failed: ${itemLinks.error.message}`);
        }
        for (const q of (quoteLinks.data ?? []) as any[]) {
          linkedInvoiceKeys.add(invoiceKeyOf(q.partner_id, q.invoiced_number));
        }
        for (const i of (itemLinks.data ?? []) as any[]) {
          linkedInvoiceKeys.add(invoiceKeyOf(i.provider_id, i.invoiced_number));
        }
      }
    }

    // sales invoices grouped by request (for post_execution_invoice_check fallback)
    const salesByRequest = new Map<string, number>();
    if (requestIds.size) {
      const { data: bi } = await supabase
        .from("bureau_invoices")
        .select("request_id")
        .in("request_id", [...requestIds]);
      for (const row of (bi ?? []) as { request_id: string }[]) {
        salesByRequest.set(row.request_id, (salesByRequest.get(row.request_id) ?? 0) + 1);
      }
    }

    // selected lodging quotes per accommodation request (for customer_inputs_missing)
    const selectedLodging = new Set<string>();
    {
      const accIds = [...requestMap.values()]
        .map((r: any) => r.linked_accommodation_id)
        .filter((id: any) => isUuid(id));
      if (accIds.length) {
        const { data: sel } = await supabase
          .from("accommodation_quotes")
          .select("request_id")
          .eq("status", "selected")
          .in("request_id", accIds);
        for (const row of (sel ?? []) as { request_id: string }[]) {
          selectedLodging.add(row.request_id);
        }
      }
    }

    // Laatste uitgaande communicatie per project (voor inbound_email todos).
    // Zodra er vanuit de admin een antwoord/mail de deur uit is ná het
    // aanmaken van de todo, is de melding afgehandeld.
    const lastOutboundByRequest = new Map<string, string>();
    {
      const inboundRequestIds = [
        ...new Set(
          list
            .filter(
              (t) =>
                t.auto_type === "inbound_email" &&
                t.related_request_id &&
                isUuid(t.related_request_id),
            )
            .map((t) => t.related_request_id!),
        ),
      ];
      if (inboundRequestIds.length) {
        const { data: outbound, error: outboundError } = await supabase
          .from("project_communications")
          .select("request_id, communication_date, direction")
          .in("request_id", inboundRequestIds)
          .eq("direction", "outbound")
          .order("communication_date", { ascending: false });
        if (outboundError) {
          throw new Error(
            `project_communications lookup failed: ${outboundError.message}`,
          );
        }
        for (
          const row of (outbound ?? []) as {
            request_id: string;
            communication_date: string;
          }[]
        ) {
          if (!lastOutboundByRequest.has(row.request_id)) {
            lastOutboundByRequest.set(row.request_id, row.communication_date);
          }
        }
      }
    }


    for (const t of list) {
      const type = t.auto_type ?? "";
      const eid = t.auto_entity_id;
      const req =
        t.related_request_id ? requestMap.get(t.related_request_id) : null;

      // Universal: project deleted or cancelled → close
      if (t.related_request_id && isUuid(t.related_request_id) && !req) {
        markClosed(t.id, "project_deleted");
        continue;
      }
      if (req && (req.cancelled_at || req.status === "cancelled")) {
        // keep customer_cancellation open until handled, otherwise close
        if (type !== "customer_cancellation") {
          markClosed(t.id, "project_cancelled");
          continue;
        }
      }

      switch (type) {
        case "post_execution_invoice_check": {
          const item = eid ? itemMap.get(eid) : null;
          // Closed when there is at least one bureau_invoice for this request
          // or project is fully invoiced.
          const reqRow = item
            ? requestMap.get(item.request_id) ?? req
            : req;
          if (
            (reqRow && reqRow.completion_status === "fully_invoiced") ||
            (item && (salesByRequest.get(item.request_id) ?? 0) > 0) ||
            (t.related_request_id &&
              (salesByRequest.get(t.related_request_id) ?? 0) > 0)
          ) {
            markClosed(t.id, type);
          }
          break;
        }
        case "purchase_invoice_pending":
        case "purchase_invoice_inbox": {
          const inv = eid ? pInvoiceMap.get(eid) : null;
          if (!inv) {
            markClosed(t.id, `${type}_missing`);
            break;
          }
          if (["paid", "rejected", "archived"].includes(inv.status)) {
            markClosed(t.id, type);
          }
          break;
        }
        case "commission_pending": {
          const b = eid ? batchMap.get(eid) : null;
          if (!b) {
            markClosed(t.id, `${type}_missing`);
            break;
          }
          if (b.status === "paid") markClosed(t.id, type);
          break;
        }
        case "commission_missing_invoice": {
          // Aanmaakcriterium: uitgevoerd partner-item zonder gekoppelde
          // inkoopfactuur. Sluiten zodra er wél een factuur hangt, de
          // commissie op verkoopwaarde gefactureerd wordt, of de commissie
          // al verwerkt is.
          const item = eid ? itemMap.get(eid) : null;
          if (!item) {
            markClosed(t.id, `${type}_missing`);
            break;
          }
          if (
            item.invoiced_number ||
            item.commission_basis === "sales" ||
            ["invoiced", "paid", "exempt"].includes(item.commission_status ?? "")
          ) {
            markClosed(t.id, type);
          }
          break;
        }
        case "commission_unlinked_invoice": {
          // Aanmaakcriterium: geregistreerde inkoopfactuur zonder koppeling
          // aan een programma-onderdeel of logies-offerte. Sluiten zodra
          // gekoppeld (item, allocatie of factuurnummer op onderdeel/logies)
          // of commissievrij verklaard.
          const inv = eid ? pInvoiceMap.get(eid) : null;
          if (!inv) {
            markClosed(t.id, `${type}_missing`);
            break;
          }
          if (
            inv.item_id ||
            inv.commission_exempt === true ||
            allocatedInvoiceIds.has(inv.id) ||
            linkedInvoiceKeys.has(invoiceKeyOf(inv.partner_id, inv.invoice_number)) ||
            ["rejected", "archived"].includes(inv.status)
          ) {
            markClosed(t.id, type);
          }
          break;
        }

        case "invoicing_ready": {
          if (req && req.completion_status === "fully_invoiced") {
            markClosed(t.id, type);
          }
          break;
        }
        case "quote_pending_partner":
        case "quote_expiring_soon":
        case "quote_expired_partner": {
          const q = eid ? quoteMap.get(eid) : null;
          if (!q) {
            markClosed(t.id, `${type}_missing`);
            break;
          }
          if (q.status !== "pending") markClosed(t.id, type);
          break;
        }
        case "quote_pending_customer": {
          if (
            req &&
            (req.terms_accepted_at ||
              req.quote_status === "akkoord_ontvangen" ||
              req.quote_status === "definitief_bevestigd")
          ) {
            markClosed(t.id, type);
          }
          break;
        }
        case "request_no_response": {
          // Mirror creation criteria (check-pending-items): created while
          // status=active AND completion_status=in_progress AND not expired.
          if (
            req &&
            (req.status !== "active" ||
              req.completion_status !== "in_progress" ||
              (req.expires_at && new Date(req.expires_at) <= new Date()))
          ) {
            markClosed(t.id, type);
          }
          break;
        }
        case "new_request_received":
        case "new_program_request": {
          if (
            req &&
            req.status &&
            !["new", "submitted", "active"].includes(req.status)
          ) {
            markClosed(t.id, type);
          } else if (req && req.quote_status && req.quote_status !== "concept") {
            markClosed(t.id, type);
          }
          break;
        }
        case "customer_inputs_missing": {
          // Mirror creation criteria: closed when voorwaarden + facturatie-
          // gegevens binnen zijn en (indien gekoppeld) logies is gekozen.
          if (
            req &&
            req.terms_accepted_at &&
            req.billing_company_name &&
            (!req.linked_accommodation_id ||
              selectedLodging.has(req.linked_accommodation_id))
          ) {
            markClosed(t.id, type);
          }
          break;
        }
        case "book_ferry_tickets": {
          const item = eid ? itemMap.get(eid) : null;
          if (item && item.booking_reference) markClosed(t.id, type);
          break;
        }
        case "stale_pending_change": {
          const item = eid ? itemMap.get(eid) : null;
          if (!item) {
            markClosed(t.id, `${type}_missing`);
            break;
          }
          const stillPending =
            item.pending_changed_at ||
            item.pending_added ||
            item.pending_marked_for_removal;
          if (!stillPending) markClosed(t.id, type);
          break;
        }
        case "partner_reminder":
        case "partner_status_update": {
          const item = eid ? itemMap.get(eid) : null;
          if (
            item &&
            ["confirmed", "accepted", "executed", "cancelled", "unavailable"].includes(
              item.status,
            )
          ) {
            markClosed(t.id, type);
          }
          break;
        }
        case "all_partners_responded": {
          // Close 7 days after creation (informational)
          const age = Date.now() - new Date(t.created_at).getTime();
          if (age > 7 * 86400_000) markClosed(t.id, type);
          break;
        }
        case "inbound_email": {
          // Aanmaakcriterium: inkomend bericht dat nog opgevolgd moet worden.
          // Sluiten zodra er ná de melding uitgaande communicatie in het
          // dossier staat, of na 14 dagen (informatief vangnet).
          const lastOut = t.related_request_id
            ? lastOutboundByRequest.get(t.related_request_id)
            : undefined;
          if (
            lastOut &&
            new Date(lastOut).getTime() > new Date(t.created_at).getTime()
          ) {
            markClosed(t.id, type);
            break;
          }
          const inboundAge = Date.now() - new Date(t.created_at).getTime();
          if (inboundAge > 14 * 86400_000) markClosed(t.id, `${type}_stale`);
          break;
        }
        case "customer_cancellation": {

          const age = Date.now() - new Date(t.created_at).getTime();
          if (age > 7 * 86400_000) markClosed(t.id, type);
          break;
        }
        default:
          break;
      }
    }

    // Cooldown-sweep: sluit reminder-todos die ouder zijn dan het laatste
    // contact-moment in het dossier. Voorkomt dat een opvolgmail of nieuw
    // partner-bericht een oude reminder in de werkbank laat staan.
    {
      const reminderTodos = list.filter(
        (t) =>
          t.auto_type &&
          REMINDER_TYPES_GUARDED_BY_COOLDOWN.has(t.auto_type) &&
          t.related_request_id &&
          isUuid(t.related_request_id) &&
          !closedIds.has(t.id),
      );
      const projectIds = [...new Set(reminderTodos.map((t) => t.related_request_id!))];
      if (projectIds.length > 0) {
        const lastContact = await fetchLastContactByProject(supabase, projectIds);
        for (const t of reminderTodos) {
          const contactAt = lastContact.get(t.related_request_id!);
          if (!contactAt) continue;
          if (new Date(contactAt).getTime() > new Date(t.created_at).getTime()) {
            markClosed(t.id, "superseded_by_contact");
          }
        }
      }
    }

    // Snooze sweep: sluit alle open auto-todos waarvan het project nu gesnoozed is.
    {
      const candidateRequestIds = new Set<string>();
      for (const t of list) {
        if (t.related_request_id && isUuid(t.related_request_id)) {
          candidateRequestIds.add(t.related_request_id);
        }
        if (t.auto_entity_id && isUuid(t.auto_entity_id)) {
          candidateRequestIds.add(t.auto_entity_id);
        }
      }
      if (candidateRequestIds.size > 0) {
        const { data: snoozedRows } = await supabase
          .from("program_requests")
          .select("id")
          .in("id", [...candidateRequestIds])
          .gt("snoozed_until", new Date().toISOString());
        const snoozedSet = new Set<string>((snoozedRows ?? []).map((r: any) => r.id));
        if (snoozedSet.size > 0) {
          for (const t of list) {
            const projectId =
              t.related_request_id && isUuid(t.related_request_id)
                ? t.related_request_id
                : t.auto_entity_id && isUuid(t.auto_entity_id)
                ? t.auto_entity_id
                : null;
            if (projectId && snoozedSet.has(projectId)) {
              markClosed(t.id, "snoozed");
            }
          }
        }
      }
    }


    let closed = 0;
    if (closedIds.size) {
      const ids = [...closedIds];
      const chunkSize = 200;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error: upErr, count } = await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: new Date().toISOString() }, { count: "exact" })
          .in("id", chunk);
        if (upErr) throw upErr;
        closed += count ?? chunk.length;
      }
    }

    // Trigger check-pending-items to (re)create new todos
    let created = 0;
    try {
      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-pending-items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        },
      );
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        created =
          (body?.created ?? body?.todos_created ?? body?.total ?? 0) as number;
      }
    } catch (e) {
      console.warn("check-pending-items invoke failed", e);
    }

    console.log("reconcile-admin-todos done", { closed, created, reasons });

    return new Response(
      JSON.stringify({ closed, created, scanned: list.length, reasons }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("reconcile-admin-todos error", err);
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
