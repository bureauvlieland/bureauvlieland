import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = replaceVariables(template.body_html, variables);

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
} as const;
