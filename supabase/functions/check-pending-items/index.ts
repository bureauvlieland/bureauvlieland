import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSubjectPrefix, getRecipientEmail } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { cooldownFor, fetchLastContactByProject } from "../_shared/project-activity.ts";

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

    // Pre-fetch alle projecten die nu gesnoozed zijn. Tijdens snooze pauzeren we
    // alle automatische todos én reminder-mails voor het project, en sluiten we
    // bestaande open auto-todos via reconcile-admin-todos.
    const nowIso = new Date().toISOString();
    const { data: snoozedRows } = await supabase
      .from("program_requests")
      .select("id")
      .gt("snoozed_until", nowIso);
    const snoozedRequestIds = new Set<string>((snoozedRows || []).map((r: any) => r.id));
    const isSnoozed = (id?: string | null): boolean => !!id && snoozedRequestIds.has(id);
    console.log(`Snoozed projects skipped this run: ${snoozedRequestIds.size}`);

    // Cooldown-set: projecten met contact in de laatste 2 dagen krijgen géén
    // nieuwe reminder-todos (zou anders direct na een opvolgmail terug ploppen).
    const { data: activeProjects } = await supabase
      .from("program_requests")
      .select("id")
      .eq("status", "active")
      .is("cancelled_at", null);
    const activeIds = (activeProjects ?? []).map((r: any) => r.id);
    const lastContactMap = await fetchLastContactByProject(supabase, activeIds);
    const hotProjectIds = new Set<string>();
    for (const [id, ts] of lastContactMap) {
      if (cooldownFor(ts) === "hot") hotProjectIds.add(id);
    }
    const isHot = (id?: string | null): boolean => !!id && hotProjectIds.has(id);
    console.log(`Hot projects (≤2d contact) — reminders skipped: ${hotProjectIds.size}`);



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
            Messages: [{ TrackClicks: "disabled", TrackOpens: "disabled",
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
        if (isSnoozed(item.request_id)) { totalSkipped++; continue; }
        if (isHot(item.request_id))     { totalSkipped++; continue; }
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
          expires_at,
          linked_program_id
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
        const linkedProgramId = (quote.request as any)?.linked_program_id ?? null;
        if (isSnoozed(linkedProgramId)) { totalSkipped++; continue; }
        if (isHot(linkedProgramId))     { totalSkipped++; continue; }
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
        const linkedProgramId = (quote.request as any)?.linked_program_id ?? null;
        if (isSnoozed(linkedProgramId)) { totalSkipped++; continue; }
        if (isHot(linkedProgramId))     { totalSkipped++; continue; }
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
        if (isSnoozed(req.id)) { totalSkipped++; continue; }
        if (isHot(req.id))     { totalSkipped++; continue; }
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
        const linkedProgramId = (quote.request as any)?.linked_program_id ?? null;
        if (isSnoozed(linkedProgramId)) { totalSkipped++; continue; }
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
                  Messages: [{ TrackClicks: "disabled", TrackOpens: "disabled",
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
                await logEmail({
                  email_type: "quote_expired_partner",
                  subject,
                  recipient_email: partnerEmail,
                  recipient_name: partnerName,
                  related_accommodation_id: (req as any)?.id || undefined,
                  related_partner_id: quote.partner_id,
                  status: "sent",
                  sent_by: "system:cron",
                  metadata: {
                    template_name: "quote_expired_partner",
                    actor: "system → partner (offerte verlopen)",
                    quote_id: quote.id,
                  },
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

    // Get executed items (incl. fields needed for partner invoice reminders)
    const { data: executedItems } = await supabase
      .from("program_request_items")
      .select("id, block_name, provider_name, provider_id, request_id, executed_at, block_type, quoted_price, proforma_amount_excl_vat")
      .not("executed_at", "is", null)
      .neq("status", "cancelled");

    if (executedItems && executedItems.length > 0) {
      // Get request info for customer names + reference
      const execRequestIds = [...new Set(executedItems.map(i => i.request_id))];
      const { data: execRequests } = await supabase
        .from("program_requests")
        .select("id, customer_name, customer_company, reference_number")
        .in("id", execRequestIds);
      const execReqMap = new Map((execRequests || []).map(r => [r.id, r]));

      // Get existing purchase invoices for these items
      const execItemIds = executedItems.map(i => i.id);
      const { data: existingInvoices } = await supabase
        .from("partner_purchase_invoices")
        .select("item_id")
        .in("item_id", execItemIds);
      const invoicedItemIds = new Set((existingInvoices || []).map(i => i.item_id));

      // Pre-fetch partner contacts for executed items (skip bureau items)
      const execPartnerIds = [...new Set(
        executedItems
          .filter(i => i.provider_id && i.block_type !== "bureau")
          .map(i => i.provider_id as string)
      )];
      const execPartners = execPartnerIds.length > 0
        ? (await supabase
            .from("partners")
            .select("id, name, email, contact_email")
            .in("id", execPartnerIds)).data || []
        : [];
      const partnerMap = new Map(execPartners.map((p: any) => [p.id, p]));

      const formatEuro = (n: number | null | undefined) =>
        typeof n === "number"
          ? n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })
          : "n.t.b.";

      for (const item of executedItems) {
        if (isSnoozed(item.request_id)) { totalSkipped++; continue; }
        const req = execReqMap.get(item.request_id) as any;
        const customerName = req?.customer_company || req?.customer_name || "Onbekend";
        const referenceNumber = req?.reference_number || "—";

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

        // Partner invoice reminder T+1: 1 day after execution, no purchase invoice
        if (
          canSendEmail &&
          item.executed_at && item.executed_at <= oneDayAgo &&
          !invoicedItemIds.has(item.id) &&
          item.block_type !== "bureau"
        ) {
          const partner = partnerMap.get(item.provider_id as string) as any;
          if (partner) {
            const partnerEmail = partner.contact_email || partner.email;
            const partnerName = partner.name || item.provider_name || "partner";
            const amountExcl = formatEuro(item.proforma_amount_excl_vat ?? null);
            await sendReminderEmail({
              templateId: "partner_invoice_reminder_t1",
              recipientEmail: partnerEmail,
              recipientName: partnerName,
              subject: `Vriendelijk verzoek: factuur voor "${item.block_name}" (${customerName})`,
              variables: {
                partner_name: partnerName,
                block_name: item.block_name,
                customer_name: customerName,
                reference_number: referenceNumber,
                amount_excl_vat: amountExcl,
                portal_url: "https://bureauvlieland.nl/partner",
              },
              fallbackHtml: `<p>Hoi ${partnerName},</p><p>Gisteren is "<strong>${item.block_name}</strong>" voor ${customerName} uitgevoerd. Stuur je factuur naar Bureau Vlieland; wij factureren centraal richting de klant.</p><p>Referentie: ${referenceNumber}<br/>Bedrag (excl. BTW, indicatief): ${amountExcl}</p>`,
              logExtra: {
                email_type: "partner_invoice_reminder_t1",
                related_partner_id: item.provider_id as string,
                related_request_id: item.request_id,
                related_item_id: item.id,
              },
            });
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

          // Partner invoice escalation T+7
          if (canSendEmail && item.block_type !== "bureau") {
            const partner = partnerMap.get(item.provider_id as string) as any;
            if (partner) {
              const partnerEmail = partner.contact_email || partner.email;
              const partnerName = partner.name || item.provider_name || "partner";
              const amountExcl = formatEuro(item.proforma_amount_excl_vat ?? null);
              await sendReminderEmail({
                templateId: "partner_invoice_reminder_t7",
                recipientEmail: partnerEmail,
                recipientName: partnerName,
                subject: `Herinnering: factuur ontbreekt nog voor "${item.block_name}" (${customerName})`,
                variables: {
                  partner_name: partnerName,
                  block_name: item.block_name,
                  customer_name: customerName,
                  reference_number: referenceNumber,
                  amount_excl_vat: amountExcl,
                  portal_url: "https://bureauvlieland.nl/partner",
                },
                fallbackHtml: `<p>Hoi ${partnerName},</p><p>Een week geleden is "<strong>${item.block_name}</strong>" voor ${customerName} uitgevoerd, maar we hebben jouw factuur nog niet ontvangen. Wil je deze deze week alsnog sturen?</p><p>Referentie: ${referenceNumber}<br/>Bedrag (excl. BTW, indicatief): ${amountExcl}</p>`,
                logExtra: {
                  email_type: "partner_invoice_reminder_t7",
                  related_partner_id: item.provider_id as string,
                  related_request_id: item.request_id,
                  related_item_id: item.id,
                },
              });
            }
          }
        }
      }
    }

    // =============================================
    // POST-EXECUTION AFTERSALES / REVIEW MAIL (per project)
    // =============================================
    try {
      // Settings (with sensible defaults)
      const { data: aftersalesSettings } = await supabase
        .from("app_settings")
        .select("id, value")
        .in("id", [
          "customer_aftersales_days_after",
          "customer_aftersales_auto_send",
        ]);
      const settingsMap = new Map(
        (aftersalesSettings || []).map((s: any) => [s.id, s.value]),
      );
      const daysAfter = Number(settingsMap.get("customer_aftersales_days_after") ?? 3) || 3;
      const autoSend = Boolean(settingsMap.get("customer_aftersales_auto_send") ?? false);

      const cutoff = new Date(now.getTime() - daysAfter * 24 * 60 * 60 * 1000).toISOString();

      // Group all program_request_items by request, to determine completion + last execution
      const { data: aftersalesItems } = await supabase
        .from("program_request_items")
        .select("request_id, status, executed_at, block_type")
        .neq("status", "cancelled");

      const byRequest = new Map<string, { lastExecuted: string | null; allExecuted: boolean }>();
      for (const it of aftersalesItems || []) {
        const cur = byRequest.get(it.request_id) || { lastExecuted: null, allExecuted: true };
        if (!it.executed_at) {
          cur.allExecuted = false;
        } else if (!cur.lastExecuted || it.executed_at > cur.lastExecuted) {
          cur.lastExecuted = it.executed_at;
        }
        byRequest.set(it.request_id, cur);
      }

      const eligibleRequestIds = [...byRequest.entries()]
        .filter(([, v]) => v.allExecuted && v.lastExecuted && v.lastExecuted <= cutoff)
        .map(([id]) => id);

      if (eligibleRequestIds.length > 0) {
        const { data: eligibleRequests } = await supabase
          .from("program_requests")
          .select("id, reference_number, customer_name, customer_company, customer_email, aftersales_sent_at, status, cancelled_at")
          .in("id", eligibleRequestIds);

        for (const reqRow of eligibleRequests || []) {
          if (isSnoozed(reqRow.id)) { totalSkipped++; continue; }
          if (!reqRow.customer_email) continue;
          if (reqRow.aftersales_sent_at) continue;
          if (reqRow.cancelled_at || reqRow.status === "cancelled") continue;

          const customerName = reqRow.customer_company || reqRow.customer_name || "Onbekend";

          if (autoSend && canSendEmail) {
            try {
              const { error: invokeErr } = await supabase.functions.invoke(
                "send-customer-aftersales",
                { body: { request_id: reqRow.id, sent_by: "system" } },
              );
              if (!invokeErr) totalCreated++;
            } catch (e) {
              console.error("auto-send aftersales failed", reqRow.id, e);
            }
            continue;
          }

          // Todo path
          const { data: existing } = await supabase
            .from("admin_todos")
            .select("id")
            .eq("auto_type", "customer_aftersales")
            .eq("auto_entity_id", reqRow.id)
            .maybeSingle();

          if (!existing) {
            const { error: todoError } = await supabase
              .from("admin_todos")
              .insert({
                title: `Aftersales-mail versturen aan ${customerName}`,
                description: `Het programma is uitgevoerd. Verstuur de aftersales-mail met de vraag om een review op Google en de eigen site.`,
                priority: "low",
                status: "todo",
                related_request_id: reqRow.id,
                auto_type: "customer_aftersales",
                auto_entity_id: reqRow.id,
              });
            if (!todoError) totalCreated++;
          }
        }
      }
    } catch (e) {
      console.error("aftersales block error", e);
    }

    // =============================================
     // PARTNER EVENT-DATE EMAILS: T-7 onbevestigd & T-3 briefing
    // =============================================
    if (canSendEmail) {
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
      const in7 = new Date(todayMidnight); in7.setDate(in7.getDate() + 7);
      const in3 = new Date(todayMidnight); in3.setDate(in3.getDate() + 3);
      const horizon = new Date(todayMidnight); horizon.setDate(horizon.getDate() + 8);

      const { data: upcomingItems } = await supabase
        .from("program_request_items")
        .select(`
          id, block_name, status, day_index, provider_id, provider_name,
          block_type, request_id, preferred_time, proposed_time, confirmed_time,
          program_requests!inner (
            id, customer_name, customer_company, reference_number,
            selected_dates, number_of_people, status, cancelled_at
          )
        `)
        .in("status", ["pending", "confirmed"])
        .neq("block_type", "self_arranged")
        .neq("block_type", "bureau");

      const fmtDateNL = (s: string) =>
        new Date(s).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

      for (const item of upcomingItems || []) {
        if (isSnoozed(item.request_id)) continue;
        const reqRow: any = Array.isArray(item.program_requests)
          ? item.program_requests[0]
          : item.program_requests;
        if (!reqRow || reqRow.status !== "active" || reqRow.cancelled_at) continue;
        if (!item.provider_id) continue;

        const dates: string[] = Array.isArray(reqRow.selected_dates) ? reqRow.selected_dates : [];
        const dateStr = dates[item.day_index ?? 0] || dates[0];
        if (!dateStr) continue;
        const eventDate = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
        if (isNaN(eventDate.getTime())) continue;
        if (eventDate < todayMidnight || eventDate > horizon) continue;

        const daysUntil = Math.round((eventDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

        const { data: partner } = await supabase
          .from("partners")
          .select("name, email, contact_email")
          .eq("id", item.provider_id)
          .maybeSingle();
        if (!partner) continue;
        const partnerEmail = partner.contact_email || partner.email;
        const partnerName = partner.name || item.provider_name || "partner";
        const customerName = reqRow.customer_company || reqRow.customer_name || "Onbekend";
        const portalUrl = "https://bureauvlieland.nl/partner";

        // T-7: still pending
        if (daysUntil === 7 && item.status === "pending") {
          await sendReminderEmail({
            templateId: "partner_activity_unconfirmed_t7",
            recipientEmail: partnerEmail,
            recipientName: partnerName,
            subject: `Reactie nodig: "${item.block_name}" over 7 dagen voor ${customerName}`,
            variables: {
              partner_name: partnerName,
              block_name: item.block_name,
              customer_name: customerName,
              event_date: fmtDateNL(String(dateStr)),
              portal_url: portalUrl,
            },
            fallbackHtml: `<p>Hoi ${partnerName},</p><p>De activiteit "<strong>${item.block_name}</strong>" voor ${customerName} staat over 7 dagen (${fmtDateNL(String(dateStr))}) gepland, maar we hebben nog geen bevestiging van je. Reageer s.v.p. vandaag nog via het partnerportaal.</p>`,
            logExtra: {
              email_type: "partner_activity_unconfirmed_t7",
              related_partner_id: item.provider_id,
              related_request_id: item.request_id,
              related_item_id: item.id,
            },
          });
        }

        // T-3: confirmed → briefing
        if (daysUntil === 3 && item.status === "confirmed") {
          const timeInfo = item.confirmed_time || item.proposed_time || item.preferred_time || "n.t.b.";
          await sendReminderEmail({
            templateId: "partner_briefing_t3",
            recipientEmail: partnerEmail,
            recipientName: partnerName,
            subject: `Briefing: "${item.block_name}" over 3 dagen voor ${customerName}`,
            variables: {
              partner_name: partnerName,
              block_name: item.block_name,
              customer_name: customerName,
              event_date: fmtDateNL(String(dateStr)),
              number_of_people: String(reqRow.number_of_people || "n.t.b."),
              time_info: String(timeInfo),
              portal_url: portalUrl,
            },
            fallbackHtml: `<p>Hoi ${partnerName},</p><p>Een korte heads-up: over 3 dagen (${fmtDateNL(String(dateStr))}) staat "<strong>${item.block_name}</strong>" voor ${customerName} gepland (${reqRow.number_of_people || "?"} pers., tijd: ${timeInfo}).</p>`,
            logExtra: {
              email_type: "partner_briefing_t3",
              related_partner_id: item.provider_id,
              related_request_id: item.request_id,
              related_item_id: item.id,
            },
          });
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
        if (isSnoozed(prog.id)) { totalSkipped++; continue; }
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
    // Anker = laatste klantcontact (offerte verstuurd óf laatste uitgaande mail
    // naar de klant), niet alleen quote_sent_at. Zo komt de taak niet direct
    // terug nadat de admin zojuist een opvolgmail heeft gestuurd.
    // Termijn schaalt mee met hoe ver het event in de toekomst ligt (sales-fase).
    const { data: phaseBPrograms, error: phaseBError } = await supabase
      .from("program_requests")
      .select(`
        id, customer_name, customer_company, customer_email, quote_status, quote_sent_at,
        selected_dates, cancelled_at, completion_status,
        items:program_request_items(id, customer_approved_at, customer_accepted_at)
      `)
      .eq("status", "active")
      .eq("quote_status", "offerte_verstuurd")
      .is("cancelled_at", null)
      .neq("completion_status", "completed")
      .not("quote_sent_at", "is", null);

    if (phaseBError) {
      console.error("Error fetching phase B programs:", phaseBError);
    } else {
      console.log(`Found ${phaseBPrograms?.length || 0} phase-B candidates for status email todos`);

      // Laatste uitgaande mail naar de klant per request (één batch-query).
      const phaseBIds = (phaseBPrograms || []).map((p: any) => p.id);
      const customerEmailByReq = new Map<string, string>(
        (phaseBPrograms || []).map((p: any) => [p.id, (p.customer_email || "").toLowerCase()]),
      );
      const lastCustomerMailByReq = new Map<string, string>();
      if (phaseBIds.length) {
        const { data: custMails } = await supabase
          .from("email_log")
          .select("related_request_id, recipient_email, created_at")
          .in("related_request_id", phaseBIds)
          .order("created_at", { ascending: false })
          .limit(2000);
        for (const m of custMails || []) {
          const reqId = (m as any).related_request_id;
          if (!reqId || lastCustomerMailByReq.has(reqId)) continue;
          const custEmail = customerEmailByReq.get(reqId);
          if (custEmail && ((m as any).recipient_email || "").toLowerCase() === custEmail) {
            lastCustomerMailByReq.set(reqId, (m as any).created_at);
          }
        }
      }

      for (const prog of phaseBPrograms || []) {
        if (isSnoozed(prog.id)) { totalSkipped++; continue; }
        const items = (prog.items as any[]) || [];
        const anyApproved = items.some(
          (i) => i.customer_approved_at || i.customer_accepted_at,
        );
        if (anyApproved) continue;

        // Laatste klantcontact: max(quote_sent_at, laatste mail aan klant)
        const quoteSentTs = new Date(prog.quote_sent_at!).getTime();
        const lastMail = lastCustomerMailByReq.get(prog.id);
        const lastContactTs = Math.max(
          quoteSentTs,
          lastMail ? new Date(lastMail).getTime() : 0,
        );

        // Termijn versoepelen als de startdatum ver in de toekomst ligt:
        // >= 90 dagen vooruit → 3x termijn, >= 30 dagen → 2x, anders standaard.
        const dates = Array.isArray(prog.selected_dates)
          ? (prog.selected_dates as unknown[]).map(String).sort()
          : [];
        const firstDate = dates[0] ? new Date(dates[0]) : null;
        const daysUntilEvent = firstDate
          ? Math.ceil((firstDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        const leadFactor = daysUntilEvent >= 90 ? 3 : daysUntilEvent >= 30 ? 2 : 1;
        const effectivePendingDays = customerStatusEmailPendingDays * leadFactor;

        const daysSinceContact = Math.floor(
          (Date.now() - lastContactTs) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceContact < effectivePendingDays) continue;

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
        const contactLabel = lastMail && new Date(lastMail).getTime() > quoteSentTs
          ? `laatste mail aan klant ${daysSinceContact} dagen geleden`
          : `offerte ${daysSinceContact} dagen geleden verstuurd zonder reactie`;

        const { error: todoError } = await supabase
          .from("admin_todos")
          .insert({
            title: `${customerLabel} heeft nog geen akkoord op offerte`,
            description: `Stand bij aanmaken: ${contactLabel}. Overweeg een status-mail om de klant te herinneren aan akkoord, voorwaarden en facturatiegegevens.${leadFactor > 1 ? ` (Ruimere termijn toegepast: event over ${daysUntilEvent} dagen.)` : ""}`,
            priority: daysSinceContact > effectivePendingDays * 2 ? "high" : "normal",
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
        if (isSnoozed(prog.id)) { totalSkipped++; continue; }
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
        if (isSnoozed(prog.id)) { totalSkipped++; continue; }
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
