import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Centralized sender constants - used by all edge functions
export const SENDER_EMAIL = "hallo@bureauvlieland.nl";
export const SENDER_NAME = "Bureau Vlieland";

export interface TemplateVariables {
  [key: string]: string | number | undefined | null;
}

/**
 * Fetch an email template from the database and render it with variables
 */
export async function getRenderedTemplate(
  templateId: string,
  variables: TemplateVariables
): Promise<{ subject: string; body: string } | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("id", templateId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) {
      console.error(`Template not found: ${templateId}`, error);
      return null;
    }

    // Replace all {{variable}} placeholders with actual values
    const subject = replaceVariables(template.subject, variables);
    const renderedBody = replaceVariables(template.body_html, variables);

    // Wrap in standard branded skeleton (header + footer from app_settings)
    const body = await wrapEmailHtml(renderedBody, supabase);

    return { subject, body };
  } catch (err) {
    console.error("Error fetching template:", err);
    return null;
  }
}

/**
 * Process conditional blocks {{#if var}}...{{/if}} and {{#if var}}...{{else}}...{{/if}}
 * Supports nested conditionals
 */
export function processConditionals(text: string, variables: TemplateVariables): string {
  // Process {{#if var}}...{{else}}...{{/if}} blocks (most specific first)
  let result = text;
  
  // Keep processing until no more conditionals are found (handles nested)
  let maxIterations = 50; // Prevent infinite loops
  let iterations = 0;
  
  while (iterations < maxIterations) {
    // Match innermost {{#if ...}}...{{/if}} blocks first (non-greedy)
    const ifElsePattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/;
    const ifOnlyPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/;
    
    const elseMatch = result.match(ifElsePattern);
    const ifMatch = result.match(ifOnlyPattern);
    
    // Determine which match to process (prefer if-else if it appears first or is the only one)
    let matchToProcess: RegExpMatchArray | null = null;
    let hasElse = false;
    
    if (elseMatch && ifMatch) {
      // Check if the else match is contained within the if match (meaning it's an if-else)
      if (elseMatch.index !== undefined && ifMatch.index !== undefined) {
        if (elseMatch.index <= ifMatch.index) {
          matchToProcess = elseMatch;
          hasElse = true;
        } else {
          matchToProcess = ifMatch;
          hasElse = false;
        }
      }
    } else if (elseMatch) {
      matchToProcess = elseMatch;
      hasElse = true;
    } else if (ifMatch) {
      matchToProcess = ifMatch;
      hasElse = false;
    }
    
    if (!matchToProcess) {
      break; // No more conditionals to process
    }
    
    const varName = matchToProcess[1];
    const value = variables[varName];
    const isTruthy = value !== undefined && value !== null && value !== "" && value !== 0 && value !== "0";
    
    if (hasElse) {
      const truthyContent = matchToProcess[2];
      const falsyContent = matchToProcess[3];
      result = result.replace(matchToProcess[0], isTruthy ? truthyContent : falsyContent);
    } else {
      const content = matchToProcess[2];
      result = result.replace(matchToProcess[0], isTruthy ? content : "");
    }
    
    iterations++;
  }
  
  return result;
}

/**
 * Replace {{variable}} placeholders with actual values
 */
export function replaceVariables(text: string, variables: TemplateVariables): string {
  // First, process conditionals
  let result = processConditionals(text, variables);
  
  // Then, replace simple {{variable}} placeholders
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
  
  return result;
}

/**
 * Sanitize HTML to prevent XSS in emails
 */
export function sanitizeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format date in Dutch locale
 */
export function formatDateNL(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format currency in Dutch locale
 */
export function formatCurrencyNL(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

/**
 * Get the base URL for portals based on environment
 */
export function getPortalBaseUrl(origin?: string): string {
  // In production, always use the production domain
  if (origin?.includes("bureauvlieland.nl")) {
    return "https://bureauvlieland.nl";
  }
  // For lovable preview
  if (origin?.includes("lovable.app")) {
    return origin;
  }
  // Default to production
  return "https://bureauvlieland.nl";
}

/**
 * Check if we're in test mode (not production)
 */
export function isTestMode(origin?: string): boolean {
  if (!origin) return true;
  return !origin.includes("bureauvlieland.nl") && !origin.includes("bureauvlieland.lovable.app");
}

/**
 * Get subject prefix for test mode
 */
export function getSubjectPrefix(origin?: string): string {
  return isTestMode(origin) ? "[TEST] " : "";
}

/**
 * Get the recipient email, redirecting to test email in test mode
 */
export function getRecipientEmail(originalEmail: string, origin?: string): string {
  const TEST_EMAIL = "erwin@bureauvlieland.nl";
  return isTestMode(origin) ? TEST_EMAIL : originalEmail;
}

// Template IDs as constants for consistency
export const TemplateIds = {
  // Program request emails
  PROGRAM_REQUEST_BUREAU: "program_request_bureau",
  PROGRAM_REQUEST_CUSTOMER: "program_request_customer",
  PROGRAM_REQUEST_PARTNER: "program_request_partner",
  
  // Status update emails
  STATUS_CONFIRMED: "status_confirmed",
  STATUS_UNAVAILABLE: "status_unavailable",
  STATUS_ALTERNATIVE: "status_alternative",
  
  // Cancellation emails
  CANCELLATION_CUSTOMER: "cancellation_customer",
  CANCELLATION_PARTNER: "cancellation_partner",
  CANCELLATION_ACCOMMODATION_PARTNER: "cancellation_accommodation_partner",
  
  // Quote request emails
  QUOTE_REQUEST_BUREAU: "quote_request_bureau",
  QUOTE_REQUEST_CUSTOMER: "quote_request_customer",
  
  // Partner invitation
  PARTNER_INVITATION: "partner_invitation",
  
  // Accommodation emails
  ACCOMMODATION_REQUEST_BUREAU: "accommodation_request_bureau",
  ACCOMMODATION_REQUEST_CUSTOMER: "accommodation_request_customer",
  ACCOMMODATION_QUOTE_NOTIFICATION: "accommodation_quote_notification",
  ACCOMMODATION_SELECTED_PARTNER: "accommodation_selected_partner",
  ACCOMMODATION_SELECTED_CUSTOMER: "accommodation_selected_customer",
  
  // Counter proposal emails
  COUNTER_PROPOSAL_PARTNER: "counter_proposal_partner",
  COUNTER_PROPOSAL_RESPONSE: "counter_proposal_response",
  
  // Accommodation rejection
  ACCOMMODATION_REJECTED_PARTNER: "accommodation_rejected_partner",
  
  // Quote offer
  QUOTE_OFFER_CUSTOMER: "quote_offer_customer",

  // Proforma commission notification
  PROFORMA_COMMISSION: "proforma_commission_notification",

  // Quote expired notification for partner
  QUOTE_EXPIRED_PARTNER: "quote_expired_partner",

  // Chat notifications
  CHAT_NOTIFICATION_BUREAU: "chat_notification_bureau",
  CHAT_REPLY_VISITOR: "chat_reply_visitor",

  // Partner management
  PARTNER_PASSWORD_RESET: "partner_password_reset",
  PARTNER_INTRO_PORTAL: "partner_intro_portal",

  // Customer accommodation message
  CUSTOMER_ACCOMMODATION_MESSAGE: "customer_accommodation_message",

  // Update-customer-program templates
  PEOPLE_CHANGE_ACCOMMODATION: "people_change_accommodation",
  DATE_CHANGE_PARTNER: "date_change_partner",
  DATE_CHANGE_ACCOMMODATION: "date_change_accommodation",
  DATE_CHANGE_CUSTOMER: "date_change_customer",
  ITEM_CANCELLED_PARTNER: "item_cancelled_partner",
  BOOKING_CONFIRMED_PARTNER: "booking_confirmed_partner",
  BOOKING_CONFIRMED_CUSTOMER: "booking_confirmed_customer",
  ITEM_ADDED_PARTNER: "item_added_partner",
  ITEM_CHANGES_PARTNER: "item_changes_partner",
  ITEM_CHANGES_CUSTOMER: "item_changes_customer",
} as const;

/**
 * Build a dynamic Reply-To address for project-related emails.
 * Enables Mailjet Parse API to route replies back to the correct project.
 * 
 * @param referenceNumber - The project reference (e.g., "BV-2503-0012" or "LOG-2503-0001")
 * @returns Mailjet-compatible ReplyTo object, or undefined if no reference
 */
export function buildReplyTo(referenceNumber: string | null | undefined): { Email: string; Name: string } | undefined {
  if (!referenceNumber) return undefined;
  return {
    Email: `reply+${referenceNumber}@reply.bureauvlieland.nl`,
    Name: SENDER_NAME,
  };
}

// ============================================================
// Email visual harmonization (Phase 3)
// Standard HTML skeleton, header (logo) and footer (app_settings)
// ============================================================

const LOGO_URL = "https://bureauvlieland.nl/email-logo.png";
const BRAND_COLOR = "#0F4C5C"; // Bureau Vlieland deep teal
const BRAND_ACCENT = "#E36414"; // warm accent

interface BrandingSettings {
  company_name: string;
  address: string;
  phone: string;
  admin_email: string;
  kvk: string;
  iban: string;
}

let cachedBranding: BrandingSettings | null = null;

async function getBrandingSettings(supabase: any): Promise<BrandingSettings> {
  if (cachedBranding) return cachedBranding;
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("id, value")
      .in("id", [
        "bureau_company_name",
        "bureau_address",
        "bureau_phone",
        "bureau_admin_email",
        "bureau_kvk_number",
        "bureau_iban",
      ]);
    const map: Record<string, string> = {};
    for (const row of data || []) {
      map[row.id] = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
    }
    cachedBranding = {
      company_name: map.bureau_company_name || "Bureau Vlieland B.V.",
      address: map.bureau_address || "",
      phone: map.bureau_phone || "+31 562 700 208",
      admin_email: map.bureau_admin_email || "administratie@bureauvlieland.nl",
      kvk: map.bureau_kvk_number || "",
      iban: map.bureau_iban || "",
    };
    return cachedBranding;
  } catch (err) {
    console.error("Failed to load branding settings", err);
    return {
      company_name: "Bureau Vlieland B.V.",
      address: "",
      phone: "+31 562 700 208",
      admin_email: "administratie@bureauvlieland.nl",
      kvk: "",
      iban: "",
    };
  }
}

/**
 * Strip outer document chrome (DOCTYPE/html/head/body) so we can re-wrap
 * with our standard skeleton. Preserves inner body content.
 */
function extractInnerContent(html: string): string {
  let content = html.trim();
  // Already wrapped by us? Mark via comment.
  if (content.includes("<!--BV_WRAPPED-->")) return content;

  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1].trim();
  } else {
    // Strip stray DOCTYPE/html/head if present without body tag
    content = content
      .replace(/<!DOCTYPE[^>]*>/i, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<head[\s\S]*?<\/head>/i, "")
      .replace(/<meta[^>]*>/gi, "")
      .replace(/<title[\s\S]*?<\/title>/i, "")
      .trim();
  }
  // Strip any pre-existing top-level outer wrapper div with max-width that
  // mimics our old skeleton, to avoid double padding. Keep content intact.
  return content;
}

/**
 * Wrap rendered email body in branded HTML skeleton.
 * - Header with logo on brand color
 * - Content area on white with comfortable padding
 * - Footer with company info from app_settings
 */
export async function wrapEmailHtml(innerHtml: string, supabase: any): Promise<string> {
  const branding = await getBrandingSettings(supabase);
  const inner = extractInnerContent(innerHtml);

  const footerLines: string[] = [];
  footerLines.push(`<strong>${branding.company_name}</strong>`);
  if (branding.address) footerLines.push(branding.address);
  const contactBits = [branding.phone, branding.admin_email].filter(Boolean).join(" &middot; ");
  if (contactBits) footerLines.push(contactBits);
  const legalBits = [
    branding.kvk ? `KvK ${branding.kvk}` : "",
    branding.iban ? `IBAN ${branding.iban}` : "",
  ].filter(Boolean).join(" &middot; ");
  if (legalBits) footerLines.push(legalBits);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bureau Vlieland</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1a1a1a;">
<!--BV_WRAPPED-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <tr>
          <td style="background-color:${BRAND_COLOR}; padding:20px 32px; text-align:left;">
            <img src="${LOGO_URL}" alt="Bureau Vlieland" width="160" style="display:block; max-width:160px; height:auto; border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:32px; font-size:15px; line-height:1.6; color:#1a1a1a;">
            ${inner}
          </td>
        </tr>
        <tr>
          <td style="background-color:#fafafa; border-top:3px solid ${BRAND_ACCENT}; padding:20px 32px; font-size:12px; line-height:1.5; color:#666666;">
            ${footerLines.map(l => `<div style="margin-bottom:2px;">${l}</div>`).join("")}
            <div style="margin-top:10px; color:#999999;">Deze e-mail is automatisch verzonden via het Bureau Vlieland systeem.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
