// reference-case
//
// De akkoordpagina (/referentie-akkoord/:token) praat alleen met deze
// functie (docs/plan-reviews-oogsten.md, fase 3):
// - action "context": de concept-referentiepagina zoals de klant hem ziet,
//   plus de status; het token uit de akkoordmail is het bewijs (ook in
//   concept, zodat het bureau de pagina met dezelfde link kan voorvertonen);
// - action "approve": akkoord vastleggen (tijdstip, naam, IP) en een taak
//   voor het bureau om te publiceren;
// - action "feedback": een wijzigingswens vastleggen en een taak met hoge
//   prioriteit voor het bureau.
//
// Openbaar (verify_jwt = false). Publiceren gebeurt nooit hier: dat doet
// het bureau in admin, pas na het akkoord.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TokenSchema = z.string().trim().min(16).max(128);

export const ApproveSchema = z.object({
  token: TokenSchema,
  name: z.string().trim().min(1).max(120),
});

export const FeedbackSchema = z.object({
  token: TokenSchema,
  text: z.string().trim().min(3).max(4000),
});

/** Het adres van de klant uit de proxy-headers, voor het akkoordbewijs. */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || null;
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
}

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}
interface Query extends PromiseLike<QueryResult> {
  select(columns: string): Query;
  insert(row: Record<string, unknown>): Query;
  update(patch: Record<string, unknown>): Query;
  eq(column: string, value: unknown): Query;
  maybeSingle(): Query;
  single(): Query;
}
export interface Client {
  from(table: string): Query;
}

const CASE_COLUMNS =
  "id, request_id, slug, title, intro, body, quote, quote_author, quote_role, company, group_size, program_date, days, facts, program, photos, block_ids, status, approval_sent_at, approved_at, approved_name, feedback, feedback_at";

interface CaseRow {
  id: string;
  request_id: string | null;
  slug: string;
  title: string;
  intro: string;
  body: string;
  quote: string;
  quote_author: string;
  quote_role: string;
  company: string;
  group_size: number | null;
  program_date: string | null;
  days: number;
  facts: unknown;
  program: unknown;
  photos: unknown;
  block_ids: string[];
  status: string;
  approval_sent_at: string | null;
  approved_at: string | null;
  approved_name: string | null;
  feedback: string | null;
  feedback_at: string | null;
}

interface ProgramRow {
  reference_number: string | null;
  customer_name: string | null;
}

/** Wat de klant te zien krijgt: de inhoud en de status, zonder interne velden. */
export function publicView(row: CaseRow, program: ProgramRow | null) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    intro: row.intro,
    body: row.body,
    quote: row.quote,
    quote_author: row.quote_author,
    quote_role: row.quote_role,
    company: row.company,
    group_size: row.group_size,
    program_date: row.program_date,
    days: row.days,
    facts: row.facts,
    program: row.program,
    photos: row.photos,
    block_ids: row.block_ids,
    status: row.status,
    approved_at: row.approved_at,
    approved_name: row.approved_name,
    feedback_at: row.feedback_at,
    reference_number: program?.reference_number ?? null,
    customer_name: program?.customer_name ?? null,
  };
}

export async function handleReferenceCase(req: Request, supabase: Client): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return json(400, { error: "invalid_body" });

  const tokenParsed = TokenSchema.safeParse(body.token);
  if (!tokenParsed.success) return json(400, { error: "invalid_token" });
  const token = tokenParsed.data;
  const action = body.action;

  const { data, error } = await supabase
    .from("reference_cases")
    .select(CASE_COLUMNS)
    .eq("approval_token", token)
    .maybeSingle();
  if (error) {
    console.error("reference-case lookup error:", error);
    return json(500, { error: "lookup_failed" });
  }
  const row = data as CaseRow | null;
  if (!row || row.status === "hidden") return json(404, { error: "not_found" });

  let program: ProgramRow | null = null;
  if (row.request_id) {
    const { data: p } = await supabase
      .from("program_requests")
      .select("reference_number, customer_name")
      .eq("id", row.request_id)
      .maybeSingle();
    program = (p as ProgramRow | null) ?? null;
  }

  if (action === "context") return json(200, { case: publicView(row, program) });

  if (action === "approve") {
    const parsed = ApproveSchema.safeParse({ ...body, token });
    if (!parsed.success) return json(400, { error: "invalid_approval" });
    if (row.approved_at) return json(200, { case: publicView(row, program), already: true });

    const now = new Date().toISOString();
    const patch = {
      approved_at: now,
      approved_name: parsed.data.name,
      approved_ip: clientIp(req),
      status: row.status === "draft" || row.status === "sent" ? "approved" : row.status,
    };
    const { data: updated, error: updateError } = await supabase
      .from("reference_cases")
      .update(patch)
      .eq("id", row.id)
      .select(CASE_COLUMNS)
      .single();
    if (updateError) {
      console.error("reference-case approve error:", updateError);
      return json(500, { error: "save_failed" });
    }

    const { error: todoError } = await supabase.from("admin_todos").insert({
      title: `Referentiepagina goedgekeurd door ${parsed.data.name}: publiceren`,
      description: `${program?.reference_number ? `${program.reference_number}: ` : ""}"${row.title}" is akkoord bevonden. Zet de pagina in Content → Referenties op gepubliceerd.`,
      priority: "normal",
      status: "todo",
      related_request_id: row.request_id,
      auto_type: "reference_case_approved",
      auto_entity_id: row.id,
    });
    if (todoError) console.error("reference-case todo error:", todoError);

    return json(200, { case: publicView(updated as CaseRow, program) });
  }

  if (action === "feedback") {
    const parsed = FeedbackSchema.safeParse({ ...body, token });
    if (!parsed.success) return json(400, { error: "invalid_feedback" });
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("reference_cases")
      .update({ feedback: parsed.data.text, feedback_at: now })
      .eq("id", row.id);
    if (updateError) {
      console.error("reference-case feedback error:", updateError);
      return json(500, { error: "save_failed" });
    }
    const { error: todoError } = await supabase.from("admin_todos").insert({
      title: `Klant wil de referentiepagina anders: ${row.company || row.title}`,
      description: `${program?.reference_number ? `${program.reference_number}: ` : ""}"${parsed.data.text.slice(0, 600)}"`,
      priority: "high",
      status: "todo",
      related_request_id: row.request_id,
      auto_type: "reference_case_feedback",
      auto_entity_id: row.id,
    });
    if (todoError) console.error("reference-case todo error:", todoError);
    return json(200, { ok: true });
  }

  return json(400, { error: "unknown_action" });
}

export const handler = (req: Request): Promise<Response> =>
  handleReferenceCase(
    req,
    createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!) as unknown as Client,
  );

if (import.meta.main) Deno.serve(handler);
