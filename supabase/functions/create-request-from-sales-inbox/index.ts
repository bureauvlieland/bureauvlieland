// Create a program_request from a sales_inbox row. Called by the admin UI after
// the user reviews/edits the AI-parsed lead data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadInput {
  inbox_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_company?: string | null;
  number_of_people?: number | null;
  selected_dates?: string[];
  general_notes?: string | null;
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// ---- Dutch date parser (zie ook src/lib/parseDutchDates.ts) ----
const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mrt: 3, maart: 3, mar: 3,
  apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7,
  aug: 8, augustus: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, dec: 12, december: 12,
};
function toIso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
interface Parts { day: number; month?: number; year?: number; }
function parseSingle(input: string): Parts | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return { year: +iso[1], month: +iso[2], day: +iso[3] };
  const numeric = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (numeric) {
    let y = +numeric[3]; if (y < 100) y += 2000;
    return { day: +numeric[1], month: +numeric[2], year: y };
  }
  const m = s.match(/^(\d{1,2})(?:\s+([a-zë.]+))?(?:\s+(\d{4}))?$/i);
  if (m) {
    const day = +m[1];
    let month: number | undefined;
    if (m[2]) {
      const mm = MONTHS[m[2].replace(/\./g, "")];
      if (mm == null) return null;
      month = mm;
    }
    return { day, month, year: m[3] ? +m[3] : undefined };
  }
  return null;
}
function expandRange(left: Parts, right: Parts): string[] | null {
  const l = { ...left }, r = { ...right };
  if (l.month == null) l.month = r.month;
  if (l.year == null) l.year = r.year;
  if (r.month == null) r.month = l.month;
  if (r.year == null) r.year = l.year;
  if (l.month == null || l.year == null || r.month == null || r.year == null) return null;
  const startIso = toIso(l.year, l.month, l.day);
  const endIso = toIso(r.year, r.month, r.day);
  if (!startIso || !endIso) return null;
  const start = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  if (end < start) return null;
  const out: string[] = [];
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 60) {
    const iso = toIso(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate());
    if (iso) out.push(iso);
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return out;
}
const RANGE_SPLIT = /\s*(?:tot en met|t\/m|t\.?m\.?|tm|-|–|—|tot)\s*/i;
function parseToken(token: string): { dates: string[]; ok: boolean } {
  const t = token.trim();
  if (!t) return { dates: [], ok: true };
  const numericFull = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/;
  const isoFull = /^\d{4}-\d{1,2}-\d{1,2}$/;
  if (numericFull.test(t) || isoFull.test(t)) {
    const p = parseSingle(t);
    if (!p || p.month == null || p.year == null) return { dates: [], ok: false };
    const iso = toIso(p.year, p.month, p.day);
    return iso ? { dates: [iso], ok: true } : { dates: [], ok: false };
  }
  const parts = t.split(RANGE_SPLIT).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    const left = parseSingle(parts[0]);
    const right = parseSingle(parts[1]);
    if (left && right) {
      const range = expandRange(left, right);
      if (range && range.length) return { dates: range, ok: true };
    }
    return { dates: [], ok: false };
  }
  const single = parseSingle(t);
  if (!single || single.month == null || single.year == null) return { dates: [], ok: false };
  const iso = toIso(single.year, single.month, single.day);
  return iso ? { dates: [iso], ok: true } : { dates: [], ok: false };
}
function normalizeDates(input: unknown): { dates: string[]; invalid: string[] } {
  const raw = Array.isArray(input) ? input.join(", ") : (typeof input === "string" ? input : "");
  if (!raw.trim()) return { dates: [], invalid: [] };
  const tokens = raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const set = new Set<string>();
  const invalid: string[] = [];
  for (const tok of tokens) {
    const { dates, ok } = parseToken(tok);
    if (!ok) invalid.push(tok);
    for (const d of dates) set.add(d);
  }
  return { dates: Array.from(set).sort(), invalid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as LeadInput;
    if (!body?.inbox_id || !body?.customer_name || !body?.customer_email) {
      return new Response(JSON.stringify({ error: "inbox_id, customer_name and customer_email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inbox, error: inboxErr } = await supabase
      .from("sales_inbox")
      .select("id, status, processed_request_id, attachments, subject, from_email")
      .eq("id", body.inbox_id)
      .single();
    if (inboxErr || !inbox) {
      return new Response(JSON.stringify({ error: "sales_inbox row not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inbox.status === "processed" && inbox.processed_request_id) {
      return new Response(JSON.stringify({ request_id: inbox.processed_request_id, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedDates = Array.isArray(body.selected_dates) ? body.selected_dates : [];
    const numberOfPeople = Number.isFinite(body.number_of_people as number) && (body.number_of_people as number) > 0
      ? Math.floor(body.number_of_people as number)
      : 20;

    const { data: newRequest, error: insErr } = await supabase
      .from("program_requests")
      .insert({
        customer_token: generateToken(),
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone || "",
        customer_company: body.customer_company || null,
        number_of_people: numberOfPeople,
        selected_dates: selectedDates,
        general_notes: body.general_notes || null,
        status: "active",
        origin: "sales_inbox",
        admin_created_by: userData.user.id,
      })
      .select("id, reference_number")
      .single();

    if (insErr || !newRequest) {
      console.error("create program_request error:", insErr);
      return new Response(JSON.stringify({ error: insErr?.message || "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark inbox row as processed
    await supabase
      .from("sales_inbox")
      .update({
        status: "processed",
        processed_request_id: newRequest.id,
        processed_by: userData.user.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", body.inbox_id);

    // Log the original email as inbound communication on the new project
    await supabase.from("project_communications").insert({
      request_id: newRequest.id,
      communication_type: "email_in",
      direction: "inbound",
      audience: "admin",
      subject: inbox.subject || "Sales-aanvraag",
      content: "Bron: Sales Inbox (zie originele mail in inbox).",
      contact_email: inbox.from_email,
      communication_date: new Date().toISOString(),
      metadata: {
        source: "sales_inbox",
        sales_inbox_id: body.inbox_id,
        attachments: inbox.attachments || [],
      },
    });

    return new Response(
      JSON.stringify({
        status: "ok",
        request_id: newRequest.id,
        reference_number: newRequest.reference_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-request-from-sales-inbox error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
