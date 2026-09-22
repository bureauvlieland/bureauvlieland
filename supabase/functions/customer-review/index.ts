// customer-review
//
// De beoordelingspagina (/beoordeling/:token) praat alleen met deze functie:
// - action "context": voor wie is de pagina, is er al een beoordeling, en
//   welke Google-link op de bedankpagina hoort;
// - action "submit": de beoordeling opslaan, één per programma, met de twee
//   toestemmingen en het IP van dat moment; bij een score van 3 of lager een
//   taak met hoge prioriteit voor het bureau;
// - action "clicked": vastleggen dat de klant op de Google-knop klikte
//   (voor de herinnering en de meting). Tripadvisor is bewust weggelaten
//   (besluit Erwin, 22 september 2026).
//
// Openbaar (verify_jwt = false): de beoordelingslink is het bewijs, net als
// het portaal-token. Zie docs/plan-reviews-oogsten.md, fase 1.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { formatDateNL } from "../_shared/email-templates.ts";

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

export const SubmitSchema = z.object({
  token: TokenSchema,
  rating: z.number().int().min(1).max(5),
  text_positive: z.string().trim().max(2000).default(""),
  text_improve: z.string().trim().max(2000).default(""),
  author_name: z.string().trim().min(1).max(120),
  author_role: z.string().trim().max(120).default(""),
  company: z.string().trim().max(160).default(""),
  consent_publish: z.boolean().default(false),
  consent_reference: z.boolean().default(false),
});

export const ClickedSchema = z.object({ token: TokenSchema });

/** Een score van 3 of lager krijgt persoonlijke opvolging. */
export const isLowRating = (rating: number): boolean => rating <= 3;

/** "bezoek op 12 juni 2026" of "bezoek van 12 t/m 14 juni 2026", leeg zonder data. */
export function programDateLabel(dates: unknown): string {
  if (!Array.isArray(dates)) return "";
  const list = dates.filter((d): d is string => typeof d === "string" && d.length > 0).sort();
  if (list.length === 0) return "";
  if (list.length === 1) return `bezoek op ${formatDateNL(list[0])}`;
  return `bezoek van ${formatDateNL(list[0])} t/m ${formatDateNL(list[list.length - 1])}`;
}

/** Het adres van de klant uit de proxy-headers, voor het toestemmingsbewijs. */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || null;
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
}

const PROGRAM_COLUMNS = "id, reference_number, customer_name, customer_company, selected_dates, status, cancelled_at";
const REVIEW_COLUMNS =
  "id, rating, text_positive, author_name, author_role, company, consent_publish, consent_reference, google_clicked_at, created_at";

const DEFAULT_GOOGLE_URL = "https://g.page/r/CREi-TJGNt7kEAE/review";

// De handler werkt met een client die van buiten komt, zodat de test een
// stub kan meegeven. Alleen de paar methodes die hier gebruikt worden; de
// echte Supabase-client past daar structureel op.
interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}
interface Query extends PromiseLike<QueryResult> {
  select(columns: string): Query;
  insert(row: Record<string, unknown>): Query;
  update(patch: Record<string, unknown>): Query;
  eq(column: string, value: unknown): Query;
  is(column: string, value: unknown): Query;
  in(column: string, values: unknown[]): Query;
  maybeSingle(): Query;
  single(): Query;
}
export interface Client {
  from(table: string): Query;
}

interface ProgramRow {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_company: string | null;
  selected_dates: unknown;
  status: string | null;
  cancelled_at: string | null;
}

async function loadLinks(supabase: Client): Promise<{ google: string }> {
  const { data } = await supabase
    .from("app_settings")
    .select("id, value")
    .in("id", ["customer_aftersales_google_url"]);
  const rows = (data ?? []) as { id: string; value: unknown }[];
  const waarde = rows.find((r) => r.id === "customer_aftersales_google_url")?.value;
  return { google: typeof waarde === "string" && waarde.trim() ? waarde.trim() : DEFAULT_GOOGLE_URL };
}

export async function handleReview(req: Request, supabase: Client): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return json(400, { error: "invalid_body" });

  const action = body.action;
  const tokenParsed = TokenSchema.safeParse(body.token);
  if (!tokenParsed.success) return json(400, { error: "invalid_token" });
  const token = tokenParsed.data;

  const { data: program, error: programError } = await supabase
    .from("program_requests")
    .select(PROGRAM_COLUMNS)
    .eq("review_token", token)
    .maybeSingle();
  if (programError) {
    console.error("customer-review lookup error:", programError);
    return json(500, { error: "lookup_failed" });
  }
  const row = program as ProgramRow | null;
  if (!row || row.cancelled_at || row.status === "cancelled") return json(404, { error: "not_found" });

  const { data: existing } = await supabase
    .from("customer_reviews")
    .select(REVIEW_COLUMNS)
    .eq("request_id", row.id)
    .maybeSingle();

  if (action === "context") {
    const links = await loadLinks(supabase);
    return json(200, {
      program: {
        reference_number: row.reference_number,
        customer_name: row.customer_name,
        company: row.customer_company,
        date_label: programDateLabel(row.selected_dates),
      },
      review: existing ?? null,
      links,
    });
  }

  if (action === "submit") {
    if (existing) return json(409, { error: "already_reviewed", review: existing });
    const parsed = SubmitSchema.safeParse({ ...body, token });
    if (!parsed.success) return json(400, { error: "invalid_review", details: parsed.error.flatten().fieldErrors });
    const input = parsed.data;
    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("customer_reviews")
      .insert({
        request_id: row.id,
        rating: input.rating,
        text_positive: input.text_positive,
        text_improve: input.text_improve,
        author_name: input.author_name,
        author_role: input.author_role,
        company: input.company,
        consent_publish: input.consent_publish,
        consent_reference: input.consent_reference,
        consent_at: now,
        consent_ip: clientIp(req),
        source: "portal",
      })
      .select(REVIEW_COLUMNS)
      .single();
    if (insertError) {
      console.error("customer-review insert error:", insertError);
      return json(500, { error: "save_failed" });
    }

    if (isLowRating(input.rating)) {
      const naam = input.company || input.author_name;
      const toelichting = input.text_improve || input.text_positive;
      const { error: todoError } = await supabase.from("admin_todos").insert({
        title: `Lage beoordeling (${input.rating}/5) van ${naam}`,
        description: `${row.reference_number ? `${row.reference_number}: ` : ""}neem persoonlijk contact op.${toelichting ? ` Klant schrijft: "${toelichting.slice(0, 400)}"` : ""}`,
        priority: "high",
        status: "todo",
        related_request_id: row.id,
        auto_type: "customer_review_low",
        auto_entity_id: row.id,
      });
      if (todoError) console.error("customer-review todo error:", todoError);
    }

    const links = await loadLinks(supabase);
    return json(200, { review: inserted, links });
  }

  if (action === "clicked") {
    if (!ClickedSchema.safeParse({ token }).success) return json(400, { error: "invalid_token" });
    if (!existing) return json(404, { error: "no_review" });
    const { error: updateError } = await supabase
      .from("customer_reviews")
      .update({ google_clicked_at: new Date().toISOString() })
      .eq("request_id", row.id)
      .is("google_clicked_at", null);
    if (updateError) console.error("customer-review click error:", updateError);
    return json(200, { ok: true });
  }

  return json(400, { error: "unknown_action" });
}

export const handler = (req: Request): Promise<Response> =>
  handleReview(
    req,
    createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!) as unknown as Client,
  );

if (import.meta.main) Deno.serve(handler);
