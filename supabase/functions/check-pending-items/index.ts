import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSubjectPrefix, getRecipientEmail } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default reminder thresholds (overridden by app_settings)
const DEFAULT_REMINDER_DAYS_PARTNER = 5;
const DEFAULT_REMINDER_DAYS_CUSTOMER_QUOTE = 7;
const DEFAULT_REMINDER_DAYS_CUSTOMER_REQUEST = 14;
const DEFAULT_REMINDER_DAYS_PARTNER_ACTIVITY = 3;
const DEFAULT_CUSTOMER_STATUS_EMAIL_PENDING_DAYS = 5;
const DEFAULT_CUSTOMER_STATUS_EMAIL_STALE_DAYS = 5;
const DEFAULT_CUSTOMER_INPUTS_WARNING_DAYS = 14;

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
        "reminder_email_enabled",
        "customer_status_email_pending_days",
        "customer_status_email_stale_days",
        "customer_inputs_warning_days",
      ]);

    const settings: Record<string, any> = {};
    for (const row of settingsRows || []) {
      settings[row.id] = row.value;
    }

    const partnerQuoteDays = Number(settings["reminder_days_partner_quote"]) || DEFAULT_REMINDER_DAYS_PARTNER;
    const customerQuoteDays = Number(settings["reminder_days_customer_quote"]) || DEFAULT_REMINDER_DAYS_CUSTOMER_QUOTE;
    const customerRequestDays = Number(settings["reminder_days_customer_request"]) || DEFAULT_REMINDER_DAYS_CUSTOMER_REQUEST;
    const partnerActivityDays = DEFAULT_REMINDER_DAYS_PARTNER_ACTIVITY;
    const customerStatusEmailPendingDays = Number(settings["customer_status_email_pending_days"]) || DEFAULT_CUSTOMER_STATUS_EMAIL_PENDING_DAYS;
    const customerStatusEmailStaleDays = Number(settings["customer_status_email_stale_days"]) || DEFAULT_CUSTOMER_STATUS_EMAIL_STALE_DAYS;
    const customerInputsWarningDays = Number(settings["customer_inputs_warning_days"]) || DEFAULT_CUSTOMER_INPUTS_WARNING_DAYS;
    const reminderEmailEnabled = settings["reminder_email_enabled"] !== false;

    const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
    const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");
    const canSendEmail = reminderEmailEnabled && !!mailjetApiKey && !!mailjetSecretKey;

    // Helper: send a reminder email via Mailjet
    async function sendReminderEmail(opts: {
      templateId: string;
      recipientEmail: string;
      recipientName: string;
      subject: string;
      fallbackHtml: string;
      variables: Record<string, string>;
      logExtra: {
        email_type: string;
        related_partner_id?: string;
        related_request_id?: string;
        related_item_id?: string;
      };
    }) {
      // Check deduplication
      const dedupeFilter: Record<string, string> = {
        email_type: opts.logExtra.email_type,
        recipient_email: opts.recipientEmail,
      };
      if (opts.logExtra.related_item_id) {
        dedupeFilter.related_item_id = opts.logExtra.related_item_id;
      }
      
      const dedupeQuery = supabase
        .from("email_log")
        .select("id")
        .eq("email_type", opts.logExtra.email_type)
        .eq("recipient_email", opts.recipientEmail);
      
      if (opts.logExtra.related_item_id) {
        dedupeQuery.eq("related_item_id", opts.logExtra.related_item_id);
      }

      const { data: alreadySent } = await dedupeQuery.maybeSingle();
      if (alreadySent) {
        console.log(`Skipping ${opts.logExtra.email_type} — already sent to ${opts.recipientEmail}`);
        return;
      }

      // Try DB template
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, body_html")
        .eq("id", opts.templateId)
        .eq("is_active", true)
        .maybeSingle();

      let subject = opts.subject;
      let body = opts.fallbackHtml;

      if (template) {
        subject = template.subject;
        body = template.body_html;
        for (const [key, val] of Object.entries(opts.variables)) {
          const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
          subject = subject.replace(re, val);
          body = body.replace(re, val);
        }
      }

      try {
        const resp = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${mailjetApiKey}:${mailjetSecretKey}`)}`,
          },
          body: JSON.stringify({
            Messages: [{
              From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
              To: [{ Email: getRecipientEmail(opts.recipientEmail, req.headers.get("origin") || undefined), Name: opts.recipientName }],
              Subject: `${getSubjectPrefix(req.headers.get("origin") || undefined)}${subject}`,
              HTMLPart: body,
            }],
          }),
        });

        const status = resp.ok ? "sent" : "failed";
        if (!resp.ok) console.error(`Failed to send ${opts.logExtra.email_type}:`, await resp.text());
        else console.log(`Sent ${opts.logExtra.email_type} to ${opts.recipientEmail}`);

        const fullSubject = `${getSubjectPrefix(req.headers.get("origin") || undefined)}${subject}`;
        await logEmail({
          email_type: opts.logExtra.email_type,
          subject: fullSubject,
          recipient_email: getRecipientEmail(opts.recipientEmail, req.headers.get("origin") || undefined),
          recipient_name: opts.recipientName,
          related_partner_id: opts.logExtra.related_partner_id,
          related_request_id: opts.logExtra.related_request_id,
          related_item_id: opts.logExtra.related_item_id,
          status,
          sent_by: "system:cron",
          metadata: {
            template_name: opts.logExtra.email_type,
            actor: opts.logExtra.email_type.startsWith("reminder_quote")
              ? "system → partner (offerte herinnering)"
              : opts.logExtra.email_type.startsWith("reminder_activity")
              ? "system → partner (activiteit herinnering)"
              : opts.logExtra.email_type.startsWith("reminder_")
              ? "system → klant (herinnering)"
              : "system:cron",
          },
        });
      } catch (err) {
        console.error(`Error sending ${opts.logExtra.email_type}:`, err);
      }
    }

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
          .select("name, email, contact_email")
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

        // Send reminder email to partner
        if (canSendEmail && partner) {
          const partnerEmail = partner.contact_email || partner.email;
          const portalUrl = "https://bureauvlieland.nl/partner";
          await sendReminderEmail({
            templateId: "reminder_activity_pending",
            recipientEmail: partnerEmail,
            recipientName: partnerName,
            subject: `Herinnering: reactie gevraagd op "${item.block_name}"`,
            variables: {
              partner_name: partnerName,
              block_name: item.block_name,
              customer_name: customerName,
              days_since: String(daysSinceCreated),
              portal_url: portalUrl,
            },
            fallbackHtml: `<p>Beste ${partnerName},</p>
              <p>Wij hebben ${daysSinceCreated} dagen geleden een aanvraag verstuurd voor de activiteit '<strong>${item.block_name}</strong>' (klant: ${customerName}), maar we hebben nog geen reactie van u ontvangen.</p>
              <p>Kunt u via uw partnerportaal aangeven of u beschikbaar bent?</p>
              <p><a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:6px;">Naar het portaal</a></p>
              <p>Met vriendelijke groet,<br/>Bureau Vlieland</p>`,
            logExtra: {
              email_type: "reminder_activity_pending",
              related_partner_id: item.provider_id,
              related_request_id: request.id,
              related_item_id: item.id,
            },
          });
        }
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
        updated_at,
        partner:partners(name, email, contact_email),
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
      .lt("updated_at", partnerQuoteCutoff.toISOString());

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

        const partnerData = quote.partner as any;
        const partnerName = partnerData?.name || "Onbekend";
        const req = quote.request as any;
        const customerName = req?.customer_company || req?.customer_name || "Onbekend";
        const daysSince = Math.floor(
          (Date.now() - new Date(quote.updated_at).getTime()) / (1000 * 60 * 60 * 24)
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

        // Send reminder email to partner
        if (canSendEmail && partnerData) {
          const partnerEmail = partnerData.contact_email || partnerData.email;
          const portalUrl = "https://bureauvlieland.nl/partner/logies";
          const arrivalFormatted = req?.arrival_date ? new Date(req.arrival_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
          const departureFormatted = req?.departure_date ? new Date(req.departure_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";

          await sendReminderEmail({
            templateId: "reminder_quote_pending",
            recipientEmail: partnerEmail,
            recipientName: partnerName,
            subject: `Herinnering: logiesofferte gevraagd voor ${customerName}`,
            variables: {
              partner_name: partnerName,
              customer_name: customerName,
              arrival_date: arrivalFormatted,
              departure_date: departureFormatted,
              number_of_guests: String(req?.number_of_guests || ""),
              days_since: String(daysSince),
              portal_url: portalUrl,
            },
            fallbackHtml: `<p>Beste ${partnerName},</p>
              <p>Wij hebben ${daysSince} dagen geleden een logiesofferte-aanvraag verstuurd voor ${customerName} (${arrivalFormatted} – ${departureFormatted}, ${req?.number_of_guests || "?"} gasten), maar we hebben nog geen reactie ontvangen.</p>
              <p>Kunt u via uw partnerportaal een offerte indienen?</p>
              <p><a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:6px;">Naar het portaal</a></p>
              <p>Met vriendelijke groet,<br/>Bureau Vlieland</p>`,
            logExtra: {
              email_type: "reminder_quote_pending",
              related_partner_id: quote.partner_id,
              related_item_id: quote.id,
            },
          });
        }
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

        // Anchor on real customer/partner activity instead of mutable updated_at.
        // updated_at fires on every admin edit (notes, prices) and would constantly reset.
        const { data: lastOutbound } = await supabase
          .from("email_log")
          .select("created_at, sent_at")
          .eq("related_request_id", req.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data: lastHistory } = await supabase
          .from("program_request_history")
          .select("created_at")
          .eq("request_id", req.id)
          .in("actor", ["customer", "partner"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const anchorCandidates: number[] = [new Date(req.updated_at).getTime()];
        const lastMailTs = lastOutbound?.sent_at || lastOutbound?.created_at;
        if (lastMailTs) anchorCandidates.push(new Date(lastMailTs).getTime());
        if (lastHistory?.created_at) anchorCandidates.push(new Date(lastHistory.created_at).getTime());
        const anchorTs = Math.max(...anchorCandidates);

        // Skip if a real customer/partner interaction happened within the threshold
        if (Date.now() - anchorTs < customerRequestDays * 24 * 60 * 60 * 1000) {
          continue;
        }

        const daysSince = Math.floor((Date.now() - anchorTs) / (1000 * 60 * 60 * 24));

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `Aanvraag ${customerName} is inactief`,
            description: `Stand bij aanmaken: ${daysSince} dagen geen activiteit van/naar klant of partner. Zie kaart voor actuele leeftijd.`,
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
                    To: [{ Email: getRecipientEmail(partnerEmail, req.headers.get("origin") || undefined), Name: partnerName }],
                    Subject: `${getSubjectPrefix(req.headers.get("origin") || undefined)}${subject}`,
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

    // ============================================================
    // POST-EXECUTION CHECKS: feedback + invoice verification
    // ============================================================
    console.log("Checking post-execution items...");

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get executed items
    const { data: executedItems } = await supabase
      .from("program_request_items")
      .select("id, block_name, provider_name, provider_id, request_id, executed_at")
      .not("executed_at", "is", null)
      .neq("status", "cancelled");

    if (executedItems && executedItems.length > 0) {
      // Get request info for customer names
      const execRequestIds = [...new Set(executedItems.map(i => i.request_id))];
      const { data: execRequests } = await supabase
        .from("program_requests")
        .select("id, customer_name")
        .in("id", execRequestIds);
      const execReqMap = new Map((execRequests || []).map(r => [r.id, r]));

      // Get existing purchase invoices for these items
      const execItemIds = executedItems.map(i => i.id);
      const { data: existingInvoices } = await supabase
        .from("partner_purchase_invoices")
        .select("item_id")
        .in("item_id", execItemIds);
      const invoicedItemIds = new Set((existingInvoices || []).map(i => i.item_id));

      for (const item of executedItems) {
        const req = execReqMap.get(item.request_id);
        const customerName = req?.customer_name || "Onbekend";

        // Post-execution feedback: 1 day after executed_at
        if (item.executed_at && item.executed_at <= oneDayAgo) {
          const { data: existingFeedback } = await supabase
            .from("admin_todos")
            .select("id")
            .eq("auto_type", "post_execution_feedback")
            .eq("auto_entity_id", item.id)
            .neq("status", "done")
            .maybeSingle();

          if (!existingFeedback) {
            // Check if already created and done (don't recreate)
            const { data: doneFeedback } = await supabase
              .from("admin_todos")
              .select("id")
              .eq("auto_type", "post_execution_feedback")
              .eq("auto_entity_id", item.id)
              .eq("status", "done")
              .maybeSingle();

            if (!doneFeedback) {
              const { error: fbError } = await supabase
                .from("admin_todos")
                .insert({
                  title: `Feedback vragen aan ${customerName} voor "${item.block_name}"`,
                  description: `De activiteit "${item.block_name}" (${item.provider_name}) is uitgevoerd. Overweeg feedback te vragen aan de klant.`,
                  priority: "low",
                  status: "todo",
                  related_request_id: item.request_id,
                  related_partner_id: item.provider_id,
                  auto_type: "post_execution_feedback",
                  auto_entity_id: item.id,
                });
              if (!fbError) totalCreated++;
            }
          }
        }

        // Post-execution invoice check: 7 days after executed_at, no purchase invoice
        if (item.executed_at && item.executed_at <= sevenDaysAgo && !invoicedItemIds.has(item.id)) {
          const { data: existingCheck } = await supabase
            .from("admin_todos")
            .select("id")
            .eq("auto_type", "post_execution_invoice_check")
            .eq("auto_entity_id", item.id)
            .neq("status", "done")
            .maybeSingle();

          if (!existingCheck) {
            const { data: doneCheck } = await supabase
              .from("admin_todos")
              .select("id")
              .eq("auto_type", "post_execution_invoice_check")
              .eq("auto_entity_id", item.id)
              .eq("status", "done")
              .maybeSingle();

            if (!doneCheck) {
              const { error: icError } = await supabase
                .from("admin_todos")
                .insert({
                  title: `Factuur partner ${item.provider_name} nog niet ontvangen voor "${item.block_name}"`,
                  description: `De activiteit is meer dan 7 dagen geleden uitgevoerd maar er is nog geen inkoopfactuur geregistreerd.`,
                  priority: "normal",
                  status: "todo",
                  related_request_id: item.request_id,
                  related_partner_id: item.provider_id,
                  auto_type: "post_execution_invoice_check",
                  auto_entity_id: item.id,
                });
              if (!icError) totalCreated++;
            }
          }
        }
      }
    }

    // =============================================
    // CHECK 9: Quotes expiring soon (within 3 days)
    // =============================================
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

    const { data: expiringPrograms, error: expiringError } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_company, quote_valid_until, quote_status")
      .eq("status", "active")
      .eq("quote_status", "offerte_verstuurd")
      .not("quote_valid_until", "is", null)
      .lte("quote_valid_until", threeDaysStr)
      .gt("quote_valid_until", new Date().toISOString().split("T")[0]);

    if (expiringError) {
      console.error("Error fetching expiring quotes:", expiringError);
    } else {
      console.log(`Found ${expiringPrograms?.length || 0} quotes expiring within 3 days`);

      for (const prog of expiringPrograms || []) {
        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "quote_expiring_soon")
          .eq("auto_entity_id", prog.id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const customerLabel = prog.customer_company || prog.customer_name;
        const daysLeft = Math.ceil(
          (new Date(prog.quote_valid_until!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `Offerte ${customerLabel} verloopt binnenkort`,
            description: `Stand bij aanmaken: nog ${daysLeft} dag(en). Geldig tot ${prog.quote_valid_until}. Neem contact op met de klant.`,
            priority: "high",
            status: "todo",
            related_request_id: prog.id,
            auto_type: "quote_expiring_soon",
            auto_entity_id: prog.id,
          });


        if (!todoError) totalCreated++;
      }
    }

    // =============================================
    // CHECK 10: Customer status email — Phase B
    // (offerte_verstuurd > N dagen, geen klant-akkoord)
    // =============================================
    const customerStatusCutoff = new Date();
    customerStatusCutoff.setDate(customerStatusCutoff.getDate() - customerStatusEmailPendingDays);

    const { data: phaseBPrograms, error: phaseBError } = await supabase
      .from("program_requests")
      .select(`
        id, customer_name, customer_company, quote_status, quote_sent_at,
        cancelled_at, completion_status,
        items:program_request_items(id, customer_approved_at, customer_accepted_at)
      `)
      .eq("status", "active")
      .eq("quote_status", "offerte_verstuurd")
      .is("cancelled_at", null)
      .neq("completion_status", "completed")
      .not("quote_sent_at", "is", null)
      .lt("quote_sent_at", customerStatusCutoff.toISOString());

    if (phaseBError) {
      console.error("Error fetching phase B programs:", phaseBError);
    } else {
      console.log(`Found ${phaseBPrograms?.length || 0} phase-B programs for status email todos`);

      for (const prog of phaseBPrograms || []) {
        const items = (prog.items as any[]) || [];
        const anyApproved = items.some(
          (i) => i.customer_approved_at || i.customer_accepted_at,
        );
        if (anyApproved) continue;

        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "customer_status_email_due")
          .eq("auto_entity_id", prog.id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const customerLabel = prog.customer_company || prog.customer_name;
        const daysSince = Math.floor(
          (Date.now() - new Date(prog.quote_sent_at!).getTime()) / (1000 * 60 * 60 * 24),
        );

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `${customerLabel} heeft nog geen akkoord op offerte`,
            description: `Stand bij aanmaken: offerte ${daysSince} dagen geleden verstuurd zonder reactie. Overweeg een status-mail om de klant te herinneren aan akkoord, voorwaarden en facturatiegegevens.`,
            priority: daysSince > customerStatusEmailPendingDays * 2 ? "high" : "normal",
            status: "todo",
            related_request_id: prog.id,
            auto_type: "customer_status_email_due",
            auto_entity_id: prog.id,
          });


        if (!todoError) totalCreated++;
      }
    }

    // =============================================
    // CHECK 11: Customer status update stale — Phase C
    // (klant-akkoord ontvangen, maar > N dagen geen outbound mail)
    // =============================================
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - customerStatusEmailStaleDays);

    const { data: phaseCPrograms, error: phaseCError } = await supabase
      .from("program_requests")
      .select(`
        id, customer_name, customer_company, customer_email, quote_status,
        cancelled_at, completion_status,
        items:program_request_items(id, status, customer_approved_at, customer_accepted_at, skip_partner_notification)
      `)
      .eq("status", "active")
      .is("cancelled_at", null)
      .neq("completion_status", "completed");

    if (phaseCError) {
      console.error("Error fetching phase C programs:", phaseCError);
    } else {
      for (const prog of phaseCPrograms || []) {
        const items = (prog.items as any[]) || [];
        // Phase C = at least one approved item that was/should be sent to a partner,
        // and at least one item is still pending (not yet confirmed)
        const inPhaseC =
          items.some(
            (i) =>
              (i.customer_approved_at || i.customer_accepted_at) &&
              !i.skip_partner_notification,
          ) && items.some((i) => i.status === "pending");
        if (!inPhaseC) continue;

        // Check last outbound mail to the customer for this request
        const { data: lastMail } = await supabase
          .from("email_log")
          .select("sent_at, created_at")
          .eq("related_request_id", prog.id)
          .eq("recipient_email", prog.customer_email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastTs = lastMail?.sent_at || lastMail?.created_at;
        if (lastTs && new Date(lastTs) > staleCutoff) continue;

        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "customer_status_update_due")
          .eq("auto_entity_id", prog.id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const customerLabel = prog.customer_company || prog.customer_name;
        const daysSince = lastTs
          ? Math.floor((Date.now() - new Date(lastTs).getTime()) / (1000 * 60 * 60 * 24))
          : customerStatusEmailStaleDays;

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `${customerLabel} heeft geen recente status-update ontvangen`,
            description: `Stand bij aanmaken: ${daysSince} dagen geen update naar de klant. Er staan nog onderdelen open bij partners. Overweeg een status-mail te sturen.`,
            priority: "normal",
            status: "todo",
            related_request_id: prog.id,
            auto_type: "customer_status_update_due",
            auto_entity_id: prog.id,
          });


        if (!todoError) totalCreated++;
      }
    }

    // =============================================
    // CHECK 12: Customer inputs missing near event date
    // (T-N dagen tot uitvoering, voorwaarden/facturatie/logies ontbreekt)
    // =============================================
    const warningCutoffDate = new Date();
    warningCutoffDate.setDate(warningCutoffDate.getDate() + customerInputsWarningDays);
    const warningCutoffStr = warningCutoffDate.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: nearEventPrograms, error: nearEventError } = await supabase
      .from("program_requests")
      .select(`
        id, customer_name, customer_company,
        terms_accepted_at, billing_company_name,
        selected_dates, linked_accommodation_id,
        cancelled_at, completion_status, status
      `)
      .eq("status", "active")
      .is("cancelled_at", null)
      .neq("completion_status", "completed");

    if (nearEventError) {
      console.error("Error fetching near-event programs:", nearEventError);
    } else {
      for (const prog of nearEventPrograms || []) {
        const dates = Array.isArray(prog.selected_dates)
          ? (prog.selected_dates as string[])
          : [];
        if (dates.length === 0) continue;
        const firstDate = String(dates[0]).slice(0, 10);
        if (firstDate < todayStr || firstDate > warningCutoffStr) continue;

        // Check selected accommodation if linked
        let lodgingMissing = false;
        if (prog.linked_accommodation_id) {
          const { data: selectedQuote } = await supabase
            .from("accommodation_quotes")
            .select("id")
            .eq("request_id", prog.linked_accommodation_id)
            .eq("status", "selected")
            .maybeSingle();
          lodgingMissing = !selectedQuote;
        }

        const missing: string[] = [];
        if (!prog.terms_accepted_at) missing.push("voorwaarden");
        if (!prog.billing_company_name) missing.push("facturatiegegevens");
        if (lodgingMissing) missing.push("logieskeuze");

        if (missing.length === 0) continue;

        const { data: existingTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "customer_inputs_missing")
          .eq("auto_entity_id", prog.id)
          .neq("status", "done")
          .maybeSingle();

        if (existingTodo) {
          totalSkipped++;
          continue;
        }

        const customerLabel = prog.customer_company || prog.customer_name;
        const daysUntil = Math.ceil(
          (new Date(firstDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `${customerLabel} mist nog: ${missing.join(", ")}`,
            description: `Uitvoeringsdatum: ${firstDate}. Stand bij aanmaken: nog ${daysUntil} dag(en). Niet aangeleverd: ${missing.join(", ")}. Overweeg een status-mail om dit te bespoedigen.`,
            priority: daysUntil <= 7 ? "high" : "normal",
            status: "todo",
            due_date: firstDate,
            related_request_id: prog.id,
            auto_type: "customer_inputs_missing",
            auto_entity_id: prog.id,
          });


        if (!todoError) totalCreated++;
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
