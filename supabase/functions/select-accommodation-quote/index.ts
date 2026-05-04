import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatDateNL, 
  formatCurrencyNL,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  TemplateIds 
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelectQuoteRequest {
  token: string;
  quoteId: string;
  adminOverride?: boolean;
  signatureName?: string;
  acceptedTerms?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, quoteId, adminOverride, signatureName, acceptedTerms }: SelectQuoteRequest = await req.json();

    // Customer flow vereist deel-akkoord op voorwaarden bij selectie (juridisch ankerpunt logies)
    if (!adminOverride) {
      const trimmedSig = (signatureName || "").trim();
      if (!acceptedTerms || trimmedSig.length < 2) {
        return new Response(
          JSON.stringify({ error: "Akkoord op voorwaarden en digitale handtekening zijn verplicht." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Admin override: validate auth
    if (adminOverride) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Niet geautoriseerd" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Niet geautoriseerd" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Check admin role
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Geen admin rechten" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!quoteId) {
      return new Response(
        JSON.stringify({ error: "quoteId is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the accommodation request - by token for customer, by quote for admin
    let request: any;
    if (adminOverride) {
      // Find request via quote
      const { data: quote } = await supabase
        .from("accommodation_quotes")
        .select("request_id")
        .eq("id", quoteId)
        .maybeSingle();
      if (!quote) {
        return new Response(
          JSON.stringify({ error: "Offerte niet gevonden" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data, error } = await supabase
        .from("accommodation_requests")
        .select("*")
        .eq("id", quote.request_id)
        .maybeSingle();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Aanvraag niet gevonden" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      request = data;
    } else {
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token is verplicht" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data, error } = await supabase
        .from("accommodation_requests")
        .select("*")
        .eq("customer_token", token)
        .maybeSingle();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Aanvraag niet gevonden" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      request = data;

      // Check expiry only for customer flow
      if (new Date(request.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Deze aanvraag is verlopen" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Find the quote first (before checking accepted status)
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select("*, partner:partners(*)")
      .eq("id", quoteId)
      .eq("request_id", request.id)
      .maybeSingle();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: "Offerte niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already accepted — but allow re-selection if the quote was resubmitted
    if (request.status === "accepted" && quote.status !== "submitted") {
      return new Response(
        JSON.stringify({ error: "Er is al een offerte gekozen voor deze aanvraag" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch extras for this quote
    const { data: quoteExtras } = await supabase
      .from("accommodation_quote_extras")
      .select("name, unit_price, quantity, pricing_type, category")
      .eq("quote_id", quoteId);
    const extras = quoteExtras || [];
    const extrasTotal = extras.reduce((sum: number, e: any) =>
      sum + (e.pricing_type === "fixed" ? e.unit_price : e.unit_price * e.quantity), 0);
    const grandTotal = quote.price_total + extrasTotal;

    // Check if quote is expired (skip for admin)
    if (!adminOverride && new Date(quote.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Deze offerte is verlopen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get invoicing_mode from linked program
    let invoicingMode = "bureau_central";
    if (request.linked_program_id) {
      const { data: linkedProg } = await supabase
        .from("program_requests")
        .select("invoicing_mode")
        .eq("id", request.linked_program_id)
        .maybeSingle();
      if (linkedProg?.invoicing_mode) {
        invoicingMode = linkedProg.invoicing_mode;
      }
    }
    const isCentralBilling = invoicingMode === "bureau_central";

    // Get partner commission percentage
    const { data: partner } = await supabase
      .from("partners")
      .select("accommodation_commission_percentage")
      .eq("id", quote.partner_id)
      .maybeSingle();

    // Calculate commission over grand total (base + extras)
    const commissionPercentage = partner?.accommodation_commission_percentage || 10;
    const commissionAmount = (grandTotal * commissionPercentage) / 100;

    // Capture client IP for audit (customer flow only)
    const clientIp = !adminOverride
      ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("cf-connecting-ip")
        || null)
      : null;
    const acceptedAtIso = new Date().toISOString();
    const trimmedSignature = (signatureName || "").trim();

    // Update the selected quote with commission data + terms acceptance
    const { error: updateQuoteError } = await supabase
      .from("accommodation_quotes")
      .update({
        status: "selected",
        selected_at: acceptedAtIso,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        commission_status: "pending",
        ...(adminOverride ? {} : {
          customer_terms_accepted_at: acceptedAtIso,
          customer_signature_name: trimmedSignature,
          customer_terms_ip: clientIp,
        }),
      })
      .eq("id", quoteId);

    if (updateQuoteError) {
      console.error("Update quote error:", updateQuoteError);
      throw new Error("Fout bij bijwerken offerte");
    }

    console.log(`Commission calculated for quote ${quoteId}: ${commissionPercentage}% = €${commissionAmount.toFixed(2)}`);

    // Log accepted terms snapshot per voorwaardenset (juridisch dossier).
    // Alleen bij customer flow met deel-akkoord — admin override slaat dit over.
    if (!adminOverride && request.linked_program_id) {
      const partnerFull = quote.partner || {} as any;
      const usesCustom = !!partnerFull.terms_pdf_path && partnerFull.uses_default_terms === false;
      const partnerName = partnerFull.name || quote.accommodation_name;
      const versionTag = acceptedAtIso;
      const termsRows: Array<Record<string, unknown>> = [
        {
          request_id: request.linked_program_id,
          partner_id: quote.partner_id,
          partner_name: partnerName,
          terms_type: "bureau_vlieland",
          terms_version: versionTag,
          terms_pdf_path: null,
          accepted_at: acceptedAtIso,
        },
        {
          request_id: request.linked_program_id,
          partner_id: quote.partner_id,
          partner_name: partnerName,
          terms_type: usesCustom ? "partner_custom" : "partner_default",
          terms_version: versionTag,
          terms_pdf_path: usesCustom ? partnerFull.terms_pdf_path : null,
          accepted_at: acceptedAtIso,
        },
      ];
      if (!usesCustom) {
        termsRows.push({
          request_id: request.linked_program_id,
          partner_id: quote.partner_id,
          partner_name: partnerName,
          terms_type: "uvh_2024",
          terms_version: versionTag,
          terms_pdf_path: null,
          accepted_at: acceptedAtIso,
        });
      }
      const { error: termsLogError } = await supabase
        .from("accepted_terms_log")
        .insert(termsRows);
      if (termsLogError) {
        console.error("Failed to log accepted terms:", termsLogError);
        // Niet fataal: quote-selectie blijft geldig; admin ziet ontbreken in audit.
      } else {
        console.log(`Logged ${termsRows.length} terms acceptances for quote ${quoteId} by "${trimmedSignature}"`);
      }
    }

    // Reject other quotes for this request
    const { error: rejectError } = await supabase
      .from("accommodation_quotes")
      .update({ status: "rejected" })
      .eq("request_id", request.id)
      .neq("id", quoteId)
      .in("status", ["pending", "submitted"]);

    if (rejectError) {
      console.error("Reject quotes error:", rejectError);
    }

    // Fetch rejected quotes with partner info to notify them
    const { data: rejectedQuotes } = await supabase
      .from("accommodation_quotes")
      .select("id, accommodation_name, partner:partners(id, name, email, contact_email)")
      .eq("request_id", request.id)
      .eq("status", "rejected")
      .neq("id", quoteId);

    // Update request status to accepted
    const { error: updateRequestError } = await supabase
      .from("accommodation_requests")
      .update({ status: "accepted" })
      .eq("id", request.id);

    if (updateRequestError) {
      console.error("Update request error:", updateRequestError);
      throw new Error("Fout bij bijwerken aanvraag");
    }

    // Auto-resolve related auto-todos
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("auto_entity_id", request.id)
      .in("auto_type", ["quote_pending_customer", "forward_accommodation_quote", "quote_review"])
      .neq("status", "done");
    console.log(`Resolved accommodation auto-todos for request ${request.id}`);

    // Create admin todo as informational log entry (auto-done since email is sent automatically)
    const todoTitle = `Logies bevestigd: ${request.customer_name} → ${quote.accommodation_name}`;
    await supabase.from("admin_todos").insert({
      title: todoTitle,
      description: `Klant heeft gekozen voor ${quote.accommodation_name}. Bevestigingsmail automatisch verstuurd naar klant en partner.`,
      priority: "low",
      auto_type: "accommodation_selected",
      auto_entity_id: request.id,
      related_request_id: request.linked_program_id || null,
      related_partner_id: quote.partner_id || null,
      status: "done",
      completed_at: new Date().toISOString(),
    });

    // Send email notifications
    const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
    const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");

    if (mailjetApiKey && mailjetSecretKey) {
      const auth = btoa(`${mailjetApiKey}:${mailjetSecretKey}`);
      const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
      const subjectPrefix = getSubjectPrefix(origin);
      const replyTo = buildReplyTo(request.reference_number);

      // Partner email — respect invoicing_mode for PII
      // Guest name is always shown so the partner knows who to expect
      const guestDisplayName = request.customer_company
        ? `${sanitizeHtml(request.customer_company)} (${sanitizeHtml(request.customer_name)})`
        : sanitizeHtml(request.customer_name);

      const partnerTemplateVariables: Record<string, string> = {
        partner_name: sanitizeHtml(quote.partner?.name),
        accommodation_name: sanitizeHtml(quote.accommodation_name),
        arrival_date: formatDateNL(request.arrival_date),
        departure_date: formatDateNL(request.departure_date),
        number_of_guests: String(request.number_of_guests),
        price_total: formatCurrencyNL(grandTotal),
        base_price: formatCurrencyNL(quote.price_total),
        extras_total: extrasTotal > 0 ? formatCurrencyNL(extrasTotal) : "",
        extras_list: extras.map((e: any) => `<li>${e.name}: ${formatCurrencyNL(e.pricing_type === "fixed" ? e.unit_price : e.unit_price * e.quantity)}</li>`).join(""),
        guest_name: guestDisplayName,
      };

      // Always hide customer PII from partners — Bureau Vlieland is the central contact
      partnerTemplateVariables.customer_name = "Bureau Vlieland";
      partnerTemplateVariables.company_name = "";
      partnerTemplateVariables.customer_email = "hallo@bureauvlieland.nl";
      partnerTemplateVariables.customer_phone = "0562 700 208";

      // Partner portal link
      const partnerToken = quote.partner?.partner_token || "";
      const partnerPortalUrl = `${origin}/partner/logies?token=${partnerToken}`;
      partnerTemplateVariables.partner_portal_link = partnerPortalUrl;

      const partnerTemplate = await getRenderedTemplate(TemplateIds.ACCOMMODATION_SELECTED_PARTNER, partnerTemplateVariables);

      const partnerEmail = getRecipientEmail(quote.partner?.contact_email || quote.partner?.email || "", origin);
      if (partnerEmail) {
        const partnerHtml = partnerTemplate?.body || `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Goed nieuws!</h1>
            <p>Je offerte voor <strong>${sanitizeHtml(quote.accommodation_name)}</strong> is geaccepteerd door Bureau Vlieland.</p>
            
            <h2>Gastgegevens</h2>
            <ul>
              <li><strong>Gast:</strong> ${guestDisplayName}</li>
              <li><strong>Aankomst:</strong> ${formatDateNL(request.arrival_date)}</li>
              <li><strong>Vertrek:</strong> ${formatDateNL(request.departure_date)}</li>
              <li><strong>Aantal gasten:</strong> ${request.number_of_guests}</li>
              <li><strong>Verblijf:</strong> ${formatCurrencyNL(quote.price_total)}</li>
              ${extras.length > 0 ? extras.map((e: any) => `<li><strong>${e.name}:</strong> ${formatCurrencyNL(e.pricing_type === "fixed" ? e.unit_price : e.unit_price * e.quantity)}</li>`).join("") : ""}
              <li><strong>Totaalprijs:</strong> ${formatCurrencyNL(grandTotal)}</li>
            </ul>

            <h2>Facturatie</h2>
            <p>Factureer het verblijf aan <strong>Bureau Vlieland</strong>. Je ontvangt hierover apart bericht via het partnerportaal.</p>
            <ul>
              <li><strong>Email:</strong> hallo@bureauvlieland.nl</li>
              <li><strong>Telefoon:</strong> 0562 700 208</li>
            </ul>
            
            <p>Bureau Vlieland neemt contact met je op over de verdere afhandeling.</p>

            <p style="margin-top: 24px;">
              <a href="${partnerPortalUrl}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ga naar partnerportaal →</a>
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Dit bericht is verzonden door Bureau Vlieland.
            </p>
          </div>
        `;

        try {
          await fetch("https://api.mailjet.com/v3.1/send", {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Messages: [
                {
                  From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                  To: [{ Email: partnerEmail }],
                  ...(replyTo ? { ReplyTo: replyTo } : {}),
                  Subject: `${subjectPrefix}${partnerTemplate?.subject || "Je offerte voor logies is geaccepteerd"}`,
                  HTMLPart: partnerHtml,
                },
              ],
            }),
          });

          await logEmail({
            email_type: EmailTypes.ACCOMMODATION_SELECTED_PARTNER,
            subject: partnerTemplate?.subject || `Je offerte voor logies is geaccepteerd`,
            recipient_email: partnerEmail,
            recipient_name: quote.partner?.name,
            related_accommodation_id: request.id,
            related_partner_id: quote.partner_id,
            status: "sent",
            sent_by: "system",
          });

          console.log(`Selection notification sent to partner ${quote.partner?.name}`);
        } catch (e) {
          console.error("Error sending partner email:", e);
          await logEmail({
            email_type: EmailTypes.ACCOMMODATION_SELECTED_PARTNER,
            subject: `Je offerte voor logies is geaccepteerd`,
            recipient_email: partnerEmail,
            recipient_name: quote.partner?.name,
            related_accommodation_id: request.id,
            related_partner_id: quote.partner_id,
            status: "failed",
            error_message: String(e),
            sent_by: "system",
          });
        }
      }

      // Customer confirmation email
      const portalLink = request.linked_program_id
        ? `${origin}/programma/${request.customer_token}`
        : `${origin}/logies/${request.customer_token}`;

      const partnerData = quote.partner || {} as any;
      const accommodationAddress = [partnerData.address_street, partnerData.address_postal, partnerData.address_city]
        .filter(Boolean).join(", ");

      const customerTemplateVariables: Record<string, string> = {
        customer_name: sanitizeHtml(request.customer_name),
        accommodation_name: sanitizeHtml(quote.accommodation_name),
        arrival_date: formatDateNL(request.arrival_date),
        departure_date: formatDateNL(request.departure_date),
        number_of_guests: String(request.number_of_guests),
        base_price: formatCurrencyNL(quote.price_total),
        extras_total: extrasTotal > 0 ? formatCurrencyNL(extrasTotal) : "",
        extras_list: extras.length > 0
          ? extras.map((e: any) => `<li>${sanitizeHtml(e.name)}: ${formatCurrencyNL(e.pricing_type === "fixed" ? e.unit_price : e.unit_price * e.quantity)}</li>`).join("")
          : "",
        price_total: formatCurrencyNL(grandTotal),
        portal_link: portalLink,
        reference_number: request.reference_number || "",
        accommodation_address: accommodationAddress || "",
        accommodation_phone: partnerData.booking_phone || partnerData.phone || "",
        partner_description: sanitizeHtml(partnerData.accommodation_description || partnerData.about_text || ""),
      };

      const customerTemplate = await getRenderedTemplate(TemplateIds.ACCOMMODATION_SELECTED_CUSTOMER, customerTemplateVariables);

      const customerEmail = getRecipientEmail(request.customer_email, origin);
      if (customerEmail) {
        const customerHtml = customerTemplate?.body || `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1e3a5f;">Je logies is bevestigd!</h1>
            <p>Beste ${sanitizeHtml(request.customer_name)},</p>
            <p>Goed nieuws! Je verblijft bij <strong>${sanitizeHtml(quote.accommodation_name)}</strong>.</p>
            
            <h2>Verblijfsgegevens</h2>
            <ul>
              <li><strong>Accommodatie:</strong> ${sanitizeHtml(quote.accommodation_name)}</li>
              ${accommodationAddress ? `<li><strong>Adres:</strong> ${sanitizeHtml(accommodationAddress)}</li>` : ""}
              <li><strong>Aankomst:</strong> ${formatDateNL(request.arrival_date)}</li>
              <li><strong>Vertrek:</strong> ${formatDateNL(request.departure_date)}</li>
              <li><strong>Aantal gasten:</strong> ${request.number_of_guests}</li>
              <li><strong>Verblijf:</strong> ${formatCurrencyNL(quote.price_total)}</li>
              ${extras.length > 0 ? extras.map((e: any) => `<li><strong>${sanitizeHtml(e.name)}:</strong> ${formatCurrencyNL(e.pricing_type === "fixed" ? e.unit_price : e.unit_price * e.quantity)}</li>`).join("") : ""}
              <li><strong>Totaalprijs:</strong> ${formatCurrencyNL(grandTotal)}</li>
            </ul>

            ${request.reference_number ? `<p><strong>Referentie:</strong> ${sanitizeHtml(request.reference_number)}</p>` : ""}
            
            <p style="margin-top: 24px;">
              <a href="${portalLink}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Bekijk je programma →</a>
            </p>
            
            <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Dit bericht is verzonden door Bureau Vlieland.
            </p>
          </div>
        `;

        try {
          await fetch("https://api.mailjet.com/v3.1/send", {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Messages: [{
                From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                To: [{ Email: customerEmail }],
                ...(replyTo ? { ReplyTo: replyTo } : {}),
                Subject: `${subjectPrefix}${customerTemplate?.subject || "Je logies is bevestigd"}`,
                HTMLPart: customerHtml,
              }],
            }),
          });

          await logEmail({
            email_type: EmailTypes.ACCOMMODATION_SELECTED_CUSTOMER,
            subject: customerTemplate?.subject || `Je logies is bevestigd`,
            recipient_email: customerEmail,
            recipient_name: request.customer_name,
            related_accommodation_id: request.id,
            status: "sent",
            sent_by: "system",
          });

          console.log(`Selection confirmation sent to customer ${request.customer_name}`);
        } catch (e) {
          console.error("Error sending customer email:", e);
          await logEmail({
            email_type: EmailTypes.ACCOMMODATION_SELECTED_CUSTOMER,
            subject: `Je logies is bevestigd`,
            recipient_email: customerEmail,
            recipient_name: request.customer_name,
            related_accommodation_id: request.id,
            status: "failed",
            error_message: String(e),
            sent_by: "system",
          });
        }
      }

      // Notify rejected partners
      if (rejectedQuotes && rejectedQuotes.length > 0) {
        for (const rq of rejectedQuotes) {
          const rqPartner = rq.partner as any;
          if (!rqPartner?.email) continue;

          const rejectedVars = {
            partner_name: sanitizeHtml(rqPartner.name),
            customer_name: "Bureau Vlieland",
            accommodation_name: sanitizeHtml(rq.accommodation_name),
            arrival_date: formatDateNL(request.arrival_date),
            departure_date: formatDateNL(request.departure_date),
          };

          const rejectedTemplate = await getRenderedTemplate(
            TemplateIds.ACCOMMODATION_REJECTED_PARTNER,
            rejectedVars
          );

          const rejectedHtml = rejectedTemplate?.body || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Beste ${sanitizeHtml(rqPartner.name)},</p>
              <p>We laten je weten dat voor de periode ${formatDateNL(request.arrival_date)} - ${formatDateNL(request.departure_date)} voor een andere accommodatie is gekozen.</p>
              <p>Je offerte voor <strong>${sanitizeHtml(rq.accommodation_name)}</strong> wordt hiermee afgesloten.</p>
              <p>Bedankt voor het uitbrengen van je offerte. We hopen je bij een volgende aanvraag weer te mogen benaderen.</p>
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            </div>
          `;

          const rejectedEmail = getRecipientEmail(rqPartner.contact_email || rqPartner.email, origin);
          try {
            await fetch("https://api.mailjet.com/v3.1/send", {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                Messages: [{
                  From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                  To: [{ Email: rejectedEmail }],
                  Subject: `${subjectPrefix}${rejectedTemplate?.subject || "Logiesaanvraag - niet gekozen"}`,
                  HTMLPart: rejectedHtml,
                }],
              }),
            });

            await logEmail({
              email_type: EmailTypes.ACCOMMODATION_REJECTED_PARTNER,
              subject: rejectedTemplate?.subject || `Logiesaanvraag - niet gekozen`,
              recipient_email: rejectedEmail,
              recipient_name: rqPartner.name,
              related_accommodation_id: request.id,
              related_partner_id: rqPartner.id,
              status: "sent",
              sent_by: "system",
            });

            console.log(`Rejection notification sent to partner ${rqPartner.name}`);
          } catch (e) {
            console.error(`Error sending rejection email to ${rqPartner.name}:`, e);
            await logEmail({
              email_type: EmailTypes.ACCOMMODATION_REJECTED_PARTNER,
              subject: `Logiesaanvraag - niet gekozen`,
              recipient_email: rejectedEmail,
              recipient_name: rqPartner.name,
              related_accommodation_id: request.id,
              related_partner_id: rqPartner.id,
              status: "failed",
              error_message: String(e),
              sent_by: "system",
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Offerte succesvol geselecteerd" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in select-accommodation-quote:", error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het verwerken van uw keuze" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
