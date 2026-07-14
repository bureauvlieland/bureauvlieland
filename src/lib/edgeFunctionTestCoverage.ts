/**
 * Statisch overzicht van edge functions + hun testdekking.
 *
 * Waarom statisch? Deno-tests draaien buiten Vite en zijn niet runtime-
 * queryable vanuit de client. Dit bestand is de bron van waarheid voor
 * `/admin/email-health` en moet bijgewerkt worden zodra een nieuwe test
 * verschijnt onder `supabase/functions/*_test.ts` / `*.test.ts` — of een
 * nieuwe edge function wordt toegevoegd.
 *
 * `critical` markeert functies waar het ontbreken van tests direct
 * facturatie- of communicatie-risico oplevert (mail-verzenders,
 * webhooks, factuur- en workflow-mutaties).
 */

export type EdgeFunctionCategory =
  | "invoicing"
  | "customer_email"
  | "partner_email"
  | "webhook"
  | "workflow"
  | "utility"
  | "internal";

export interface EdgeFunctionCoverage {
  name: string;
  category: EdgeFunctionCategory;
  critical: boolean;
  tested: boolean;
  testKind?: "deno" | "e2e";
}

/**
 * Functies met een Deno- of E2E-test in de repo. Herzie deze lijst wanneer
 * je een nieuw `*_test.ts` / `*.test.ts` bestand toevoegt onder
 * `supabase/functions/**` of een nieuwe `tests/e2e/*.spec.ts` de functie
 * end-to-end afdekt.
 */
const TESTED: Record<string, "deno" | "e2e"> = {
  "auto-close-past-execution": "deno",
  "cancel-program-request": "deno",
  "confirm-partner-commission": "deno",
  "get-admin-commissions": "deno",
  "inbound-purchase-invoice": "e2e",
  "mailjet-event-webhook": "e2e",
  "notify-partner-cancellation": "deno",
  "register-accommodation-invoice": "deno",
  "register-partner-invoice": "deno",
  "send-accommodation-quote-request": "deno",
  "send-bureau-invoice-to-customer": "deno",
  "send-commission-invoice-to-partner": "deno",
  "send-customer-aftersales": "deno",
  "send-guest-details-reminder": "deno",
  "send-items-to-partners": "deno",
  "send-quote-offer": "deno",
  "send-ticket-email": "deno",
};

type Row = { name: string; category: EdgeFunctionCategory; critical: boolean };

const REGISTRY: Row[] = [
  // ── Invoicing ───────────────────────────────────────────────────────────
  { name: "send-bureau-invoice-to-customer", category: "invoicing", critical: true },
  { name: "send-commission-invoice-to-partner", category: "invoicing", critical: true },
  { name: "register-accommodation-invoice", category: "invoicing", critical: true },
  { name: "register-partner-invoice", category: "invoicing", critical: true },
  { name: "forward-bureau-invoice", category: "invoicing", critical: true },
  { name: "forward-commission-invoice", category: "invoicing", critical: true },
  { name: "forward-purchase-invoice", category: "invoicing", critical: true },
  { name: "forward-purchase-invoice-outlook", category: "invoicing", critical: true },
  { name: "apply-purchase-invoice-to-lodging", category: "invoicing", critical: true },
  { name: "parse-collective-invoice", category: "invoicing", critical: true },
  { name: "finalize-collective-invoice", category: "invoicing", critical: true },
  { name: "classify-lodging-invoice-lines", category: "invoicing", critical: true },
  { name: "scan-purchase-invoice", category: "invoicing", critical: true },
  { name: "scan-purchase-invoice-internal", category: "invoicing", critical: false },
  { name: "rescan-inbox-invoices", category: "invoicing", critical: false },
  { name: "generate-payment-batch", category: "invoicing", critical: true },
  { name: "match-bank-lines", category: "invoicing", critical: true },
  { name: "parse-bank-statement", category: "invoicing", critical: false },
  { name: "confirm-partner-commission", category: "invoicing", critical: true },
  { name: "confirm-pending-commissions", category: "invoicing", critical: false },
  { name: "update-commission-status", category: "invoicing", critical: true },
  { name: "get-admin-commissions", category: "invoicing", critical: false },
  { name: "notify-partners-missing-invoice-pdf", category: "invoicing", critical: false },

  // ── Webhooks / inbound ──────────────────────────────────────────────────
  { name: "mailjet-event-webhook", category: "webhook", critical: true },
  { name: "inbound-email", category: "webhook", critical: true },
  { name: "inbound-purchase-invoice", category: "webhook", critical: true },
  { name: "whatsapp-webhook", category: "webhook", critical: false },
  { name: "mailjet-tracking", category: "webhook", critical: false },

  // ── Customer email flows ────────────────────────────────────────────────
  { name: "send-quote-offer", category: "customer_email", critical: true },
  { name: "send-quote-request", category: "customer_email", critical: true },
  { name: "send-program-request", category: "customer_email", critical: true },
  { name: "send-project-email", category: "customer_email", critical: true },
  { name: "send-customer-aftersales", category: "customer_email", critical: true },
  { name: "send-customer-accommodation-message", category: "customer_email", critical: true },
  { name: "send-arrival-reminder", category: "customer_email", critical: true },
  { name: "send-guest-details-reminder", category: "customer_email", critical: true },
  { name: "send-ticket-email", category: "customer_email", critical: true },
  { name: "resend-customer-link", category: "customer_email", critical: false },
  { name: "resend-email", category: "customer_email", critical: false },
  
  { name: "notify-new-chat", category: "customer_email", critical: false },
  { name: "notify-new-chat-reply", category: "customer_email", critical: false },

  // ── Partner email flows ─────────────────────────────────────────────────
  { name: "send-items-to-partners", category: "partner_email", critical: true },
  { name: "send-accommodation-quote-request", category: "partner_email", critical: true },
  { name: "send-accommodation-request", category: "partner_email", critical: true },
  { name: "send-catering-request", category: "partner_email", critical: true },
  { name: "send-partner-customer-message", category: "partner_email", critical: true },
  { name: "send-partner-headsup-t3", category: "partner_email", critical: false },
  { name: "send-partner-intro-email", category: "partner_email", critical: false },
  { name: "send-partner-mailing", category: "partner_email", critical: false },
  { name: "send-partner-reset-email", category: "partner_email", critical: true },
  { name: "notify-accommodation-quote", category: "partner_email", critical: true },
  { name: "notify-partner-cancellation", category: "partner_email", critical: true },
  { name: "notify-partner-headcount-change", category: "partner_email", critical: true },
  { name: "notify-partner-item-deletion", category: "partner_email", critical: true },
  
  { name: "notify-partners-informational", category: "partner_email", critical: false },
  { name: "notify-headcount-change-bulk", category: "partner_email", critical: false },
  { name: "invite-partner", category: "partner_email", critical: true },
  { name: "bulk-invite-partners", category: "partner_email", critical: false },
  { name: "bulk-resend-unconfirmed", category: "partner_email", critical: false },
  { name: "resend-partner-invitation", category: "partner_email", critical: false },
  { name: "admin-reset-partner-password", category: "partner_email", critical: true },

  // ── Workflow / project mutaties ────────────────────────────────────────
  { name: "accept-quote-proposal", category: "workflow", critical: true },
  { name: "approve-quote-item", category: "workflow", critical: true },
  { name: "override-item-status", category: "workflow", critical: true },
  { name: "select-accommodation-quote", category: "workflow", critical: true },
  { name: "withdraw-accommodation-quote", category: "workflow", critical: true },
  { name: "cancel-program-request", category: "workflow", critical: true },
  { name: "publish-program-changes", category: "workflow", critical: true },
  { name: "customer-add-optional-component", category: "workflow", critical: true },
  { name: "update-customer-program", category: "workflow", critical: true },
  { name: "update-partner-item-status", category: "workflow", critical: true },
  { name: "update-partner-email", category: "workflow", critical: false },
  { name: "update-partner-password-set", category: "workflow", critical: false },
  { name: "set-project-completion", category: "workflow", critical: true },
  { name: "set-project-ready-for-invoice", category: "workflow", critical: true },
  { name: "process-completed-items", category: "workflow", critical: true },
  { name: "auto-close-past-execution", category: "workflow", critical: true },
  { name: "reconcile-admin-todos", category: "workflow", critical: false },
  { name: "cleanup-stale-todos", category: "workflow", critical: false },
  { name: "create-quote-review-todo", category: "workflow", critical: false },
  { name: "create-request-from-sales-inbox", category: "workflow", critical: true },
  { name: "resolve-customer-token", category: "workflow", critical: true },
  { name: "check-pending-items", category: "workflow", critical: false },
  { name: "chat-visitor-send", category: "workflow", critical: false },

  // ── Utility / read-only ─────────────────────────────────────────────────
  { name: "get-accommodation-portal", category: "utility", critical: false },
  { name: "get-customer-accommodation-thread", category: "utility", critical: false },
  { name: "get-customer-program", category: "utility", critical: false },
  { name: "get-ferry-departures", category: "utility", critical: false },
  { name: "get-partner-dashboard", category: "utility", critical: false },
  { name: "get-program-draft", category: "utility", critical: false },
  { name: "save-program-draft", category: "utility", critical: false },
  { name: "chat-visitor-thread", category: "utility", critical: false },
  { name: "geocode-address", category: "utility", critical: false },
  { name: "import-map-image", category: "utility", critical: false },
  { name: "map-create-booking", category: "utility", critical: false },
  { name: "map-proxy", category: "utility", critical: false },
  { name: "project-documents", category: "utility", critical: false },
  { name: "generate-program-docx", category: "utility", critical: false },
  { name: "generate-program-suggestion", category: "utility", critical: false },
  { name: "render-email-template", category: "utility", critical: false },
  { name: "fetch-google-reviews", category: "utility", critical: false },
  { name: "compose-followup-email", category: "utility", critical: false },
  { name: "scan-sales-lead", category: "utility", critical: false },
  { name: "whatsapp-send", category: "utility", critical: false },

  // ── Interne / operations ────────────────────────────────────────────────
  { name: "claudia-chat", category: "internal", critical: false },
  { name: "claudia-daily-scan", category: "internal", critical: false },
  { name: "claudia-reindex", category: "internal", critical: false },
  { name: "mint-ci-admin-jwt", category: "internal", critical: false },
  { name: "backfill-all-responded-todos", category: "internal", critical: false },
  { name: "backfill-email-log-metadata", category: "internal", critical: false },
  { name: "reset-partner-connections", category: "internal", critical: false },
  { name: "create-test-partner-user", category: "internal", critical: false },
  { name: "social-generate-drafts", category: "internal", critical: false },
  { name: "social-publish", category: "internal", critical: false },
  { name: "social-refresh-token", category: "internal", critical: false },
  { name: "social-meta-oauth-callback", category: "internal", critical: false },
  { name: "social-meta-oauth-start", category: "internal", critical: false },
];

export const EDGE_FUNCTION_COVERAGE: EdgeFunctionCoverage[] = REGISTRY.map((r) => ({
  ...r,
  tested: r.name in TESTED,
  testKind: TESTED[r.name],
})).sort((a, b) => a.name.localeCompare(b.name));

export const CATEGORY_LABELS: Record<EdgeFunctionCategory, string> = {
  invoicing: "Facturatie",
  customer_email: "Klant-mail",
  partner_email: "Partner-mail",
  webhook: "Webhooks",
  workflow: "Workflow",
  utility: "Utility",
  internal: "Intern",
};

export interface CoverageStats {
  total: number;
  tested: number;
  critical: number;
  criticalTested: number;
  criticalMissing: EdgeFunctionCoverage[];
}

export function computeCoverageStats(
  rows: EdgeFunctionCoverage[] = EDGE_FUNCTION_COVERAGE,
): CoverageStats {
  const tested = rows.filter((r) => r.tested).length;
  const critical = rows.filter((r) => r.critical);
  const criticalTested = critical.filter((r) => r.tested).length;
  const criticalMissing = critical
    .filter((r) => !r.tested)
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    total: rows.length,
    tested,
    critical: critical.length,
    criticalTested,
    criticalMissing,
  };
}
