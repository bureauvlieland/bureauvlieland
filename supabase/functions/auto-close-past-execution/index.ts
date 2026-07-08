// auto-close-past-execution
//
// Sluit automatisch acties af voor projecten waarvan de uitvoeringsdatum in het
// verleden ligt. Deze functie is idempotent en veilig om vaker per dag te draaien.
//
// Wat er gebeurt per project (past_execution én niet cancelled, niet fully_invoiced):
//  1. program_request_items met status 'pending' of 'alternative'
//     → status='confirmed', auto_closed_reason='auto_past_execution'
//  2. accommodation_quotes met status 'pending'/'submitted' voor deze aanvraag
//     → status='expired', auto_closed_reason='auto_past_execution'
//  3. admin_todos met auto_type in de whitelist (pre-executie) → status='done',
//     completion_reason='auto_past_execution'
//  4. Zet completion_status='ready_for_invoice' als het nog 'in_progress' stond.
//
// admin_todos rond facturatie, voorwaarden, aftersales, commissie enz. worden
// NIET geraakt — zie PRE_EXECUTION_TODO_TYPES in src/lib/projectExecutionState.ts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRE_EXECUTION_TODO_TYPES = [
  "quote_pending_partner",
  "quote_pending_customer",
  "quote_expiring_soon",
  "quote_expired_partner",
  "request_no_response",
  "all_partners_responded",
  "customer_date_change_partner_notify",
  "customer_cancellation",
  "new_program_request",
  "new_accommodation_request",
  "new_request_received",
  "customer_inputs_missing",
  "stale_pending_change",
  "book_ferry_tickets",
];

export interface AutoCloseResult {
  projects_scanned: number;
  projects_past_execution: number;
  items_confirmed: number;
  quotes_expired: number;
  todos_closed: number;
  projects_marked_ready_for_invoice: number;
  errors: Array<{ project_id: string; error: string }>;
}

function parseLooseDate(v: string): Date | null {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function lastValidDate(dates: string[] | null): Date | null {
  if (!Array.isArray(dates) || dates.length === 0) return null;
  const parsed = dates.map(parseLooseDate).filter((d): d is Date => !!d);
  if (parsed.length === 0) return null;
  return parsed.reduce((m, c) => (c.getTime() > m.getTime() ? c : m), parsed[0]);
}

function startOfDay(d: Date): Date {
  const c = new Date(d.getTime());
  c.setHours(0, 0, 0, 0);
  return c;
}

export interface RunOptions {
  dryRun?: boolean;
  now?: Date;
}

export async function runAutoClose(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  options: RunOptions = {},
): Promise<AutoCloseResult> {
  const now = options.now ?? new Date();
  const today = startOfDay(now);
  const dryRun = !!options.dryRun;

  const result: AutoCloseResult = {
    projects_scanned: 0,
    projects_past_execution: 0,
    items_confirmed: 0,
    quotes_expired: 0,
    todos_closed: 0,
    projects_marked_ready_for_invoice: 0,
    errors: [],
  };

  // Alleen niet-geannuleerde, niet volledig gefactureerde projecten die niet
  // reeds "fully_invoiced" zijn (facturatie afgerond) — daar hoeven we niks meer te sluiten.
  const { data: projects, error: pErr } = await supabase
    .from("program_requests")
    .select("id, selected_dates, cancelled_at, completion_status")
    .is("cancelled_at", null)
    .or("completion_status.is.null,completion_status.neq.fully_invoiced");
  if (pErr) throw new Error(`load projects: ${pErr.message}`);

  result.projects_scanned = projects?.length ?? 0;
  const pastProjects: Array<{ id: string; completion_status: string | null }> = [];
  for (const p of projects ?? []) {
    const last = lastValidDate(p.selected_dates ?? null);
    if (!last) continue;
    if (startOfDay(last).getTime() < today.getTime()) {
      pastProjects.push({ id: p.id, completion_status: p.completion_status });
    }
  }
  result.projects_past_execution = pastProjects.length;
  if (pastProjects.length === 0) return result;

  const ids = pastProjects.map((p) => p.id);

  // 1. items → confirmed
  {
    const { data: items, error } = await supabase
      .from("program_request_items")
      .select("id, request_id")
      .in("request_id", ids)
      .in("status", ["pending", "alternative"])
      .is("auto_closed_reason", null);
    if (error) result.errors.push({ project_id: "*", error: `load items: ${error.message}` });
    else if (items && items.length && !dryRun) {
      const { error: uErr } = await supabase
        .from("program_request_items")
        .update({
          status: "confirmed",
          auto_closed_reason: "auto_past_execution",
        })
        .in("id", items.map((i: { id: string }) => i.id));
      if (uErr) result.errors.push({ project_id: "*", error: `update items: ${uErr.message}` });
      else result.items_confirmed = items.length;
    } else if (items) {
      result.items_confirmed = items.length;
    }
  }

  // 2. accommodation quotes → expired
  {
    const { data: accReqs, error } = await supabase
      .from("accommodation_requests")
      .select("id, linked_program_id")
      .in("linked_program_id", ids);
    if (error) result.errors.push({ project_id: "*", error: `load acc requests: ${error.message}` });
    const reqIds = (accReqs ?? []).map((r: { id: string }) => r.id);
    if (reqIds.length > 0) {
      const { data: quotes, error: qErr } = await supabase
        .from("accommodation_quotes")
        .select("id")
        .in("request_id", reqIds)
        .in("status", ["pending", "submitted"])
        .is("auto_closed_reason", null);
      if (qErr) result.errors.push({ project_id: "*", error: `load quotes: ${qErr.message}` });
      else if (quotes && quotes.length && !dryRun) {
        const { error: uErr } = await supabase
          .from("accommodation_quotes")
          .update({ status: "expired", auto_closed_reason: "auto_past_execution" })
          .in("id", quotes.map((q: { id: string }) => q.id));
        if (uErr) result.errors.push({ project_id: "*", error: `expire quotes: ${uErr.message}` });
        else result.quotes_expired = quotes.length;
      } else if (quotes) {
        result.quotes_expired = quotes.length;
      }
    }
  }

  // 3. admin_todos → done
  {
    const { data: todos, error } = await supabase
      .from("admin_todos")
      .select("id")
      .in("related_request_id", ids)
      .in("status", ["todo", "in_progress"])
      .in("auto_type", PRE_EXECUTION_TODO_TYPES);
    if (error) result.errors.push({ project_id: "*", error: `load todos: ${error.message}` });
    else if (todos && todos.length && !dryRun) {
      const { error: uErr } = await supabase
        .from("admin_todos")
        .update({
          status: "done",
          completed_at: now.toISOString(),
          completion_reason: "auto_past_execution",
        })
        .in("id", todos.map((t: { id: string }) => t.id));
      if (uErr) result.errors.push({ project_id: "*", error: `close todos: ${uErr.message}` });
      else result.todos_closed = todos.length;
    } else if (todos) {
      result.todos_closed = todos.length;
    }
  }

  // 4. completion_status → ready_for_invoice (alleen als nog niet gezet)
  {
    const targets = pastProjects
      .filter((p) => !p.completion_status || p.completion_status === "in_progress")
      .map((p) => p.id);
    if (targets.length > 0 && !dryRun) {
      const { error: uErr } = await supabase
        .from("program_requests")
        .update({ completion_status: "ready_for_invoice" })
        .in("id", targets);
      if (uErr) result.errors.push({ project_id: "*", error: `mark ready: ${uErr.message}` });
      else result.projects_marked_ready_for_invoice = targets.length;
    } else {
      result.projects_marked_ready_for_invoice = targets.length;
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optioneel: admin JWT check als er authorization header meekomt. Cron call
    // draait zonder user token — dan is service role al genoeg.
    const authHeader = req.headers.get("Authorization");
    let dryRun = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        dryRun = !!body?.dryRun;
      } catch {
        // no body — dat is prima
      }
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      dryRun = url.searchParams.get("dryRun") === "1";
    }

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      // getClaims is niet in de bundled types maar wel beschikbaar op runtime
      // deno-lint-ignore no-explicit-any
      const { data: claims, error: claimsErr } = await (anonClient.auth as any).getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const result = await runAutoClose(supabase, { dryRun });
    return new Response(JSON.stringify({ ok: true, dryRun, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auto-close-past-execution] failed:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
