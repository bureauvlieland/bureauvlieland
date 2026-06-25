// Claudia daily scan: scant operationele data, prioriteert via Lovable AI,
// en schrijft top-aanbevelingen in admin_recommendations.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getProjectActivityState,
  shouldShowSignalDuringCooldown,
  TERMINAL_COMPLETION_STATUSES,
  type CooldownLevel,
} from "../_shared/projectActivity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODEL = "google/gemini-2.5-flash";

type Signal = {
  category: string;
  entity_type: string;
  entity_id: string;
  reference?: string | null;
  summary: string;
  age_days?: number;
  amount?: number | null;
  deeplink?: string;
  last_contact_days?: number | null;
  cooldown?: CooldownLevel;
  project_id?: string | null;
};

function deeplinkProject(id: string) {
  return `/admin/projecten/${id}`;
}
function deeplinkAccommodation(id: string) {
  return `/admin/logies/${id}`;
}

/**
 * Voor een set project-ids: bepaal lastContactAt (max van project_communications.created_at
 * en program_request_items.status_updated_at) plus snoozed_until + completion_status + status.
 */
async function loadProjectActivity(
  supabase: ReturnType<typeof createClient>,
  projectIds: string[],
): Promise<Map<string, { cooldown: CooldownLevel; daysSinceContact: number | null; snoozed: boolean; completionStatus: string | null; status: string | null }>> {
  const result = new Map();
  if (projectIds.length === 0) return result;

  const [projectsRes, commsRes, itemsRes] = await Promise.all([
    supabase
      .from("program_requests")
      .select("id, status, completion_status, snoozed_until")
      .in("id", projectIds),
    supabase
      .from("project_communications")
      .select("project_id, created_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_request_items")
      .select("request_id, status_updated_at")
      .in("request_id", projectIds)
      .order("status_updated_at", { ascending: false }),
  ]);

  const lastContact = new Map<string, number>();
  for (const row of (commsRes.data ?? []) as any[]) {
    const t = new Date(row.created_at).getTime();
    if (!Number.isNaN(t)) {
      const cur = lastContact.get(row.project_id) ?? 0;
      if (t > cur) lastContact.set(row.project_id, t);
    }
  }
  for (const row of (itemsRes.data ?? []) as any[]) {
    if (!row.status_updated_at) continue;
    const t = new Date(row.status_updated_at).getTime();
    if (!Number.isNaN(t)) {
      const cur = lastContact.get(row.request_id) ?? 0;
      if (t > cur) lastContact.set(row.request_id, t);
    }
  }

  const now = new Date();
  for (const p of (projectsRes.data ?? []) as any[]) {
    const lcMs = lastContact.get(p.id) ?? null;
    const activity = getProjectActivityState(lcMs ? new Date(lcMs).toISOString() : null, now);
    result.set(p.id, {
      cooldown: activity.cooldown,
      daysSinceContact: activity.daysSinceContact,
      snoozed: !!(p.snoozed_until && new Date(p.snoozed_until).getTime() > now.getTime()),
      completionStatus: p.completion_status ?? null,
      status: p.status ?? null,
    });
  }
  return result;
}

async function gatherSignals(supabase: ReturnType<typeof createClient>): Promise<{ signals: Signal[]; suppressed: number }> {
  const raw: Signal[] = [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // === 1. Items wachten op partner-akkoord (>3 dagen pending) ===
  const cutoff3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pendingItems } = await supabase
    .from("program_request_items")
    .select(
      "id, request_id, block_name, status, item_quote_status, created_at, status_updated_at, skip_partner_notification, block_type, program_requests:request_id(id, reference_number, status, customer_name, customer_company)"
    )
    .eq("status", "pending")
    .neq("block_type", "bureau")
    .eq("skip_partner_notification", false)
    .lte("status_updated_at", cutoff3d)
    .limit(20);

  (pendingItems ?? []).forEach((it: any) => {
    if (it.program_requests?.status !== "active") return;
    const sent = new Date(it.status_updated_at ?? it.created_at);
    const age = Math.floor((now.getTime() - sent.getTime()) / (24 * 60 * 60 * 1000));
    const projectLabel = it.program_requests?.customer_company || it.program_requests?.customer_name || "onbekende klant";
    const ref = it.program_requests?.reference_number ?? "";
    raw.push({
      category: "partner_overdue",
      entity_type: "program_request",
      entity_id: it.request_id,
      project_id: it.request_id,
      reference: it.program_requests?.reference_number,
      summary: `Onderdeel "${it.block_name}" in project ${ref} (${projectLabel}) wacht ${age} dagen op partner-reactie`,
      age_days: age,
      deeplink: deeplinkProject(it.request_id),
    });
  });

  // === 2. Logies-aanvragen zonder offertes ===
  const { data: idleLodging } = await supabase
    .from("accommodation_requests")
    .select("id, reference_number, customer_name, created_at, status, quotes_requested_count, linked_program_id, program_requests:linked_program_id(status)")
    .in("status", ["submitted", "processing", "pending"])
    .eq("quotes_requested_count", 0)
    .lte("created_at", new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString())
    .limit(10);

  (idleLodging ?? []).forEach((r: any) => {
    const linkedProgramStatus = r.program_requests?.status;
    if (linkedProgramStatus === "cancelled" || linkedProgramStatus === "completed") return;
    const age = Math.floor((now.getTime() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
    raw.push({
      category: "lodging_no_quotes",
      entity_type: "accommodation_request",
      entity_id: r.id,
      project_id: r.linked_program_id ?? null,
      reference: r.reference_number,
      summary: `Logies-aanvraag van ${r.customer_name} (${age} dagen oud) heeft nog 0 partners benaderd`,
      age_days: age,
      deeplink: deeplinkAccommodation(r.id),
    });
  });

  // === 3. Logies-quotes wachten op verwerking ===
  const { data: pendingQuotes } = await supabase
    .from("accommodation_quotes")
    .select("id, request_id, accommodation_name, submitted_at, status, price_total, accommodation_requests:request_id(reference_number, customer_name, status, linked_program_id, program_requests:linked_program_id(status))")
    .eq("status", "submitted")
    .is("forwarded_at", null)
    .lte("submitted_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
    .limit(15);

  (pendingQuotes ?? []).forEach((q: any) => {
    const parentStatus = q.accommodation_requests?.status;
    const linkedProgramStatus = q.accommodation_requests?.program_requests?.status;
    if (parentStatus === "cancelled" || parentStatus === "completed") return;
    if (linkedProgramStatus === "cancelled" || linkedProgramStatus === "completed") return;
    const age = Math.floor((now.getTime() - new Date(q.submitted_at).getTime()) / (24 * 60 * 60 * 1000));
    raw.push({
      category: "lodging_quote_unforwarded",
      entity_type: "accommodation_request",
      entity_id: q.request_id,
      project_id: q.accommodation_requests?.linked_program_id ?? null,
      reference: q.accommodation_requests?.reference_number,
      summary: `Offerte van ${q.accommodation_name} (€${q.price_total ?? "?"}) staat ${age} dagen klaar — nog niet doorgestuurd naar klant`,
      age_days: age,
      amount: q.price_total,
      deeplink: deeplinkAccommodation(q.request_id),
    });
  });

  // === 4. Aanvragen die binnenkort verlopen ===
  const soonExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiring } = await supabase
    .from("program_requests")
    .select("id, reference_number, customer_name, expires_at, status, customer_approved_at")
    .eq("status", "active")
    .is("customer_approved_at", null)
    .lte("expires_at", soonExpire)
    .gte("expires_at", now.toISOString())
    .limit(10);

  (expiring ?? []).forEach((r: any) => {
    const days = Math.ceil((new Date(r.expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    raw.push({
      category: "request_expiring",
      entity_type: "program_request",
      entity_id: r.id,
      project_id: r.id,
      reference: r.reference_number,
      summary: `Aanvraag van ${r.customer_name} verloopt over ${days} dagen zonder klant-akkoord`,
      age_days: -days,
      deeplink: deeplinkProject(r.id),
    });
  });

  // === 5. Open commissie-facturen ===
  const { data: openComms } = await supabase
    .from("commission_invoices")
    .select("id, invoice_number, recipient_name, invoice_date, amount_incl_vat, status, due_date")
    .in("status", ["sent", "forwarded"])
    .lte("invoice_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
    .limit(10);

  (openComms ?? []).forEach((inv: any) => {
    const age = Math.floor((now.getTime() - new Date(inv.invoice_date).getTime()) / (24 * 60 * 60 * 1000));
    raw.push({
      category: "commission_overdue",
      entity_type: "commission_invoice",
      entity_id: inv.id,
      reference: inv.invoice_number,
      summary: `Commissiefactuur ${inv.invoice_number} (${inv.recipient_name}, €${inv.amount_incl_vat}) staat ${age} dagen open`,
      age_days: age,
      amount: inv.amount_incl_vat,
      deeplink: "/admin/commissies/facturen",
    });
  });

  // === 6. Open todo's met due_date verstreken ===
  const { data: overdueTodos } = await supabase
    .from("admin_todos")
    .select("id, title, due_date, priority, related_request_id, program_requests:related_request_id(reference_number, customer_name, customer_company, completion_status, status)")
    .in("status", ["todo", "in_progress"])
    .not("due_date", "is", null)
    .lte("due_date", today)
    .limit(15);

  (overdueTodos ?? []).forEach((t: any) => {
    const age = Math.floor((now.getTime() - new Date(t.due_date).getTime()) / (24 * 60 * 60 * 1000));
    if (age >= 0) {
      const projectLabel = t.program_requests?.customer_company || t.program_requests?.customer_name;
      const ref = t.program_requests?.reference_number;
      const projectSuffix = ref ? ` — project ${ref}${projectLabel ? ` (${projectLabel})` : ""}` : "";
      raw.push({
        category: "todo_overdue",
        entity_type: "admin_todo",
        entity_id: t.id,
        project_id: t.related_request_id ?? null,
        reference: ref ?? undefined,
        summary: `Todo verstreken (${age} dgn): ${t.title}${projectSuffix}`,
        age_days: age,
        deeplink: t.related_request_id ? deeplinkProject(t.related_request_id) : "/admin/werkbank",
      });
    }
  });

  // === 7. Projecten klaar voor facturatie ===
  const { data: readyForInvoice } = await supabase
    .from("program_requests")
    .select("id, reference_number, customer_name, completion_status, updated_at")
    .eq("completion_status", "ready_for_invoice")
    .limit(10);

  (readyForInvoice ?? []).forEach((r: any) => {
    raw.push({
      category: "ready_for_invoice",
      entity_type: "program_request",
      entity_id: r.id,
      project_id: r.id,
      reference: r.reference_number,
      summary: `Project ${r.reference_number} (${r.customer_name}) is klaar voor facturatie`,
      deeplink: `/admin/projecten/${r.id}/factuur`,
    });
  });

  // === Cooldown/terminal/snooze filter per project ===
  const projectIds = Array.from(
    new Set(raw.map((s) => s.project_id).filter((x): x is string => !!x)),
  );
  const activity = await loadProjectActivity(supabase, projectIds);

  const signals: Signal[] = [];
  let suppressed = 0;
  for (const s of raw) {
    if (s.project_id) {
      const a = activity.get(s.project_id);
      if (a) {
        // Terminale completion_status → drop alles behalve ready_for_invoice signaal zelf
        if (
          a.completionStatus &&
          TERMINAL_COMPLETION_STATUSES.has(a.completionStatus) &&
          s.category !== "ready_for_invoice"
        ) {
          suppressed++;
          continue;
        }
        if (a.status === "cancelled" || a.status === "completed") {
          suppressed++;
          continue;
        }
        if (a.snoozed) {
          suppressed++;
          continue;
        }
        if (!shouldShowSignalDuringCooldown(a.cooldown, s.category)) {
          suppressed++;
          continue;
        }
        s.cooldown = a.cooldown;
        s.last_contact_days = a.daysSinceContact != null ? Math.round(a.daysSinceContact) : null;
      }
    }
    signals.push(s);
  }

  return { signals, suppressed };
}

interface PrioritizedRecommendation {
  kind: string;
  priority: "urgent" | "normal" | "info";
  title: string;
  body: string;
  related_entity_type: string;
  related_entity_id: string;
  deeplink?: string;
}

async function prioritizeWithAI(signals: Signal[], apiKey: string): Promise<PrioritizedRecommendation[]> {
  if (signals.length === 0) return [];

  const systemPrompt = `Je bent Claudia, operationele co-piloot van Bureau Vlieland (lokale specialist voor groepsprogramma's op Vlieland).
Je krijgt een lijst signalen uit de live database. Vat ze samen in maximaal 12 concrete, prioritaire actie-aanbevelingen voor de admin (Erwin).

Toon: zakelijk, bondig Nederlands, je-vorm naar Erwin. Geen emoji's. Geen prijsuitspraken. Geen adviezen die externe data nodig hebben (zoals weer of ferry-tijden).

Negeer signalen die betrekking hebben op geannuleerde of afgeronde aanvragen — daar is geen actie meer op nodig.

Cooldown-regels (cruciaal — minder ruis):
- Signalen met cooldown="hot" of last_contact_days <= 2: NOOIT als urgent labelen, meestal "info" of weglaten als er recent al actie is geweest.
- Signalen met cooldown="warm" (3–7 dagen): "normal" tenzij er een harde deadline of >€1000 op het spel staat.
- Signalen met cooldown="cold" of geen recent contact: normale prioriteit-regels.

Clustering: per project (zelfde related_entity_id) maximaal 1 aanbeveling, tenzij er aantoonbaar verschillende acties zijn (bijv. partner-reminder én facturatie).

Prioriteit-richtlijn:
- urgent: verloopt < 3 dagen, klant-vertrouwen op spel, geld > €1000 staat lang open, EN geen recent contact
- normal: actie nodig deze week
- info: goed om te weten, geen directe deadline

Schrijf elke 'body' in 1-2 zinnen met concrete vervolgactie ("stuur reminder X", "bel partner Y", "factureer Z").

BELANGRIJK: noem in elke aanbeveling (zowel title als body) altijd de projectnaam (klantnaam of bedrijfsnaam uit de summary) én het projectreferentienummer (bijv. BV-2606-0011) wanneer die in het signaal beschikbaar zijn.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Signalen (JSON):\n${JSON.stringify(signals, null, 2)}\n\nMaak hiervan een geprioriteerde aanbevelingenlijst.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_recommendations",
            description: "Submit the prioritized list of recommendations.",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      kind: {
                        type: "string",
                        description: "Categorie zoals partner_overdue, lodging_no_quotes, etc.",
                      },
                      priority: { type: "string", enum: ["urgent", "normal", "info"] },
                      title: { type: "string", description: "Korte titel, max 80 tekens" },
                      body: { type: "string", description: "Concrete actie, 1-2 zinnen" },
                      related_entity_type: { type: "string" },
                      related_entity_id: { type: "string" },
                      deeplink: { type: "string" },
                    },
                    required: ["kind", "priority", "title", "body"],
                  },
                },
              },
              required: ["recommendations"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_recommendations" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return [];
  const args = JSON.parse(toolCall.function.arguments);
  return args.recommendations ?? [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let runId: string | null = null;

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    await supabase.rpc("expire_stale_recommendations");

    const { data: runRow } = await supabase
      .from("claudia_run_log")
      .insert({ run_type: "daily_scan", status: "running", model: AI_MODEL })
      .select("id")
      .single();
    runId = runRow?.id ?? null;

    const { signals, suppressed } = await gatherSignals(supabase);

    const recommendations = signals.length > 0
      ? await prioritizeWithAI(signals, apiKey)
      : [];

    if (recommendations.length > 0) {
      await supabase
        .from("admin_recommendations")
        .update({ status: "expired" })
        .eq("status", "open");
    }

    if (recommendations.length > 0) {
      const rows = recommendations.map((r) => ({
        kind: r.kind,
        priority: r.priority,
        title: r.title.slice(0, 200),
        body: r.body,
        related_entity_type: r.related_entity_type,
        related_entity_id: r.related_entity_id,
        deeplink: r.deeplink,
        run_id: runId,
        source_signals: signals.filter(
          (s) => s.entity_type === r.related_entity_type && s.entity_id === r.related_entity_id,
        ),
      }));
      const { error } = await supabase.from("admin_recommendations").insert(rows);
      if (error) throw error;
    }

    if (runId) {
      await supabase
        .from("claudia_run_log")
        .update({
          status: "success",
          recommendations_created: recommendations.length,
          duration_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
          input_summary: { signals_count: signals.length, suppressed_by_cooldown: suppressed },
          output_summary: {
            recommendations: recommendations.length,
            urgent: recommendations.filter((r) => r.priority === "urgent").length,
          },
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals: signals.length,
        suppressed,
        recommendations: recommendations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("claudia-daily-scan error:", msg);
    if (runId) {
      await supabase
        .from("claudia_run_log")
        .update({
          status: "error",
          error_message: msg,
          duration_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
