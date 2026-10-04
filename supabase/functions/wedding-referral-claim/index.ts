// wedding-referral-claim
//
// De pagina achter de link in de partnermail (/doorverwijzing/:token,
// docs/plan-bruiloftsdoorverwijzingen.md → Mail aan de partner): "Was dit
// bruidspaar al bij jullie bekend?". Twee acties:
// - "status": voor wie is de link, en kan er nog gemeld worden;
// - "report": de partner meldt dat het bruidspaar al bekend was, met de datum
//   van het eerste contact en een optionele opmerking.
//
// Openbaar (verify_jwt = false): de link is het bewijs, net als bij de
// beoordelingspagina. De link werkt tot en met de vijfde werkdag (Nederlandse
// tijd) na de doorverwijsmail; daarna is hij verlopen en verandert er niets
// meer. Een melding legt "al bekend" vast op de doorverwijzing; de vergoeding
// valt dan weg (zie src/lib/weddingReferrals.ts) en het bureau krijgt een taak.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { amsterdamDate, claimDeadline, formatIsoDateNL, isClaimWindowOpen, isValidIsoDate } from "../_shared/weddingReferralDates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TokenSchema = z.string().trim().min(16).max(128);

export const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), token: TokenSchema }),
  z.object({
    action: z.literal("report"),
    token: TokenSchema,
    firstContactAt: z.string().trim().max(20).default(""),
    note: z.string().trim().max(2000).default(""),
  }),
]);

export type ClaimInput = z.infer<typeof BodySchema>;

export type ClaimState = "open" | "reported" | "expired";

export interface ClaimRow {
  id: string;
  request_id: string | null;
  partner_id: string;
  couple_names: string;
  referred_at: string;
  partner_claim: string;
  partner_claim_reported_at: string | null;
  partner_claim_first_contact_at: string | null;
  partner_claim_note: string;
}

/** Wat de pagina te zien krijgt. Geen contactgegevens van het bruidspaar, alleen de namen. */
export interface ClaimView {
  state: ClaimState;
  partnerName: string;
  coupleNames: string;
  referredAt: string;
  deadline: string;
  reportedAt: string | null;
  firstContactAt: string | null;
  note: string;
}

/** Gemeld, of nog open, of verlopen (vijf werkdagen na de doorverwijsmail, Nederlandse tijd). */
export function claimState(row: Pick<ClaimRow, "partner_claim" | "referred_at">, today: string): ClaimState {
  if (row.partner_claim === "already_known") return "reported";
  return isClaimWindowOpen(row.referred_at, today) ? "open" : "expired";
}

export function toView(row: ClaimRow, partnerName: string, state: ClaimState): ClaimView {
  return {
    state,
    partnerName,
    coupleNames: row.couple_names,
    referredAt: row.referred_at,
    deadline: claimDeadline(row.referred_at),
    reportedAt: row.partner_claim_reported_at,
    firstContactAt: row.partner_claim_first_contact_at,
    note: row.partner_claim_note ?? "",
  };
}

// Minimale typering van de Supabase-client zodat de handler met een stub te
// testen is; de echte client wordt in Deno.serve hieronder hiernaar gecast.
export interface QueryBuilder extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  select: (columns?: string) => QueryBuilder;
  insert: (row: Record<string, unknown>) => QueryBuilder;
  update: (row: Record<string, unknown>) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => QueryBuilder;
}
export interface Db {
  from: (table: string) => QueryBuilder;
}

export interface ClaimContext {
  db: Db;
  now: Date;
}

export type ClaimResult = { status: number; body: Record<string, unknown> };

const COLUMNS =
  "id, request_id, partner_id, couple_names, referred_at, partner_claim, partner_claim_reported_at, partner_claim_first_contact_at, partner_claim_note";

export async function handleClaim(input: ClaimInput, ctx: ClaimContext): Promise<ClaimResult> {
  const { data, error } = await ctx.db.from("wedding_referrals").select(COLUMNS).eq("claim_token", input.token).maybeSingle();
  if (error) return { status: 500, body: { error: "server_error" } };
  if (!data) return { status: 404, body: { error: "not_found" } };
  const row = data as ClaimRow;

  const { data: partnerRij } = await ctx.db.from("partners").select("name").eq("id", row.partner_id).maybeSingle();
  const partnerName = (partnerRij as { name: string } | null)?.name ?? "";

  const vandaag = amsterdamDate(ctx.now);
  const state = claimState(row, vandaag);

  if (input.action === "status") return { status: 200, body: { view: toView(row, partnerName, state) } };

  // Eerder gemeld: niets overschrijven, de pagina toont gewoon de melding.
  if (state === "reported") return { status: 200, body: { view: toView(row, partnerName, state) } };
  if (state === "expired") return { status: 410, body: { error: "expired", view: toView(row, partnerName, state) } };

  const eerstContact = input.firstContactAt;
  if (!eerstContact) return { status: 400, body: { error: "Vul de datum van jullie eerste contact in." } };
  if (!isValidIsoDate(eerstContact)) return { status: 400, body: { error: "Dit is geen geldige datum." } };
  if (eerstContact > row.referred_at) {
    return {
      status: 400,
      body: { error: `Het eerste contact moet vóór onze doorverwijzing van ${formatIsoDateNL(row.referred_at)} liggen. Was dat later, dan was het bruidspaar nog niet bij jullie bekend.` },
    };
  }

  const nu = ctx.now.toISOString();
  const { data: bijgewerkt, error: updateError } = await ctx.db
    .from("wedding_referrals")
    .update({
      partner_claim: "already_known",
      partner_claim_reported_at: vandaag,
      partner_claim_first_contact_at: eerstContact,
      partner_claim_note: input.note,
      partner_claim_submitted_at: nu,
      partner_claim_source: "link",
    })
    .eq("id", row.id)
    .eq("partner_claim", "none")
    .select("id");
  if (updateError) return { status: 500, body: { error: "server_error" } };
  // Tussen lezen en schrijven was er al een melding (dubbel klikken): dan staat die er nu.
  if (Array.isArray(bijgewerkt) && bijgewerkt.length === 0) {
    return { status: 200, body: { view: toView({ ...row, partner_claim: "already_known" }, partnerName, "reported") } };
  }

  const gemeld: ClaimRow = {
    ...row,
    partner_claim: "already_known",
    partner_claim_reported_at: vandaag,
    partner_claim_first_contact_at: eerstContact,
    partner_claim_note: input.note,
  };

  // Een taak voor het bureau: controleer de doorverwijzing; bij een boeking is de vergoeding nul.
  const { error: todoError } = await ctx.db.from("admin_todos").insert({
    title: `${partnerName || "Partner"} meldt: ${row.couple_names} was al bekend`.slice(0, 200),
    description: [
      `Eerste contact volgens de partner: ${formatIsoDateNL(eerstContact)}.`,
      input.note ? `Opmerking: ${input.note}` : null,
      "Bekijk de doorverwijzing onder Bruiloften. Bij een boeking is de vergoeding dan nul.",
    ]
      .filter(Boolean)
      .join("\n"),
    priority: "normal",
    status: "todo",
    related_partner_id: row.partner_id,
    related_request_id: row.request_id,
    auto_type: "wedding_referral_claim",
    auto_entity_id: row.id,
  });
  if (todoError) console.error("wedding-referral-claim: taak niet aangemaakt:", todoError.message);

  return { status: 200, body: { view: toView(gemeld, partnerName, "reported") } };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return json(400, { error: "invalid_request" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const result = await handleClaim(parsed.data, { db: supabase as unknown as Db, now: new Date() });
    return json(result.status, result.body);
  } catch (error) {
    console.error("Error in wedding-referral-claim:", error);
    return json(500, { error: "server_error" });
  }
}

if (import.meta.main) Deno.serve(handler);
