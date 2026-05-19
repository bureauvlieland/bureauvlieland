// Deprecated: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  SENDER_EMAIL, 
  SENDER_NAME, 
  buildReplyTo, 
  getRenderedTemplate, 
  TemplateIds,
  sanitizeHtml,
  getEffectiveItemTime,
  renderEffectiveTimeLine,
  getRecipientEmail as sharedGetRecipientEmail,
  getSubjectPrefix as sharedGetSubjectPrefix,
  isTestMode as sharedIsTestMode,
  getPortalBaseUrl,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingChange {
  type: "time_changed" | "day_changed" | "notes_changed" | "removed" | "added" | "people_changed";
  itemId: string;
  itemName: string;
  providerName: string;
  providerEmail?: string;
  oldValue?: string;
  newValue?: string;
  blockId?: string;
  dayIndex?: number;
  preferredTime?: string | null;
  notes?: string;
}

interface ProgramDetailsUpdate {
  selectedDates?: string[];
  numberOfPeople?: number;
  programDescription?: string;
}

interface BillingDetailsUpdate {
  billing_company_name: string;
  billing_kvk_number: string;
  billing_vat_number: string;
  billing_address_street: string;
  billing_address_postal: string;
  billing_address_city: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_reference: string;
}

interface CounterProposal {
  itemId: string;
  counterTime: string;
  counterNote: string;
}

interface ProgramRequestItem {
  id: string;
  request_id: string;
  block_id: string;
  block_name: string;
  block_category: string;
  provider_name: string;
  provider_id: string;
  provider_email: string | null;
  block_type: string;
  price_indication: string | null;
  day_index: number;
  preferred_time: string | null;
  customer_notes: string | null;
  status: string;
  status_note: string | null;
  version: number;
  override_people: number | null;
}

const sendEmailViaMailjet = async (messages: any[]) => {
  const apiKey = Deno.env.get("MAILJET_API_KEY");
  const secretKey = Deno.env.get("MAILJET_SECRET_KEY");

  if (!apiKey || !secretKey) {
    throw new Error("Mailjet credentials not configured");
  }

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
    },
    body: JSON.stringify({ Messages: messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet error:", errorText);
    throw new Error(`Mailjet error: ${response.status}`);
  }

  return response.json();
};

async function enrichProviderEmails(
  supabase: any,
  items: any[]
): Promise<void> {
  const missingEmailIds = [
    ...new Set(
      items
        .filter((i: any) => !i.provider_email && i.provider_id && i.block_type !== "self_arranged")
        .map((i: any) => i.provider_id)
    ),
  ];
  if (missingEmailIds.length === 0) return;

  const { data: partners } = await supabase
    .from("partners")
    .select("id, email, contact_email, name")
    .in("id", missingEmailIds);

  const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));

  for (const item of items) {
    if (!item.provider_email && item.provider_id) {
      const partner = partnerMap.get(item.provider_id);
      if (partner) {
        item.provider_email = partner.contact_email || partner.email;
        if (!item.provider_name) item.provider_name = partner.name;
      }
    }
  }
}

const changeTypeLabels: Record<PendingChange["type"], string> = {
  time_changed: "Tijd gewijzigd",
  day_changed: "Dag gewijzigd",
  notes_changed: "Opmerking aangepast",
  removed: "Geannuleerd",
  added: "Toegevoegd",
  people_changed: "Aantal deelnemers gewijzigd",
};

// Test mode configuration
const TEST_EMAIL = "erwin@bureauvlieland.nl";
const PRODUCTION_DOMAINS = ["bureauvlieland.nl", "bureauvlieland.lovable.app"];

const isTestMode = (origin: string | undefined): boolean => {
  if (!origin) return true;
  return !PRODUCTION_DOMAINS.some(domain => origin.includes(domain));
};

const getRecipientEmail = (originalEmail: string, origin: string | undefined): string => {
  return isTestMode(origin) ? TEST_EMAIL : originalEmail;
};

const getSubjectPrefix = (origin: string | undefined): string => {
  return isTestMode(origin) ? "[TEST] " : "";
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, changes, items, programDetails, billingDetails, guestDetails, acceptTerms, signatureName, acceptItemId, cancelItemId, counterProposal, origin } = await req.json() as {
      token: string;
      changes?: PendingChange[];
      items?: ProgramRequestItem[];
      programDetails?: ProgramDetailsUpdate;
      billingDetails?: BillingDetailsUpdate;
      guestDetails?: { guest_names?: string | null; dietary_notes?: string | null; room_assignment?: string | null };
      acceptTerms?: boolean;
      signatureName?: string;
      acceptItemId?: string;
      cancelItemId?: string;
      counterProposal?: CounterProposal;
      origin?: string;
    };
    
    // Get client IP and user agent for signature audit
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    
    if (testMode) {
      console.log(`[TEST MODE] All partner emails will be redirected to ${TEST_EMAIL}`);
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Must have at least one type of update
    if ((!changes || !items) && !programDetails && !billingDetails && !guestDetails && !acceptTerms && !acceptItemId && !cancelItemId && !counterProposal) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify program exists and get details.
    // Guest details (gastenlijst, dieetwensen, kamerindeling) blijven bewerkbaar
    // tot/na aankomst — voor die branch laten we verlopen tokens toe.
    const isGuestDetailsOnly =
      !!guestDetails && !changes && !items && !programDetails && !billingDetails &&
      !acceptTerms && !acceptItemId && !cancelItemId && !counterProposal;

    let programQuery = supabase
      .from("program_requests")
      .select("*")
      .eq("customer_token", token);
    if (!isGuestDetailsOnly) {
      programQuery = programQuery.gt("expires_at", new Date().toISOString());
    }
    const { data: program, error: programError } = await programQuery.single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Program not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailMessages: any[] = [];
    // Pending log entries — ingevuld met definitieve status + mailjet_message_id ná de batch-send.
    const pendingEmailLogs: Array<{ logPayload: any; messageIdx: number }> = [];

    // Handle program details updates (dates/people/description changes)
    if (programDetails) {
      const updateData: any = { updated_at: new Date().toISOString() };
      const historyNotes: string[] = [];
      
      if (programDetails.selectedDates) {
        updateData.selected_dates = programDetails.selectedDates;
        historyNotes.push(`Datums gewijzigd`);
      }
      
      if (programDetails.numberOfPeople) {
        updateData.number_of_people = programDetails.numberOfPeople;
        historyNotes.push(`Aantal personen: ${program.number_of_people} → ${programDetails.numberOfPeople}`);

        // Sync number_of_guests to linked accommodation request
        if (program.linked_accommodation_id) {
          await supabase
            .from("accommodation_requests")
            .update({
              number_of_guests: programDetails.numberOfPeople,
              status: "processing",
              updated_at: new Date().toISOString(),
            })
            .eq("id", program.linked_accommodation_id);

          // Reset ALL accommodation quotes (including selected) back to pending
          const { data: resetQuotes } = await supabase
            .from("accommodation_quotes")
            .select("id, partner_id, accommodation_name, status, partner:partners(id, name, email, contact_email)")
            .eq("request_id", program.linked_accommodation_id)
            .in("status", ["pending", "submitted", "selected"]);

          if (resetQuotes && resetQuotes.length > 0) {
            const quoteIds = resetQuotes.map(q => q.id);
            await supabase
              .from("accommodation_quotes")
              .update({
                status: "pending",
                submitted_at: null,
                selected_at: null,
                updated_at: new Date().toISOString(),
              })
              .in("id", quoteIds);

            console.log(`Reset ${quoteIds.length} accommodation quotes to pending due to people change`);

            // Notify each accommodation partner about the change
            for (const quote of resetQuotes) {
              const partnerData = quote.partner as unknown;
              const partner = (Array.isArray(partnerData) ? partnerData[0] : partnerData) as { id: string; name: string; email: string; contact_email: string | null } | null;
              if (partner?.email) {
                const notifyEmail = partner.contact_email || partner.email;
                const customerLabel = sanitizeHtml(program.customer_company || program.customer_name);

                // Try template
                const template = await getRenderedTemplate(TemplateIds.PEOPLE_CHANGE_ACCOMMODATION, {
                  partner_name: sanitizeHtml(partner.name),
                  customer_name: customerLabel,
                  old_people: String(program.number_of_people),
                  new_people: String(programDetails.numberOfPeople),
                  accommodation_name: sanitizeHtml(quote.accommodation_name),
                  partner_portal_url: `${getPortalBaseUrl(origin)}/partner/login`,
                });

                const emailSubject = template?.subject || `Gewijzigd aantal gasten - ${customerLabel}`;
                const emailBody = template?.body || `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background: #0d9488; padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Bureau Vlieland</h1>
                      </div>
                      <div style="padding: 32px;">
                        <h2 style="color: #0d9488; margin-bottom: 16px;">Gewijzigd aantal gasten</h2>
                        <p>Beste ${sanitizeHtml(partner.name)},</p>
                        <p>Het aantal gasten voor de aanvraag van <strong>${customerLabel}</strong> is gewijzigd.</p>
                        <div style="background: #f0fdfa; border: 1px solid #99f6e4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                          <p style="margin: 0 0 8px;"><strong>Wijziging:</strong></p>
                          <p style="margin: 0; font-size: 18px; color: #0d9488;">
                            ${program.number_of_people} → ${programDetails.numberOfPeople} gasten
                          </p>
                          <p style="margin: 8px 0 0;"><strong>Accommodatie:</strong> ${sanitizeHtml(quote.accommodation_name)}</p>
                        </div>
                        <p>Graag uw offerte herzien of opnieuw indienen via het Partner Portal:</p>
                        <p style="text-align: center; margin: 24px 0;">
                          <a href="https://bureauvlieland.nl/partner/login" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Open Partner Portal
                          </a>
                        </p>
                        <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
                      </div>
                    </div>
                `;

                emailMessages.push({
                  From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
                  To: [{ Email: getRecipientEmail(notifyEmail, origin), Name: partner.name }],
                  Subject: `${subjectPrefix}${emailSubject}`,
                  HTMLPart: emailBody,
                });

                pendingEmailLogs.push({
                  messageIdx: emailMessages.length - 1,
                  logPayload: {
                    email_type: "accommodation_people_change",
                    subject: `${subjectPrefix}${emailSubject}`,
                    recipient_email: getRecipientEmail(partner.email, origin),
                    recipient_name: partner.name,
                    related_request_id: program.id,
                    related_accommodation_id: program.linked_accommodation_id,
                    related_partner_id: partner.id,
                    sent_by: "update-customer-program",
                    metadata: {
                      template_name: "accommodation_people_change",
                      actor: "klant → logiespartner (gastenwijziging)",
                      old_people: program.number_of_people,
                      new_people: programDetails.numberOfPeople,
                      accommodation_name: quote.accommodation_name,
                    },
                  },
                });
              }
            }
          }
        }
      }

      if (programDetails.programDescription !== undefined) {
        updateData.program_description = programDetails.programDescription || null;
        historyNotes.push(`Omschrijving ${programDetails.programDescription ? 'bijgewerkt' : 'verwijderd'}`);
      }
      
      // Update program
      await supabase
        .from("program_requests")
        .update(updateData)
        .eq("id", program.id);
      
      // Log to history
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        action: programDetails.selectedDates ? "dates_changed" : "people_changed",
        actor: "customer",
        actor_name: program.customer_name,
        old_value: programDetails.selectedDates 
          ? { dates: program.selected_dates }
          : { people: program.number_of_people },
        new_value: programDetails.selectedDates 
          ? { dates: programDetails.selectedDates }
          : { people: programDetails.numberOfPeople },
        notes: historyNotes.join("; "),
      });
      
      // If dates changed, reset all items to pending and email all providers
      if (programDetails.selectedDates) {
        await supabase
          .from("program_request_items")
          .update({ status: "pending", status_note: null })
          .eq("request_id", program.id)
          .neq("status", "cancelled");
        
        // Get all active items with provider emails
        const { data: activeItems } = await supabase
          .from("program_request_items")
          .select("*")
          .eq("request_id", program.id)
          .neq("status", "cancelled");
        
        // Group by provider
        await enrichProviderEmails(supabase, activeItems || []);
        const providerItems = new Map<string, { name: string; email: string; items: string[] }>();
        (activeItems || []).forEach((item) => {
          if (item.provider_email && item.block_type !== "self_arranged") {
            if (!providerItems.has(item.provider_id)) {
              providerItems.set(item.provider_id, { name: item.provider_name, email: item.provider_email, items: [] });
            }
            providerItems.get(item.provider_id)!.items.push(item.block_name);
          }
        });
        
        const newDates = programDetails.selectedDates
          .map((d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }))
          .join(", ");
        
        const customerLabel = sanitizeHtml(program.customer_company || program.customer_name);

        // Email providers about date change
        for (const [providerId, provider] of providerItems) {
          const itemsListHtml = provider.items.map(i => `<li>${sanitizeHtml(i)}</li>`).join("");
          
          const template = await getRenderedTemplate(TemplateIds.DATE_CHANGE_PARTNER, {
            partner_name: sanitizeHtml(provider.name),
            customer_name: customerLabel,
            new_dates: newDates,
            items_list: itemsListHtml,
          });

          const emailSubject = template?.subject || `Datumwijziging aanvraag - ${customerLabel}`;
          const emailBody = template?.body || `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Datumwijziging</h2>
                <p>Beste ${sanitizeHtml(provider.name)},</p>
                <p>De klant heeft de datum(s) gewijzigd naar: <strong>${newDates}</strong></p>
                <p>Graag uw beschikbaarheid opnieuw bevestigen.</p>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p><strong>Activiteit(en):</strong></p>
                  <ul>${itemsListHtml}</ul>
                </div>
                <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
              </div>
          `;

          emailMessages.push({
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.name }],
            Subject: `${subjectPrefix}${emailSubject}`,
            HTMLPart: emailBody,
          });
          pendingEmailLogs.push({
            messageIdx: emailMessages.length - 1,
            logPayload: {
              email_type: "date_change_partner",
              subject: `${subjectPrefix}${emailSubject}`,
              recipient_email: getRecipientEmail(provider.email, origin),
              recipient_name: provider.name,
              related_request_id: program.id,
              related_partner_id: providerId,
              sent_by: "update-customer-program",
              metadata: {
                template_name: TemplateIds.DATE_CHANGE_PARTNER,
                actor: "klant → partner (datumwijziging)",
                new_dates: newDates,
                items: provider.items,
              },
            },
          });
        }

        // === SYNC ACCOMMODATION DATES AND NOTIFY LODGING PARTNERS ===
        if (program.linked_accommodation_id) {
          const sortedDates = [...programDetails.selectedDates].sort();
          const newArrivalDate = sortedDates[0];
          const newDepartureDate = sortedDates[sortedDates.length - 1];

          // Update accommodation request dates
          await supabase
            .from("accommodation_requests")
            .update({
              arrival_date: newArrivalDate,
              departure_date: newDepartureDate,
              updated_at: new Date().toISOString(),
            })
            .eq("id", program.linked_accommodation_id);

          console.log(`Updated accommodation dates: ${newArrivalDate} - ${newDepartureDate}`);

          // Get all active quotes (pending or submitted) for this accommodation
          const { data: activeQuotes } = await supabase
            .from("accommodation_quotes")
            .select(`
              id,
              partner_id,
              accommodation_name,
              status,
              partner:partners(id, name, email, contact_email)
            `)
            .eq("request_id", program.linked_accommodation_id)
            .in("status", ["pending", "submitted"]);

          if (activeQuotes && activeQuotes.length > 0) {
            // Reset quotes to pending so partners can re-submit
            const quoteIds = activeQuotes.map(q => q.id);
            await supabase
              .from("accommodation_quotes")
              .update({ 
                status: "pending",
                submitted_at: null,
                updated_at: new Date().toISOString(),
              })
              .in("id", quoteIds);

            // Notify each accommodation partner
            for (const quote of activeQuotes) {
              const partnerData = quote.partner as unknown;
              const partner = (Array.isArray(partnerData) ? partnerData[0] : partnerData) as { id: string; name: string; email: string; contact_email: string | null } | null;
              if (partner?.email) {
                const notifyEmail = partner.contact_email || partner.email;
                const formattedArrival = new Date(newArrivalDate).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
                const formattedDeparture = new Date(newDepartureDate).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

                const template = await getRenderedTemplate(TemplateIds.DATE_CHANGE_ACCOMMODATION, {
                  partner_name: sanitizeHtml(partner.name),
                  customer_name: customerLabel,
                  arrival_date: formattedArrival,
                  departure_date: formattedDeparture,
                  accommodation_name: sanitizeHtml(quote.accommodation_name),
                  number_of_people: String(program.number_of_people),
                  partner_portal_url: `${getPortalBaseUrl(origin)}/partner/login`,
                });

                const emailSubject = template?.subject || `Datumwijziging logiesaanvraag - ${customerLabel}`;
                const emailBody = template?.body || `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background: #0d9488; padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Bureau Vlieland</h1>
                      </div>
                      <div style="padding: 32px;">
                        <h2 style="color: #0d9488; margin-bottom: 16px;">Datumwijziging logiesaanvraag</h2>
                        <p>Beste ${sanitizeHtml(partner.name)},</p>
                        <p>De klant <strong>${customerLabel}</strong> heeft de datums van hun verblijf gewijzigd.</p>
                        <div style="background: #f0fdfa; border: 1px solid #99f6e4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                          <p style="margin: 0 0 8px;"><strong>Nieuwe periode:</strong></p>
                          <p style="margin: 0; font-size: 18px; color: #0d9488;">
                            ${formattedArrival} — ${formattedDeparture}
                          </p>
                          <p style="margin: 8px 0 0;"><strong>Accommodatie:</strong> ${sanitizeHtml(quote.accommodation_name)}</p>
                          <p style="margin: 4px 0 0;"><strong>Aantal gasten:</strong> ${program.number_of_people}</p>
                        </div>
                        <p>Graag uw offerte herzien of opnieuw indienen via het Partner Portal:</p>
                        <p style="text-align: center; margin: 24px 0;">
                          <a href="https://bureauvlieland.nl/partner/login" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Open Partner Portal
                          </a>
                        </p>
                        <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
                      </div>
                    </div>
                `;

                emailMessages.push({
                  From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
                  To: [{ Email: getRecipientEmail(notifyEmail, origin), Name: partner.name }],
                  Subject: `${subjectPrefix}${emailSubject}`,
                  HTMLPart: emailBody,
                });

                // Log the accommodation date change email (deferred)
                pendingEmailLogs.push({
                  messageIdx: emailMessages.length - 1,
                  logPayload: {
                    email_type: "accommodation_date_change",
                    subject: `${subjectPrefix}${emailSubject}`,
                    recipient_email: getRecipientEmail(notifyEmail, origin),
                    recipient_name: partner.name,
                    related_request_id: program.id,
                    related_accommodation_id: program.linked_accommodation_id,
                    related_partner_id: partner.id,
                    sent_by: "update-customer-program",
                    metadata: {
                      template_name: TemplateIds.DATE_CHANGE_ACCOMMODATION,
                      actor: "klant → logiespartner (datumwijziging)",
                      new_arrival_date: newArrivalDate,
                      new_departure_date: newDepartureDate,
                      accommodation_name: quote.accommodation_name,
                      customer_name: program.customer_company || program.customer_name,
                    },
                  },
                });
              }
            }
            console.log(`Notified ${activeQuotes.length} accommodation partner(s) about date change`);
          }
        }
        
        // Customer confirmation for date change
        let totalNotifiedProviders = providerItems.size;
        
        const providersNote = totalNotifiedProviders > 0 ? `${totalNotifiedProviders} ` : "";
        const accommodationNote = program.linked_accommodation_id ? " en logiespartner(s)" : "";
        
        const dateChangeCustomerTemplate = await getRenderedTemplate(TemplateIds.DATE_CHANGE_CUSTOMER, {
          customer_name: sanitizeHtml(program.customer_name),
          new_dates: newDates,
          providers_note: `${providersNote}betrokken aanbieder(s)${accommodationNote}`,
          portal_url: `https://bureauvlieland.nl/mijn-programma/${token}`,
        });

        const dateChangeCustomerSubject = dateChangeCustomerTemplate?.subject || "Datumwijziging bevestigd";
        const dateChangeCustomerBody = dateChangeCustomerTemplate?.body || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Datumwijziging bevestigd</h2>
              <p>Beste ${sanitizeHtml(program.customer_name)},</p>
              <p>U heeft de datum(s) gewijzigd naar: <strong>${newDates}</strong></p>
              <p>Alle ${providersNote}betrokken aanbieder(s)${accommodationNote} zijn op de hoogte gesteld en wij wachten op hun bevestiging.</p>
              <p>
                <a href="https://bureauvlieland.nl/mijn-programma/${token}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Bekijk uw programma
                </a>
              </p>
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            </div>
        `;

        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: program.customer_email, Name: program.customer_name }],
          Subject: `${subjectPrefix}${dateChangeCustomerSubject}`,
          HTMLPart: dateChangeCustomerBody,
        });
        pendingEmailLogs.push({
          messageIdx: emailMessages.length - 1,
          logPayload: {
            email_type: "date_change_customer",
            subject: `${subjectPrefix}${dateChangeCustomerSubject}`,
            recipient_email: program.customer_email,
            recipient_name: program.customer_name,
            related_request_id: program.id,
            sent_by: "update-customer-program",
            metadata: {
              template_name: "date_change_customer",
              actor: "system → klant (datumwijziging bevestigd)",
              new_dates: newDates,
            },
          },
        });
      }
    }

    // Handle billing details update
    if (billingDetails) {
      await supabase
        .from("program_requests")
        .update({
          billing_company_name: billingDetails.billing_company_name,
          billing_kvk_number: billingDetails.billing_kvk_number,
          billing_vat_number: billingDetails.billing_vat_number,
          billing_address_street: billingDetails.billing_address_street,
          billing_address_postal: billingDetails.billing_address_postal,
          billing_address_city: billingDetails.billing_address_city,
          billing_contact_name: billingDetails.billing_contact_name,
          billing_contact_email: billingDetails.billing_contact_email,
          billing_reference: billingDetails.billing_reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", program.id);

      // Log to history
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        action: "billing_updated",
        actor: "customer",
        actor_name: program.customer_name,
        notes: "Facturatiegegevens bijgewerkt",
      });
    }

    // Handle guest details update (gastenlijst, dieetwensen, kamerindeling)
    if (guestDetails) {
      const now = new Date().toISOString();
      const programUpdate: any = { updated_at: now, guest_details_updated_at: now };
      const changedFields: string[] = [];

      if (guestDetails.guest_names !== undefined) {
        const v = (guestDetails.guest_names || "").slice(0, 5000) || null;
        programUpdate.guest_names = v;
        if ((program.guest_names || null) !== v) changedFields.push("gastenlijst");
      }
      if (guestDetails.dietary_notes !== undefined) {
        const v = (guestDetails.dietary_notes || "").slice(0, 5000) || null;
        programUpdate.dietary_notes = v;
        if ((program.dietary_notes || null) !== v) changedFields.push("dieetwensen");
      }

      await supabase.from("program_requests").update(programUpdate).eq("id", program.id);

      if (guestDetails.room_assignment !== undefined && program.linked_accommodation_id) {
        const v = (guestDetails.room_assignment || "").slice(0, 5000) || null;
        await supabase
          .from("accommodation_requests")
          .update({ room_assignment: v, guest_details_updated_at: now, updated_at: now })
          .eq("id", program.linked_accommodation_id);
        changedFields.push("kamerindeling");
      }

      if (changedFields.length > 0) {
        await supabase.from("program_request_history").insert({
          request_id: program.id,
          action: "guest_details_updated",
          actor: "customer",
          actor_name: program.customer_name,
          notes: `Bijgewerkt: ${changedFields.join(", ")}`,
        });
      }
    }

    // Handle individual item acceptance (klant akkoord op partner voorstel)
    if (acceptItemId) {
      const { data: item, error: itemError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("id", acceptItemId)
        .eq("request_id", program.id)
        .single();

      if (itemError || !item) {
        return new Response(
          JSON.stringify({ error: "Item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only allow accepting confirmed or alternative items
      if (!["confirmed", "alternative"].includes(item.status)) {
        return new Response(
          JSON.stringify({ error: "Item cannot be accepted in current status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update item with customer_accepted_at — én sync quoted_price wanneer er
      // een openstaande admin-prijswijziging ligt op het moment van akkoord.
      const acceptedAt = new Date().toISOString();
      const programPeople = Number(program.number_of_people || 0);
      const numberOfDays = Array.isArray(program.selected_dates) ? program.selected_dates.length : 1;
      const effectivePeople = item.override_people ?? programPeople;
      const priceType = item.price_type || "per_person";
      const isPerPerson = !priceType || priceType === "per_person" || priceType === "per_person_per_day";
      const isPerDay = priceType === "per_person_per_day";
      let acceptedPriceTotal: number | null = null;
      if (item.admin_price_override != null && item.admin_price_override_updated_at) {
        const ack = item.partner_price_change_acknowledged_at ?? item.quoted_at;
        const overrideIsNewer = !ack
          || new Date(item.admin_price_override_updated_at).getTime() > new Date(ack).getTime();
        if (overrideIsNewer) {
          const personMultiplier = isPerPerson ? effectivePeople : 1;
          const dayMultiplier = isPerDay ? numberOfDays : 1;
          acceptedPriceTotal = Number(item.admin_price_override) * personMultiplier * dayMultiplier;
        }
      }
      await supabase
        .from("program_request_items")
        .update({
          status: "accepted",
          customer_accepted_at: acceptedAt,
          updated_at: acceptedAt,
          ...(acceptedPriceTotal != null
            ? {
                quoted_price: acceptedPriceTotal,
                partner_price_change_acknowledged_at: acceptedAt,
              }
            : {}),
        })
        .eq("id", acceptItemId);

      // Log to history
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        item_id: acceptItemId,
        action: "customer_accepted",
        actor: "customer",
        actor_name: program.customer_name,
        notes: `Klant akkoord op ${item.block_name}`,
        new_value: { status: "accepted", quoted_price: item.quoted_price },
      });

      // Create admin_todo for bureau notification
      await supabase.from("admin_todos").insert({
        title: `Klant ${program.customer_name} akkoord op "${item.block_name}"`,
        description: `De klant heeft het onderdeel "${item.block_name}" geaccepteerd${item.quoted_price ? ` (€${Number(item.quoted_price).toFixed(2)})` : ""}.`,
        priority: "normal",
        auto_type: "partner_status_update",
        auto_entity_id: acceptItemId,
        related_request_id: program.id,
        related_partner_id: item.provider_id !== "bureau" ? item.provider_id : null,
      });

      // Check if ALL non-cancelled items are now accepted
      const { data: allItems } = await supabase
        .from("program_request_items")
        .select("id, status")
        .eq("request_id", program.id)
        .neq("status", "cancelled");

      const allAccepted = allItems && allItems.length > 0 && allItems.every((i: any) => i.status === "accepted");
      if (allAccepted) {
        console.log(`All items accepted for program ${program.id}`);
        
        // Create admin_todo
        await supabase.from("admin_todos").insert({
          title: `Alle onderdelen akkoord: ${program.customer_name}`,
          description: `Alle ${allItems.length} onderdelen zijn geaccepteerd door de klant. Programma kan definitief worden afgerond.`,
          priority: "high",
          auto_type: "quote_ready_to_send",
          auto_entity_id: program.id,
          related_request_id: program.id,
        });

        // Send notification email to bureau
        const bureauEmail = "erwin@bureauvlieland.nl";
        const allAcceptedSubject = `${subjectPrefix}Alle onderdelen akkoord: ${program.customer_name}`;
        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: bureauEmail, Name: "Bureau Vlieland" }],
          Subject: allAcceptedSubject,
          HTMLPart: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #16a34a; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">✅ Alle onderdelen akkoord</h1>
              </div>
              <div style="padding: 32px;">
                <p>Klant <strong>${sanitizeHtml(program.customer_name)}</strong> heeft alle ${allItems.length} onderdelen geaccepteerd.</p>
                <p>Het programma kan nu definitief worden afgerond.</p>
                <p style="text-align: center; margin: 24px 0;">
                  <a href="https://bureauvlieland.nl/admin/aanvragen/${program.id}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Bekijk project →</a>
                </p>
                <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
              </div>
            </div>
          `,
        });
        pendingEmailLogs.push({
          messageIdx: emailMessages.length - 1,
          logPayload: {
            email_type: "all_items_accepted_bureau",
            subject: allAcceptedSubject,
            recipient_email: bureauEmail,
            recipient_name: "Bureau Vlieland",
            related_request_id: program.id,
            sent_by: "update-customer-program",
            metadata: {
              template_name: "all_items_accepted_bureau",
              actor: "system → bureau (alle items akkoord)",
              item_count: allItems.length,
            },
          },
        });
      }

      console.log(`Customer accepted item ${acceptItemId}`);
    }

    // Handle individual item cancellation
    if (cancelItemId) {
      const { data: item, error: itemError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("id", cancelItemId)
        .eq("request_id", program.id)
        .single();

      if (itemError || !item) {
        return new Response(
          JSON.stringify({ error: "Item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update item status to cancelled
      await supabase
        .from("program_request_items")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", cancelItemId);

      // Log to history
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        item_id: cancelItemId,
        action: "customer_cancelled",
        actor: "customer",
        actor_name: program.customer_name,
        notes: `Klant heeft ${item.block_name} geannuleerd`,
      });

      // Notify partner if they have an email
      await enrichProviderEmails(supabase, [item]);
      if (item.provider_email && item.block_type !== "self_arranged") {
        const customerLabel = sanitizeHtml(program.customer_company || program.customer_name);

        const template = await getRenderedTemplate(TemplateIds.ITEM_CANCELLED_PARTNER, {
          partner_name: sanitizeHtml(item.provider_name),
          customer_name: customerLabel,
          block_name: sanitizeHtml(item.block_name),
        });

        const emailSubject = template?.subject || `Annulering - ${customerLabel}`;
        const emailBody = template?.body || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Activiteit geannuleerd</h2>
              <p>Beste ${sanitizeHtml(item.provider_name)},</p>
              <p>De klant heeft de volgende activiteit geannuleerd:</p>
              <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>${sanitizeHtml(item.block_name)}</strong></p>
                <p>Klant: ${customerLabel}</p>
              </div>
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            </div>
        `;

        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: getRecipientEmail(item.provider_email, origin), Name: item.provider_name }],
          Subject: `${subjectPrefix}${emailSubject}`,
          HTMLPart: emailBody,
        });
        pendingEmailLogs.push({
          messageIdx: emailMessages.length - 1,
          logPayload: {
            email_type: "item_cancelled_partner",
            subject: `${subjectPrefix}${emailSubject}`,
            recipient_email: getRecipientEmail(item.provider_email, origin),
            recipient_name: item.provider_name,
            related_request_id: program.id,
            related_item_id: cancelItemId,
            related_partner_id: item.provider_id,
            sent_by: "update-customer-program",
            metadata: {
              template_name: TemplateIds.ITEM_CANCELLED_PARTNER,
              actor: "klant → partner (item geannuleerd)",
              block_name: item.block_name,
            },
          },
        });
      }

      // Create admin_todo for bureau notification
      await supabase.from("admin_todos").insert({
        title: `Klant ${program.customer_name} annuleert "${item.block_name}"`,
        description: `De klant heeft het onderdeel "${item.block_name}" geannuleerd. Controleer of dit gevolgen heeft voor het programma.`,
        priority: "high",
        auto_type: "partner_status_update",
        auto_entity_id: cancelItemId,
        related_request_id: program.id,
        related_partner_id: item.provider_id !== "bureau" ? item.provider_id : null,
      });

      console.log(`Customer cancelled item ${cancelItemId}`);
    }

    // Handle counter proposal from customer
    if (counterProposal) {
      const { itemId, counterTime, counterNote } = counterProposal;
      
      const { data: item, error: itemError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("id", itemId)
        .eq("request_id", program.id)
        .single();

      if (itemError || !item) {
        return new Response(
          JSON.stringify({ error: "Item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update item with counter proposal
      await supabase
        .from("program_request_items")
        .update({
          status: "counter_proposed",
          customer_counter_time: counterTime,
          customer_counter_note: counterNote || null,
          customer_counter_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      // Log to history
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        item_id: itemId,
        action: "counter_proposed",
        actor: "customer",
        actor_name: program.customer_name,
        notes: `Klant stelt andere tijd voor: ${counterTime}${counterNote ? ` - "${counterNote}"` : ""}`,
        old_value: { proposed_time: item.proposed_time },
        new_value: { customer_counter_time: counterTime, customer_counter_note: counterNote },
      });

      // Email partner about counter proposal using template
      await enrichProviderEmails(supabase, [item]);
      if (item.provider_email && item.block_type !== "self_arranged") {
        const counterProposalRecipient = getRecipientEmail(item.provider_email, origin);
        
        const originalTime = item.proposed_time || item.confirmed_time || "niet opgegeven";
        const counterNoteSection = counterNote 
          ? `<p style="margin: 8px 0 0; font-style: italic;">"${sanitizeHtml(counterNote)}"</p>` 
          : "";
        const priceSection = item.quoted_price 
          ? `<p style="margin: 8px 0 0;">Huidige prijs: €${Number(item.quoted_price).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>` 
          : "";
        const partnerPortalLink = "https://bureauvlieland.nl/partner/login";

        // Fetch email template
        const template = await getRenderedTemplate(TemplateIds.COUNTER_PROPOSAL_PARTNER, {
          provider_name: sanitizeHtml(item.provider_name),
          customer_name: sanitizeHtml(program.customer_company || program.customer_name),
          block_name: sanitizeHtml(item.block_name),
          original_time: originalTime,
          counter_time: counterTime,
          counter_note_section: counterNoteSection,
          price_section: priceSection,
          partner_portal_link: partnerPortalLink,
        });

        const emailSubject = template?.subject || `Tegenvoorstel van klant - ${item.block_name}`;
        const emailBody = template?.body || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a365d; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Bureau Vlieland</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #1a365d; margin-bottom: 16px;">Tegenvoorstel van klant</h2>
                <p>Beste ${sanitizeHtml(item.provider_name)},</p>
                <p>De klant <strong>${sanitizeHtml(program.customer_company || program.customer_name)}</strong> heeft een tegenvoorstel gedaan voor:</p>
                <div style="background: #f3e8ff; border: 1px solid #c4b5fd; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 0 0 8px; font-weight: bold;">${sanitizeHtml(item.block_name)}</p>
                  <p style="margin: 0 0 8px;">Uw voorstel: <strong>${originalTime}</strong></p>
                  <p style="margin: 0; color: #7c3aed; font-weight: bold;">Klant wil liever: ${counterTime}</p>
                  ${counterNoteSection}
                  ${priceSection}
                </div>
                <p>Graag uw reactie via het Partner Portal:</p>
                <p style="text-align: center; margin: 24px 0;">
                  <a href="${partnerPortalLink}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Partner Portal</a>
                </p>
                <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
              </div>
            </div>
        `;
        
        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: counterProposalRecipient, Name: item.provider_name }],
          Subject: `${subjectPrefix}${emailSubject}`,
          HTMLPart: emailBody,
        });

        // Log email for counter proposal (deferred)
        pendingEmailLogs.push({
          messageIdx: emailMessages.length - 1,
          logPayload: {
            email_type: "counter_proposal_partner",
            subject: `${subjectPrefix}${emailSubject}`,
            recipient_email: counterProposalRecipient,
            recipient_name: item.provider_name,
            related_request_id: program.id,
            related_item_id: itemId,
            related_partner_id: item.provider_id,
            sent_by: "update-customer-program",
            metadata: {
              template_name: "counter_proposal_partner",
              actor: "klant → partner (tegenvoorstel tijd)",
              counter_time: counterTime,
              counter_note: counterNote,
              block_name: item.block_name,
              customer_name: program.customer_company || program.customer_name,
            },
          },
        });
      }

      // Bureau notification: klant heeft een tegen-tijd voorgesteld.
      // Geen aparte template — korte interne mail naar het bureau-adres met deeplink.
      try {
        const bureauUrl = `https://bureauvlieland.nl/admin/aanvragen/${program.id}`;
        const customerLabel = sanitizeHtml(program.customer_company || program.customer_name);
        const refLabel = program.reference_number ? ` (${sanitizeHtml(program.reference_number)})` : "";
        const bureauHtml = `
          <p>Hoi team,</p>
          <p>De klant <strong>${customerLabel}</strong>${refLabel} heeft een ander tijdstip voorgesteld voor:</p>
          <div style="background:#faf5ff;border:1px solid #d6bcfa;border-radius:8px;padding:14px;margin:14px 0;">
            <p style="margin:0;"><strong>${sanitizeHtml(item.block_name)}</strong> &mdash; partner: ${sanitizeHtml(item.provider_name)}</p>
            <p style="margin:6px 0 0;">Oorspronkelijk: ${sanitizeHtml(item.proposed_time || item.confirmed_time || item.preferred_time || "—")}</p>
            <p style="margin:6px 0 0;color:#7c3aed;font-weight:600;">Klant wil liever: ${sanitizeHtml(counterTime)}</p>
            ${counterNote ? `<p style="margin:6px 0 0;font-style:italic;">"${sanitizeHtml(counterNote)}"</p>` : ""}
          </div>
          <p><a href="${bureauUrl}" style="background:#1a365d;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open werkbank</a></p>
        `;
        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: getRecipientEmail("hallo@bureauvlieland.nl", origin), Name: "Bureau Vlieland" }],
          Subject: `${subjectPrefix}Klant stelt andere tijd voor — ${item.block_name}`,
          HTMLPart: bureauHtml,
        });
        pendingEmailLogs.push({
          messageIdx: emailMessages.length - 1,
          logPayload: {
            email_type: "customer_counter_proposal_bureau",
            subject: `${subjectPrefix}Klant stelt andere tijd voor — ${item.block_name}`,
            recipient_email: "hallo@bureauvlieland.nl",
            recipient_name: "Bureau Vlieland",
            related_request_id: program.id,
            related_item_id: itemId,
            related_partner_id: item.provider_id,
            sent_by: "update-customer-program",
            metadata: {
              template_name: "customer_counter_proposal_bureau",
              actor: "klant → bureau (interne notificatie)",
              counter_time: counterTime,
              counter_note: counterNote,
            },
          },
        });
        // Admin todo
        const { data: existingCounterTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "customer_counter_proposal")
          .eq("auto_entity_id", itemId)
          .neq("status", "done")
          .maybeSingle();
        if (!existingCounterTodo) {
          await supabase.from("admin_todos").insert({
            title: `Klant ${program.customer_name} stelt andere tijd voor "${item.block_name}"`,
            description: `Klant wil liever ${counterTime} i.p.v. ${item.proposed_time || item.confirmed_time || "het voorgestelde tijdstip"}${counterNote ? ` — "${counterNote}"` : ""}.`,
            priority: "normal",
            status: "todo",
            related_request_id: program.id,
            related_partner_id: item.provider_id !== "bureau" ? item.provider_id : null,
            auto_type: "customer_counter_proposal",
            auto_entity_id: itemId,
          });
        }
      } catch (err) {
        console.error("Failed to send bureau counter-proposal notification:", err);
      }

      console.log(`Customer submitted counter proposal for item ${itemId}: ${counterTime}`);
    }

    if (acceptTerms) {
      const signatureId = crypto.randomUUID();
      const acceptedAt = new Date().toISOString();
      const termsVersion = "2024-v1";
      
      // Update program with signature info
      await supabase
        .from("program_requests")
        .update({
          terms_accepted_at: acceptedAt,
          terms_version: termsVersion,
          signature_name: signatureName || program.customer_name,
          signature_ip: clientIp,
          signature_user_agent: userAgent,
          signature_id: signatureId,
          updated_at: acceptedAt,
        })
        .eq("id", program.id);

      // Log to history
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        action: "terms_accepted",
        actor: "customer",
        actor_name: signatureName || program.customer_name,
        notes: `Voorwaarden geaccepteerd (versie ${termsVersion}). Handtekening-ID: ${signatureId}`,
        new_value: { 
          terms_version: termsVersion, 
          signature_id: signatureId,
          signature_name: signatureName || program.customer_name,
          client_ip: clientIp,
        },
      });

      // --- Accepted terms log ---
      const { data: programItems } = await supabase
        .from("program_request_items")
        .select("provider_id, provider_name, block_type, block_category")
        .eq("request_id", program.id)
        .neq("status", "cancelled");

      const uniquePartnerIds = [...new Set(
        (programItems || [])
          .filter(i => i.block_type !== "self_arranged" && i.provider_id !== "bureau")
          .map(i => i.provider_id)
      )];

      const termsLogEntries: any[] = [];
      
      // Bureau Vlieland terms
      termsLogEntries.push({
        request_id: program.id,
        partner_id: "bureau",
        partner_name: "Bureau Vlieland",
        terms_type: "bureau_vlieland",
        terms_version: termsVersion,
        terms_pdf_path: null,
        accepted_at: acceptedAt,
      });

      // Partner terms
      if (uniquePartnerIds.length > 0) {
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name, terms_pdf_path, uses_default_terms")
          .in("id", uniquePartnerIds);

        for (const partner of (partners || [])) {
          const hasCustomTerms = partner.terms_pdf_path && !partner.uses_default_terms;
          const termsType = hasCustomTerms ? "partner_custom" : "partner_default";

          termsLogEntries.push({
            request_id: program.id,
            partner_id: partner.id,
            partner_name: partner.name,
            terms_type: termsType,
            terms_version: termsVersion,
            terms_pdf_path: termsType === "partner_custom" ? partner.terms_pdf_path : "default/standaard-partnervoorwaarden.pdf",
            accepted_at: acceptedAt,
          });
        }
      }

      // 3. Check if UVH terms should be added
      const hasCatering = programItems.some(i => i.block_category === "catering");
      
      let addUvhForAccommodation = false;
      if (program.linked_accommodation_id) {
        const { data: selectedQuote } = await supabase
          .from("accommodation_quotes")
          .select("partner_id")
          .eq("request_id", program.linked_accommodation_id)
          .eq("status", "selected")
          .maybeSingle();
        
        if (selectedQuote) {
          const { data: accPartner } = await supabase
            .from("partners")
            .select("terms_pdf_path, uses_default_terms")
            .eq("id", selectedQuote.partner_id)
            .single();
          
          if (!accPartner?.terms_pdf_path || accPartner?.uses_default_terms) {
            addUvhForAccommodation = true;
          }
        }
      }

      if (hasCatering || addUvhForAccommodation) {
        termsLogEntries.push({
          request_id: program.id,
          partner_id: "uvh",
          partner_name: "Koninklijke Horeca Nederland",
          terms_type: "uvh_2024",
          terms_version: "2024",
          terms_pdf_path: null,
          accepted_at: acceptedAt,
        });
      }

      // Insert all terms log entries
      if (termsLogEntries.length > 0) {
        await supabase.from("accepted_terms_log").insert(termsLogEntries);
        console.log(`Logged ${termsLogEntries.length} accepted terms entries for request ${program.id}`);
      }

      // Resolve any terms_reminder todos
      await supabase
        .from("admin_todos")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
        })
        .eq("auto_type", "terms_reminder")
        .eq("auto_entity_id", program.id)
        .neq("status", "done");
      
      console.log(`Resolved terms_reminder todo for request ${program.id}`);

      // Update completion status to ready_for_invoice and create todo
      await supabase
        .from("program_requests")
        .update({ completion_status: "ready_for_invoice" })
        .eq("id", program.id);

      // Create invoicing_ready todo
      const { data: existingInvoiceTodo } = await supabase
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "invoicing_ready")
        .eq("auto_entity_id", program.id)
        .neq("status", "done")
        .maybeSingle();
      
      if (!existingInvoiceTodo) {
        const customerName = program.customer_company || program.customer_name;
        await supabase.from("admin_todos").insert({
          title: `Facturatie: ${customerName}`,
          description: `Klant heeft de voorwaarden geaccepteerd. Programma is klaar voor facturatie.`,
          priority: "normal",
          status: "todo",
          related_request_id: program.id,
          auto_type: "invoicing_ready",
          auto_entity_id: program.id,
        });
        console.log(`Created invoicing_ready todo for request ${program.id}`);
      }

      // Get billing details for partner notification
      const { data: updatedProgram } = await supabase
        .from("program_requests")
        .select("*")
        .eq("id", program.id)
        .single();

      // Get confirmed items to notify partners about definitive booking
      const { data: confirmedItems } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("request_id", program.id)
        .eq("status", "confirmed");

      // Group by provider for billing details email
      await enrichProviderEmails(supabase, confirmedItems || []);
      const providerItems = new Map<string, { name: string; email: string; items: any[] }>();
      (confirmedItems || []).forEach((item) => {
        if (item.provider_email && item.block_type !== "self_arranged") {
          if (!providerItems.has(item.provider_id)) {
            providerItems.set(item.provider_id, { name: item.provider_name, email: item.provider_email, items: [] });
          }
          providerItems.get(item.provider_id)!.items.push(item);
        }
      });

      const selectedDates = (program.selected_dates as string[])
        .map((d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }))
        .join(", ");

      // Email to partners with billing details
      for (const [providerId, provider] of providerItems) {
        const itemsList = provider.items.map(i => {
          const t = getEffectiveItemTime(i);
          return `<li>${sanitizeHtml(i.block_name)}${t ? ` (${sanitizeHtml(t)})` : ""}</li>`;
        }).join("");

        const billingTableHtml = `
          <table style="width: 100%;">
            <tr><td style="padding: 4px 0;"><strong>Bedrijf:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_company_name || "-")}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>KvK:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_kvk_number || "-")}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>BTW:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_vat_number || "-")}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Adres:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_address_street || "-")}, ${sanitizeHtml(updatedProgram?.billing_address_postal || "")} ${sanitizeHtml(updatedProgram?.billing_address_city || "")}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Contactpersoon:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_contact_name || "-")}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Email:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_contact_email || program.customer_email)}</td></tr>
            ${updatedProgram?.billing_reference ? `<tr><td style="padding: 4px 0;"><strong>Referentie:</strong></td><td>${sanitizeHtml(updatedProgram.billing_reference)}</td></tr>` : ""}
          </table>
        `;

        const template = await getRenderedTemplate(TemplateIds.BOOKING_CONFIRMED_PARTNER, {
          partner_name: sanitizeHtml(provider.name),
          customer_name: sanitizeHtml(program.customer_company || program.customer_name),
          billing_details: billingTableHtml,
          items_list: itemsList,
          selected_dates: selectedDates,
          number_of_people: String(program.number_of_people),
        });

        const emailSubject = template?.subject || `Definitieve boeking - ${sanitizeHtml(program.customer_company || program.customer_name)}`;
        const emailBody = template?.body || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Definitieve boeking bevestigd</h2>
              <p>Beste ${sanitizeHtml(provider.name)},</p>
              <p>De klant heeft de boeking definitief bevestigd. Hieronder de facturatiegegevens:</p>
              
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0;">Facturatiegegevens</h3>
                ${billingTableHtml}
              </div>
              
              <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0;">Geboekte activiteit(en)</h3>
                <ul>${itemsList}</ul>
                <p><strong>Datum:</strong> ${selectedDates}</p>
                <p><strong>Aantal personen:</strong> ${program.number_of_people}</p>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Let op: Uw eigen algemene voorwaarden zijn van toepassing op deze boeking. 
                De klant is hiervan op de hoogte gesteld.
              </p>
              
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            </div>
        `;

        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
          To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.name }],
          Subject: `${subjectPrefix}${emailSubject}`,
          HTMLPart: emailBody,
        });
        pendingEmailLogs.push({
          messageIdx: emailMessages.length - 1,
          logPayload: {
            email_type: "booking_confirmed_partner",
            subject: `${subjectPrefix}${emailSubject}`,
            recipient_email: getRecipientEmail(provider.email, origin),
            recipient_name: provider.name,
            related_request_id: program.id,
            related_partner_id: providerId,
            sent_by: "update-customer-program",
            metadata: {
              template_name: TemplateIds.BOOKING_CONFIRMED_PARTNER,
              actor: "system → partner (boeking definitief)",
              item_count: provider.items.length,
            },
          },
        });
      }

      // Customer confirmation email with signature details
      const signatureDate = new Date().toLocaleDateString("nl-NL", { 
        day: "numeric", 
        month: "long", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const signatureTableHtml = `
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="padding: 4px 0;"><strong>Handtekening-ID:</strong></td><td>${signatureId}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Ondertekend door:</strong></td><td>${sanitizeHtml(signatureName || program.customer_name)}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Datum/tijd:</strong></td><td>${signatureDate}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Voorwaarden versie:</strong></td><td>${termsVersion}</td></tr>
        </table>
      `;

      const partnerTermsNote = providerItems.size > 0 
        ? ` en de voorwaarden van ${providerItems.size} betrokken partner(s)` 
        : "";

      const bookingCustomerTemplate = await getRenderedTemplate(TemplateIds.BOOKING_CONFIRMED_CUSTOMER, {
        customer_name: sanitizeHtml(program.customer_name),
        selected_dates: selectedDates,
        number_of_people: String(program.number_of_people),
        confirmed_count: String(confirmedItems?.length || 0),
        signature_details: signatureTableHtml,
        partner_terms_note: partnerTermsNote,
        portal_url: `https://bureauvlieland.nl/mijn-programma/${token}`,
        portal_link: `https://bureauvlieland.nl/mijn-programma/${token}`,
      });

      const bookingCustomerSubject = bookingCustomerTemplate?.subject || "Boeking definitief bevestigd";
      const bookingCustomerBody = bookingCustomerTemplate?.body || `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Je boeking is definitief!</h2>
            <p>Beste ${sanitizeHtml(program.customer_name)},</p>
            <p>Bedankt voor je boeking bij Bureau Vlieland. Alle activiteiten zijn bevestigd en je akkoord op de algemene voorwaarden is geregistreerd.</p>
            
            <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin-top: 0;">Boekingsoverzicht</h3>
              <p><strong>Datum:</strong> ${selectedDates}</p>
              <p><strong>Aantal personen:</strong> ${program.number_of_people}</p>
              <p><strong>Aantal activiteiten:</strong> ${confirmedItems?.length || 0}</p>
            </div>

            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
              <h3 style="margin-top: 0;">Digitale handtekening</h3>
              ${signatureTableHtml}
              <p style="font-size: 12px; color: #666; margin-top: 12px; margin-bottom: 0;">
                Dit document dient als bewijs van je digitale akkoord op de algemene voorwaarden van Bureau Vlieland${partnerTermsNote}.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Let op: Voor de activiteiten van partners zijn hun eigen algemene voorwaarden van toepassing. 
              Je ontvangt hierover bericht van de betreffende aanbieders.
            </p>
            
            <p>
              <a href="https://bureauvlieland.nl/mijn-programma/${token}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Bekijk je programma
              </a>
            </p>
            
            <p>Heb je vragen? Neem gerust contact met ons op.</p>
            <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
          </div>
      `;

      emailMessages.push({
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
        To: [{ Email: program.customer_email, Name: program.customer_name }],
        Subject: `${subjectPrefix}${bookingCustomerSubject}`,
        HTMLPart: bookingCustomerBody,
      });
      pendingEmailLogs.push({
        messageIdx: emailMessages.length - 1,
        logPayload: {
          email_type: "booking_confirmed_customer",
          subject: `${subjectPrefix}${bookingCustomerSubject}`,
          recipient_email: program.customer_email,
          recipient_name: program.customer_name,
          related_request_id: program.id,
          sent_by: "update-customer-program",
          metadata: {
            template_name: TemplateIds.BOOKING_CONFIRMED_CUSTOMER,
            actor: "system → klant (boekingsbevestiging)",
            confirmed_count: confirmedItems?.length || 0,
          },
        },
      });
    }

    // Handle item changes
    if (changes && items && changes.length > 0) {
      for (const change of changes) {
        const item = items.find((i) => i.id === change.itemId);
        
        // Handle newly added items
        if (change.type === "added" && change.blockId) {
          // Fetch block data for the new item
          const { data: block, error: blockError } = await supabase
            .from("building_blocks")
            .select(`
              *,
              provider:partners(id, name, email)
            `)
            .eq("id", change.blockId)
            .single();
          
          if (blockError || !block) {
            console.error("Error fetching block for added item:", blockError);
            continue;
          }
          
          // Insert new item into program_request_items
          const { data: newItem, error: insertError } = await supabase
            .from("program_request_items")
            .insert({
              request_id: program.id,
              block_id: block.id,
              block_name: block.name,
              block_category: block.category,
              provider_name: block.provider?.name || "Bureau Vlieland",
              provider_id: block.provider?.id || "bureau",
              provider_email: block.provider?.email || null,
              block_type: block.block_type,
              price_indication: block.price_adult ? `€${block.price_adult}` : null,
              price_type: block.price_type || "per_person",
              duration: block.duration || null,
              day_index: change.dayIndex || 0,
              preferred_time: change.preferredTime || null,
              customer_notes: change.notes || null,
              status: "pending",
              version: 1,
              external_url: block.external_url || null,
            })
            .select()
            .single();
          
          if (insertError) {
            console.error("Error inserting new item:", insertError);
            continue;
          }
          
          // Log to history
          await supabase.from("program_request_history").insert({
            request_id: program.id,
            item_id: newItem.id,
            action: "added",
            actor: "customer",
            actor_name: program.customer_name,
            new_value: { block_name: block.name, day_index: change.dayIndex },
            notes: `Activiteit toegevoegd: ${block.name}`,
          });
          
          // Send email to provider if applicable
          if (block.provider?.email && block.block_type !== "self_arranged") {
            const selectedDates = (program.selected_dates as string[])
              .map((d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }))
              .join(", ");
            
            const customerLabel = sanitizeHtml(program.customer_company || program.customer_name);
            const timeInfo = change.preferredTime ? `<p><strong>Voorkeurstijd:</strong> ${change.preferredTime}</p>` : "";
            const notesInfo = change.notes ? `<p><strong>Opmerking:</strong> ${sanitizeHtml(change.notes)}</p>` : "";

            const template = await getRenderedTemplate(TemplateIds.ITEM_ADDED_PARTNER, {
              partner_name: sanitizeHtml(block.provider.name),
              customer_name: customerLabel,
              block_name: sanitizeHtml(block.name),
              selected_dates: selectedDates,
              number_of_people: String(program.number_of_people),
              preferred_time: timeInfo,
              notes: notesInfo,
              customer_full_name: sanitizeHtml(program.customer_name),
              customer_company: sanitizeHtml(program.customer_company || "-"),
              customer_email: sanitizeHtml(program.customer_email),
              customer_phone: sanitizeHtml(program.customer_phone),
            });

            const emailSubject = template?.subject || `Nieuwe activiteit toegevoegd - ${customerLabel}`;
            const emailBody = template?.body || `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Nieuwe activiteit toegevoegd</h2>
                  <p>Beste ${sanitizeHtml(block.provider.name)},</p>
                  <p>De klant heeft een nieuwe activiteit aan hun programma toegevoegd:</p>
                  
                  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin-top: 0;">${sanitizeHtml(block.name)}</h3>
                    <p><strong>Datum:</strong> ${selectedDates}</p>
                    <p><strong>Personen:</strong> ${program.number_of_people}</p>
                    ${timeInfo}
                    ${notesInfo}
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
                  
                  <h3>Klantgegevens</h3>
                  <table style="width: 100%;">
                    <tr><td style="padding: 4px 0;"><strong>Naam:</strong></td><td>${sanitizeHtml(program.customer_name)}</td></tr>
                    <tr><td style="padding: 4px 0;"><strong>Bedrijf:</strong></td><td>${sanitizeHtml(program.customer_company || "-")}</td></tr>
                    <tr><td style="padding: 4px 0;"><strong>Email:</strong></td><td>${sanitizeHtml(program.customer_email)}</td></tr>
                    <tr><td style="padding: 4px 0;"><strong>Telefoon:</strong></td><td>${sanitizeHtml(program.customer_phone)}</td></tr>
                  </table>
                  
                  <p style="margin-top: 24px; color: #666;">
                    Reageer via de Partner Portal of neem direct contact op met de klant.
                  </p>
                  
                  <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
                </div>
            `;

            emailMessages.push({
              From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
              ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
              To: [{ Email: getRecipientEmail(block.provider.email, origin), Name: block.provider.name }],
              Subject: `${subjectPrefix}${emailSubject}`,
              HTMLPart: emailBody,
            });
            pendingEmailLogs.push({
              messageIdx: emailMessages.length - 1,
              logPayload: {
                email_type: "item_added_partner",
                subject: `${subjectPrefix}${emailSubject}`,
                recipient_email: getRecipientEmail(block.provider.email, origin),
                recipient_name: block.provider.name,
                related_request_id: program.id,
                related_partner_id: block.provider.id,
                sent_by: "update-customer-program",
                metadata: {
                  template_name: TemplateIds.ITEM_ADDED_PARTNER,
                  actor: "klant → partner (item toegevoegd)",
                  block_name: block.name,
                },
              },
            });
          }
          
          continue;
        }
        
        if (!item) continue;

        // For cancelled items, update status
        if (change.type === "removed") {
          await supabase
            .from("program_request_items")
            .update({
              status: "cancelled",
              version: item.version + 1,
            })
            .eq("id", item.id);
        } else if (change.type === "people_changed") {
          // Persist override_people to database
          const newOverride = change.newValue === "groepstotaal" ? null : parseInt(change.newValue || "0", 10);
          await supabase
            .from("program_request_items")
            .update({
              override_people: newOverride,
              version: item.version + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        } else {
          // For other changes, reset to pending and update fields
          await supabase
            .from("program_request_items")
            .update({
              preferred_time: item.preferred_time,
              day_index: item.day_index,
              customer_notes: item.customer_notes,
              status: "pending",
              status_note: null,
              version: item.version + 1,
            })
            .eq("id", item.id);
        }

        // Log to history
        await supabase.from("program_request_history").insert({
          request_id: program.id,
          item_id: item.id,
          action: change.type,
          actor: "customer",
          actor_name: program.customer_name,
          old_value: change.oldValue ? { value: change.oldValue } : null,
          new_value: change.newValue ? { value: change.newValue } : null,
        });
      }

      // Group changes by provider for emails
      const changesByProvider = changes.reduce((acc, change) => {
        const email = change.providerEmail;
        if (!email) return acc;
        if (!acc[email]) {
          acc[email] = {
            providerName: change.providerName,
            email,
            changes: [],
          };
        }
        acc[email].changes.push(change);
        return acc;
      }, {} as Record<string, { providerName: string; email: string; changes: PendingChange[] }>);

      // Send emails to affected providers
      for (const provider of Object.values(changesByProvider)) {
        const changesHtml = provider.changes
          .map((change) => {
            let detail = `<strong>${sanitizeHtml(change.itemName)}</strong>: ${changeTypeLabels[change.type]}`;
            if (change.oldValue && change.newValue) {
              detail += ` (${sanitizeHtml(change.oldValue)} → ${sanitizeHtml(change.newValue)})`;
            }
            return `<li>${detail}</li>`;
          })
          .join("");

        const selectedDates = (program.selected_dates as string[])
          .map((d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }))
          .join(", ");

        const customerLabel = sanitizeHtml(program.customer_company || program.customer_name);

        const template = await getRenderedTemplate(TemplateIds.ITEM_CHANGES_PARTNER, {
          partner_name: sanitizeHtml(provider.providerName),
          customer_name: customerLabel,
          changes_list: changesHtml,
          customer_full_name: sanitizeHtml(program.customer_name),
          customer_company: sanitizeHtml(program.customer_company || "-"),
          customer_email: sanitizeHtml(program.customer_email),
          customer_phone: sanitizeHtml(program.customer_phone),
          selected_dates: selectedDates,
          number_of_people: String(program.number_of_people),
        });

        const emailSubject = template?.subject || `Wijziging aanvraag - ${program.customer_company || program.customer_name} - ${selectedDates}`;
        const emailBody = template?.body || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Wijziging in programma-aanvraag</h2>
              <p>Beste ${sanitizeHtml(provider.providerName)},</p>
              <p>De klant heeft wijzigingen doorgevoerd voor de aanvraag:</p>
              
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0;">Wijzigingen:</h3>
                <ul>${changesHtml}</ul>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
              
              <h3>Klantgegevens</h3>
              <table style="width: 100%;">
                <tr><td style="padding: 4px 0;"><strong>Naam:</strong></td><td>${sanitizeHtml(program.customer_name)}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Bedrijf:</strong></td><td>${sanitizeHtml(program.customer_company || "-")}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Email:</strong></td><td>${sanitizeHtml(program.customer_email)}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Telefoon:</strong></td><td>${sanitizeHtml(program.customer_phone)}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Datum:</strong></td><td>${selectedDates}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Personen:</strong></td><td>${program.number_of_people}</td></tr>
              </table>
              
              <p style="margin-top: 24px; color: #666;">
                Reageer via de Partner Portal of neem direct contact op met de klant.
              </p>
              
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            </div>
        `;

        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
          To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.providerName }],
          Subject: `${subjectPrefix}${emailSubject}`,
          HTMLPart: emailBody,
        });
        pendingEmailLogs.push({
          messageIdx: emailMessages.length - 1,
          logPayload: {
            email_type: "item_changes_partner",
            subject: `${subjectPrefix}${emailSubject}`,
            recipient_email: getRecipientEmail(provider.email, origin),
            recipient_name: provider.providerName,
            related_request_id: program.id,
            sent_by: "update-customer-program",
            metadata: {
              template_name: TemplateIds.ITEM_CHANGES_PARTNER,
              actor: "klant → partner (programma-wijzigingen)",
              change_count: provider.changes.length,
            },
          },
        });
      }

      // Send customer confirmation email for item changes
      const customerChangesHtml = changes
        .map((change) => {
          let detail = `<strong>${sanitizeHtml(change.itemName)}</strong>: ${changeTypeLabels[change.type]}`;
          if (change.oldValue && change.newValue) {
            detail += ` (${sanitizeHtml(change.oldValue)} → ${sanitizeHtml(change.newValue)})`;
          }
          return `<li>${detail}</li>`;
        })
        .join("");

      const itemChangesCustomerTemplate = await getRenderedTemplate(TemplateIds.ITEM_CHANGES_CUSTOMER, {
        customer_name: sanitizeHtml(program.customer_name),
        changes_list: customerChangesHtml,
        portal_url: `https://bureauvlieland.nl/mijn-programma/${token}`,
      });

      const itemChangesCustomerSubject = itemChangesCustomerTemplate?.subject || "Wijzigingen in je programma bevestigd";
      const itemChangesCustomerBody = itemChangesCustomerTemplate?.body || `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Wijzigingen bevestigd</h2>
            <p>Beste ${sanitizeHtml(program.customer_name)},</p>
            <p>Je wijzigingen zijn doorgevoerd en de betreffende aanbieders zijn op de hoogte gesteld:</p>
            
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <ul>${customerChangesHtml}</ul>
            </div>
            
            <p>Je ontvangt een email zodra een aanbieder reageert op de wijziging.</p>
            
            <p>
              <a href="https://bureauvlieland.nl/mijn-programma/${token}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Bekijk je programma
              </a>
            </p>
            
            <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
          </div>
      `;

      emailMessages.push({
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
        To: [{ Email: program.customer_email, Name: program.customer_name }],
        Subject: `${subjectPrefix}${itemChangesCustomerSubject}`,
        HTMLPart: itemChangesCustomerBody,
      });
      pendingEmailLogs.push({
        messageIdx: emailMessages.length - 1,
        logPayload: {
          email_type: "item_changes_customer",
          subject: `${subjectPrefix}${itemChangesCustomerSubject}`,
          recipient_email: program.customer_email,
          recipient_name: program.customer_name,
          related_request_id: program.id,
          sent_by: "update-customer-program",
          metadata: {
            template_name: TemplateIds.ITEM_CHANGES_CUSTOMER,
            actor: "system → klant (wijzigingen bevestigd)",
            change_count: changes.length,
          },
        },
      });
    }

    // Send all emails
    if (emailMessages.length > 0) {
      let mailjetResp: any = null;
      let sendError: string | null = null;
      try {
        mailjetResp = await sendEmailViaMailjet(emailMessages);
      } catch (emailError) {
        console.error("Error sending emails:", emailError);
        sendError = emailError instanceof Error ? emailError.message : "Unknown";
      }

      if (pendingEmailLogs.length > 0) {
        for (const { logPayload, messageIdx } of pendingEmailLogs) {
          const messageId = mailjetResp?.Messages?.[messageIdx]?.To?.[0]?.MessageID?.toString();
          const ok = !sendError && !!mailjetResp;
          try {
            await logEmail({
              ...logPayload,
              status: ok ? "sent" : "failed",
              error_message: ok ? undefined : sendError ?? undefined,
              mailjet_message_id: messageId,
            });
          } catch (logErr) {
            console.error("Error writing email_log entry:", logErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating customer program:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
