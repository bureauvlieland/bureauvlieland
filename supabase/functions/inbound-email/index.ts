import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extract reference number from a Reply-To address like reply+BV-2503-0012@bureauvlieland.nl
 */
function extractReferenceNumber(toAddress: string): string | null {
  // Match reply+REFERENCE@domain pattern
  const match = toAddress.match(/reply\+([A-Z]+-\d{4}-\d{4})@/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Strip HTML tags from content, keeping text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract sender name from email "From" field
 * Handles formats like: "John Doe <john@example.com>" or just "john@example.com"
 */
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]+)>?$/);
  if (match) {
    return {
      name: match[1].trim() || match[2].trim(),
      email: match[2].trim(),
    };
  }
  return { name: from.trim(), email: from.trim() };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mailjet Parse API sends form-data or JSON depending on configuration
    const contentType = req.headers.get("content-type") || "";
    let sender = "";
    let recipient = "";
    let subject = "";
    let textContent = "";
    let htmlContent = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      sender = body.From || body.Sender || "";
      recipient = body.To || body.Recipient || "";
      subject = body.Subject || "";
      textContent = body["Text-part"] || body.Text || "";
      htmlContent = body["Html-part"] || body.Html || "";
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      sender = formData.get("From")?.toString() || formData.get("Sender")?.toString() || "";
      recipient = formData.get("To")?.toString() || formData.get("Recipient")?.toString() || "";
      subject = formData.get("Subject")?.toString() || "";
      textContent = formData.get("Text-part")?.toString() || formData.get("Text")?.toString() || "";
      htmlContent = formData.get("Html-part")?.toString() || formData.get("Html")?.toString() || "";
    } else {
      // Try JSON as fallback
      try {
        const body = await req.json();
        sender = body.From || body.Sender || "";
        recipient = body.To || body.Recipient || "";
        subject = body.Subject || "";
        textContent = body["Text-part"] || body.Text || "";
        htmlContent = body["Html-part"] || body.Html || "";
      } catch {
        console.error("Could not parse request body");
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Inbound email received — From: ${sender}, To: ${recipient}, Subject: ${subject}`);

    // Extract reference number from recipient address
    const referenceNumber = extractReferenceNumber(recipient);
    if (!referenceNumber) {
      console.warn(`No valid reference number found in recipient: ${recipient}`);
      // Still return 200 to prevent Mailjet retries
      return new Response(JSON.stringify({ status: "ignored", reason: "no_reference" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extracted reference: ${referenceNumber}`);

    // Parse sender
    const { name: contactName, email: contactEmail } = parseSender(sender);

    // Get message content (prefer text, fallback to stripped HTML)
    const content = textContent || stripHtml(htmlContent) || "(geen inhoud)";

    // Truncate to prevent abuse (max 10000 chars)
    const truncatedContent = content.length > 10000 ? content.substring(0, 10000) + "\n\n[Bericht ingekort]" : content;

    // Look up the project by reference number
    let requestId: string | null = null;
    let accommodationId: string | null = null;
    let customerName: string | null = null;

    if (referenceNumber.startsWith("BV-")) {
      // Program request
      const { data: pr } = await supabase
        .from("program_requests")
        .select("id, customer_name, customer_company")
        .eq("reference_number", referenceNumber)
        .maybeSingle();

      if (pr) {
        requestId = pr.id;
        customerName = pr.customer_company || pr.customer_name;
      }
    } else if (referenceNumber.startsWith("LOG-")) {
      // Accommodation request
      const { data: ar } = await supabase
        .from("accommodation_requests")
        .select("id, customer_name, customer_company, linked_program_id")
        .eq("reference_number", referenceNumber)
        .maybeSingle();

      if (ar) {
        accommodationId = ar.id;
        requestId = ar.linked_program_id || null;
        customerName = ar.customer_company || ar.customer_name;
      }
    }

    if (!requestId && !accommodationId) {
      console.warn(`No project found for reference: ${referenceNumber}`);
      return new Response(JSON.stringify({ status: "ignored", reason: "project_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save as project communication
    const { error: insertError } = await supabase.from("project_communications").insert({
      request_id: requestId,
      accommodation_id: accommodationId,
      communication_type: "email_in",
      direction: "inbound",
      subject: subject || null,
      content: truncatedContent,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      communication_date: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error inserting communication:", insertError);
      throw insertError;
    }

    // Create admin todo for follow-up
    const todoTitle = `Nieuw antwoord van ${contactName || contactEmail} op ${referenceNumber}`;
    const todoDescription = subject
      ? `Onderwerp: "${subject}"\n\nBekijk het bericht in het projectdossier.`
      : "Bekijk het bericht in het projectdossier.";

    await supabase.from("admin_todos").insert({
      title: todoTitle.substring(0, 200),
      description: todoDescription,
      priority: "normal",
      status: "todo",
      related_request_id: requestId || null,
      auto_type: "inbound_email",
      auto_entity_id: referenceNumber,
    });

    console.log(`Inbound email saved for ${referenceNumber} — from ${contactEmail}`);

    return new Response(
      JSON.stringify({ status: "ok", reference: referenceNumber }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in inbound-email:", error);
    // Return 200 to prevent Mailjet retries on server errors
    return new Response(
      JSON.stringify({ status: "error", message: "Internal error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
