import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default reminder thresholds (overridden by app_settings)
const DEFAULT_REMINDER_DAYS_PARTNER = 5;
const DEFAULT_REMINDER_DAYS_CUSTOMER_QUOTE = 7;
const DEFAULT_REMINDER_DAYS_CUSTOMER_REQUEST = 14;
const DEFAULT_REMINDER_DAYS_PARTNER_ACTIVITY = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting check-pending-items job...");

    // Fetch configurable settings
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("id, value")
      .in("id", [
        "reminder_days_partner_quote",
        "reminder_days_customer_quote",
        "reminder_days_customer_request",
      ]);

    const settings: Record<string, number> = {};
    for (const row of settingsRows || []) {
      settings[row.id] = typeof row.value === "number" ? row.value : parseInt(String(row.value), 10) || 0;
    }

    const partnerQuoteDays = settings["reminder_days_partner_quote"] || DEFAULT_REMINDER_DAYS_PARTNER;
    const customerQuoteDays = settings["reminder_days_customer_quote"] || DEFAULT_REMINDER_DAYS_CUSTOMER_QUOTE;
    const customerRequestDays = settings["reminder_days_customer_request"] || DEFAULT_REMINDER_DAYS_CUSTOMER_REQUEST;
    const partnerActivityDays = DEFAULT_REMINDER_DAYS_PARTNER_ACTIVITY;

    let totalCreated = 0;
    let totalSkipped = 0;

    // =============================================
    // CHECK 1: Partner activity items (existing logic)
    // =============================================
    const activityCutoff = new Date();
    activityCutoff.setDate(activityCutoff.getDate() - partnerActivityDays);

    const { data: pendingItems, error: itemsError } = await supabase
      .from("program_request_items")
      .select(`
        id,
        block_name,
        provider_id,
        provider_name,
        request_id,
        created_at,
        program_requests!inner (
          id,
          customer_name,
          customer_company,
          status,
          expires_at
        )
      `)
      .eq("status", "pending")
      .neq("block_type", "self_arranged")
      .lt("created_at", activityCutoff.toISOString())
      .eq("program_requests.status", "active")
      .gt("program_requests.expires_at", new Date().toISOString());

    if (itemsError) {
      console.error("Error fetching pending items:", itemsError);
    } else {
      console.log(`Found ${pendingItems?.length || 0} pending activity items older than ${partnerActivityDays} days`);

      for (const item of pendingItems || []) {
        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "partner_reminder")
          .eq("auto_entity_id", item.id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const { data: partner } = await supabase
          .from("partners")
          .select("name")
          .eq("id", item.provider_id)
          .maybeSingle();

        const partnerName = partner?.name || item.provider_name;
        const programRequestsArray = item.program_requests as unknown as Array<{
          id: string;
          customer_name: string;
          customer_company: string | null;
          status: string;
          expires_at: string;
        }>;
        const request = programRequestsArray[0];

        if (!request) continue;

        const customerName = request.customer_company || request.customer_name;
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `Partner ${partnerName} heeft niet gereageerd op "${item.block_name}"`,
            description: `Deze activiteit is ${daysSinceCreated} dagen geleden aangevraagd voor ${customerName}, maar de partner heeft nog niet gereageerd. Neem contact op met de partner.`,
            priority: daysSinceCreated > 7 ? "high" : "normal",
            status: "todo",
            related_request_id: request.id,
            related_partner_id: item.provider_id,
            auto_type: "partner_reminder",
            auto_entity_id: item.id,
          });

        if (!todoError) totalCreated++;
      }
    }

    // =============================================
    // CHECK 2: Partner accommodation quotes pending
    // =============================================
    const partnerQuoteCutoff = new Date();
    partnerQuoteCutoff.setDate(partnerQuoteCutoff.getDate() - partnerQuoteDays);

    const { data: pendingQuotes, error: pendingQuotesError } = await supabase
      .from("accommodation_quotes")
      .select(`
        id,
        partner_id,
        request_id,
        created_at,
        partner:partners(name),
        request:accommodation_requests(
          customer_name,
          customer_company,
          arrival_date,
          departure_date,
          number_of_guests,
          status,
          expires_at
        )
      `)
      .eq("status", "pending")
      .lt("created_at", partnerQuoteCutoff.toISOString());

    if (pendingQuotesError) {
      console.error("Error fetching pending quotes:", pendingQuotesError);
    } else {
      const activeQuotes = (pendingQuotes || []).filter(q => {
        const req = q.request as any;
        return req && req.status !== "cancelled" && new Date(req.expires_at) > new Date();
      });

      console.log(`Found ${activeQuotes.length} pending accommodation quotes older than ${partnerQuoteDays} days`);

      for (const quote of activeQuotes) {
        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "quote_pending_partner")
          .eq("auto_entity_id", quote.id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const partnerName = (quote.partner as any)?.name || "Onbekend";
        const req = quote.request as any;
        const customerName = req?.customer_company || req?.customer_name || "Onbekend";
        const daysSince = Math.floor(
          (Date.now() - new Date(quote.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `Partner ${partnerName} heeft niet gereageerd op logiesverzoek ${customerName}`,
            description: `De offerteaanvraag is ${daysSince} dagen geleden verstuurd, maar de partner heeft nog niet gereageerd.`,
            priority: daysSince > partnerQuoteDays * 2 ? "high" : "normal",
            status: "todo",
            related_partner_id: quote.partner_id,
            auto_type: "quote_pending_partner",
            auto_entity_id: quote.id,
          });

        if (!todoError) totalCreated++;
      }
    }

    // =============================================
    // CHECK 3: Customer hasn't selected forwarded quote
    // =============================================
    const customerQuoteCutoff = new Date();
    customerQuoteCutoff.setDate(customerQuoteCutoff.getDate() - customerQuoteDays);

    const { data: forwardedQuotes, error: forwardedError } = await supabase
      .from("accommodation_quotes")
      .select(`
        id,
        request_id,
        forwarded_at,
        request:accommodation_requests(
          id,
          customer_name,
          customer_company,
          status,
          expires_at,
          linked_program_id
        )
      `)
      .eq("status", "submitted")
      .not("forwarded_at", "is", null)
      .lt("forwarded_at", customerQuoteCutoff.toISOString());

    if (forwardedError) {
      console.error("Error fetching forwarded quotes:", forwardedError);
    } else {
      const activeForwarded = (forwardedQuotes || []).filter(q => {
        const req = q.request as any;
        return req && req.status !== "accepted" && req.status !== "cancelled" && new Date(req.expires_at) > new Date();
      });

      console.log(`Found ${activeForwarded.length} forwarded quotes without customer selection older than ${customerQuoteDays} days`);

      for (const quote of activeForwarded) {
        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "quote_pending_customer")
          .eq("auto_entity_id", quote.request_id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const req = quote.request as any;
        const customerName = req?.customer_company || req?.customer_name || "Onbekend";

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `Klant ${customerName} heeft nog geen logiesofferte gekozen`,
            description: `Er zijn offertes doorgestuurd naar de klant, maar er is nog geen selectie gemaakt.`,
            priority: "normal",
            status: "todo",
            related_request_id: req?.linked_program_id || null,
            auto_type: "quote_pending_customer",
            auto_entity_id: quote.request_id,
          });

        if (!todoError) totalCreated++;
      }
    }

    // =============================================
    // CHECK 4: Inactive program requests
    // =============================================
    const requestCutoff = new Date();
    requestCutoff.setDate(requestCutoff.getDate() - customerRequestDays);

    const { data: inactiveRequests, error: inactiveError } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_company, updated_at, status, expires_at")
      .eq("status", "active")
      .eq("completion_status", "in_progress")
      .lt("updated_at", requestCutoff.toISOString())
      .gt("expires_at", new Date().toISOString());

    if (inactiveError) {
      console.error("Error fetching inactive requests:", inactiveError);
    } else {
      console.log(`Found ${inactiveRequests?.length || 0} inactive program requests older than ${customerRequestDays} days`);

      for (const req of inactiveRequests || []) {
        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "request_no_response")
          .eq("auto_entity_id", req.id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const customerName = req.customer_company || req.customer_name;
        const daysSince = Math.floor(
          (Date.now() - new Date(req.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `Aanvraag ${customerName} is ${daysSince} dagen inactief`,
            description: `Deze aanvraag is al ${daysSince} dagen niet bijgewerkt. Neem contact op met de klant om de voortgang te bespreken.`,
            priority: daysSince > customerRequestDays * 2 ? "high" : "normal",
            status: "todo",
            related_request_id: req.id,
            auto_type: "request_no_response",
            auto_entity_id: req.id,
          });

        if (!todoError) totalCreated++;
      }
    }

    // =============================================
    // CHECK 5: Expired accommodation quotes
    // =============================================
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: expiredQuotes, error: expiredError } = await supabase
      .from("accommodation_quotes")
      .select(`
        id,
        partner_id,
        request_id,
        accommodation_name,
        valid_until,
        partner:partners(name, email),
        request:accommodation_requests(
          customer_name,
          customer_company,
          status,
          expires_at,
          linked_program_id
        )
      `)
      .eq("status", "submitted")
      .lt("valid_until", today);

    if (expiredError) {
      console.error("Error fetching expired quotes:", expiredError);
    } else {
      // Filter out quotes where the request is cancelled or expired
      const activeExpired = (expiredQuotes || []).filter(q => {
        const req = q.request as any;
        return req && req.status !== "cancelled" && req.status !== "expired" && new Date(req.expires_at) > new Date();
      });

      console.log(`Found ${activeExpired.length} expired accommodation quotes`);

      for (const quote of activeExpired) {
        // Update status to expired
        const { error: updateError } = await supabase
          .from("accommodation_quotes")
          .update({ status: "expired" })
          .eq("id", quote.id);

        if (updateError) {
          console.error(`Error updating quote ${quote.id} to expired:`, updateError);
          continue;
        }

        const partner = quote.partner as any;
        const req = quote.request as any;
        const partnerName = partner?.name || "Onbekend";
        const partnerEmail = partner?.email;
        const customerName = req?.customer_company || req?.customer_name || "Onbekend";

        // Send email to partner
        if (partnerEmail) {
          const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
          const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");

          if (mailjetApiKey && mailjetSecretKey) {
            // Try to use DB template first
            const { data: template } = await supabase
              .from("email_templates")
              .select("subject, body_html")
              .eq("id", "quote_expired_partner")
              .eq("is_active", true)
              .maybeSingle();

            const validUntilFormatted = new Date(quote.valid_until).toLocaleDateString("nl-NL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            const portalUrl = "https://bureauvlieland.nl/partner/logies";
            const subject = template
              ? template.subject
                  .replace(/\{\{customer_name\}\}/g, customerName)
                  .replace(/\{\{accommodation_name\}\}/g, quote.accommodation_name)
              : `Uw logiesofferte voor ${customerName} is verlopen`;

            const body = template
              ? template.body_html
                  .replace(/\{\{customer_name\}\}/g, customerName)
                  .replace(/\{\{accommodation_name\}\}/g, quote.accommodation_name)
                  .replace(/\{\{valid_until\}\}/g, validUntilFormatted)
                  .replace(/\{\{partner_name\}\}/g, partnerName)
                  .replace(/\{\{portal_url\}\}/g, portalUrl)
              : `<p>Beste ${partnerName},</p>
                 <p>Uw offerte '<strong>${quote.accommodation_name}</strong>' voor ${customerName} was geldig tot ${validUntilFormatted} en is inmiddels verlopen.</p>
                 <p>U kunt de geldigheid verlengen via uw partnerportaal.</p>
                 <p><a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:6px;">Offerte bekijken</a></p>
                 <p>Met vriendelijke groet,<br/>Bureau Vlieland</p>`;

            try {
              const emailResp = await fetch("https://api.mailjet.com/v3.1/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${btoa(`${mailjetApiKey}:${mailjetSecretKey}`)}`,
                },
                body: JSON.stringify({
                  Messages: [{
                    From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                    To: [{ Email: partnerEmail, Name: partnerName }],
                    Subject: subject,
                    HTMLPart: body,
                  }],
                }),
              });

              if (emailResp.ok) {
                console.log(`Sent expired quote email to ${partnerEmail}`);

                // Log email
                await supabase.from("email_log").insert({
                  email_type: "quote_expired_partner",
                  subject,
                  recipient_email: partnerEmail,
                  recipient_name: partnerName,
                  related_accommodation_id: (req as any)?.id || null,
                  related_partner_id: quote.partner_id,
                  status: "sent",
                  sent_at: new Date().toISOString(),
                });
              } else {
                console.error(`Failed to send expired quote email:`, await emailResp.text());
              }
            } catch (emailErr) {
              console.error("Error sending expired quote email:", emailErr);
            }
          }
        }

        // Create admin todo
        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "quote_expired_partner")
          .eq("auto_entity_id", quote.id)
          .neq("status", "done")
          .maybeSingle();

        if (!existingTodo) {
          const { error: todoError } = await supabase
            .from("admin_todos")
            .insert({
              title: `Logiesofferte ${partnerName} voor ${customerName} is verlopen`,
              description: `De offerte '${quote.accommodation_name}' was geldig tot ${quote.valid_until}. De partner heeft een notificatie ontvangen.`,
              priority: "normal",
              status: "todo",
              related_partner_id: quote.partner_id,
              related_request_id: req?.linked_program_id || null,
              auto_type: "quote_expired_partner",
              auto_entity_id: quote.id,
            });

          if (!todoError) totalCreated++;
        }
      }
    }

    console.log(`Job completed: ${totalCreated} reminders created, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({
        message: "Check completed",
        created: totalCreated,
        skipped: totalSkipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-pending-items:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
