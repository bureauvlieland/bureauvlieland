import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import {
  sanitizeHtml,
  formatDateNL,
  getPortalBaseUrl,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AcceptQuoteSchema = z.object({
  token: z.string().optional(),
  request_id: z.string().optional(),
  admin_override: z.boolean().optional(),
  origin: z.string().optional(),
}).refine(d => d.token || d.request_id, {
  message: "token of request_id is verplicht",
});

interface ProgramItem {
  id: string;
  block_name: string;
  block_category: string;
  provider_id: string;
  provider_name: string;
  provider_email: string | null;
  preferred_time: string | null;
  day_index: number;
  skip_partner_notification: boolean;
}

interface PartnerGroup {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  items: ProgramItem[];
  itemIds: string[];
}

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Messages: messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }

  return await response.json();
};

async function groupItemsByProvider(items: ProgramItem[], supabase: any): Promise<Map<string, PartnerGroup>> {
  const groups = new Map<string, PartnerGroup>();

  // Collect unique provider IDs that need email lookup
  const providerIds = [...new Set(
    items
      .filter(i => i.provider_id && i.provider_id !== "bureau")
      .map(i => i.provider_id)
  )];

  // Fetch partner emails from DB as fallback
  let partnerMap = new Map<string, { id: string; name: string; email: string; contact_email: string | null }>();
  if (providerIds.length > 0) {
    const { data: partners } = await supabase
      .from("partners")
      .select("id, name, email, contact_email")
      .in("id", providerIds);
    partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));
  }

  for (const item of items) {
    if (item.provider_id === "bureau") continue;

    const partner = partnerMap.get(item.provider_id);
    const email = item.provider_email || (partner ? (partner.contact_email || partner.email) : undefined);
    if (!email) continue;

    if (!groups.has(item.provider_id)) {
      groups.set(item.provider_id, {
        partnerId: item.provider_id,
        partnerName: item.provider_name,
        partnerEmail: email,
        items: [],
        itemIds: [],
      });
    }

    const group = groups.get(item.provider_id)!;
    group.items.push(item);
    group.itemIds.push(item.id);
  }

  return groups;
}

function generatePartnerNotificationEmail(
  group: PartnerGroup,
  program: any,
  portalUrl: string
): string {
  const formattedDates = (program.selected_dates as string[])
    .map((d) => formatDateNL(d))
    .join(", ");

  const itemsHtml = group.items
    .map((item) => {
      const timeInfo = item.preferred_time
        ? `<br><span style="color: #666; font-size: 13px;">⏰ Gewenste tijd: ${sanitizeHtml(item.preferred_time)}</span>`
        : "";
      return `<li style="margin-bottom: 12px;">
        <strong>${sanitizeHtml(item.block_name)}</strong>
        ${timeInfo}
      </li>`;
    })
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
        Nieuwe aanvraag via Bureau Vlieland
      </h2>
      
      <p>Beste ${sanitizeHtml(group.partnerName)},</p>
      
      <p>Er is een nieuwe <strong>aanvraag</strong> binnengekomen via Bureau Vlieland. De klant heeft akkoord gegeven op het programmavoorstel.</p>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">📋 Klantgegevens</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #666;">Naam:</td><td style="padding: 5px 0;"><strong>${sanitizeHtml(program.customer_name)}</strong></td></tr>
          ${program.customer_company ? `<tr><td style="padding: 5px 0; color: #666;">Bedrijf:</td><td style="padding: 5px 0;"><strong>${sanitizeHtml(program.customer_company)}</strong></td></tr>` : ""}
          <tr><td style="padding: 5px 0; color: #666;">Email:</td><td style="padding: 5px 0;"><a href="mailto:${sanitizeHtml(program.customer_email)}" style="color: #0066cc;">${sanitizeHtml(program.customer_email)}</a></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Telefoon:</td><td style="padding: 5px 0;"><a href="tel:${sanitizeHtml(program.customer_phone)}" style="color: #0066cc;">${sanitizeHtml(program.customer_phone)}</a></td></tr>
        </table>
      </div>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">📅 Programma details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #666;">Datum(s):</td><td style="padding: 5px 0;"><strong>${formattedDates}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Aantal personen:</td><td style="padding: 5px 0;"><strong>${program.number_of_people}</strong></td></tr>
        </table>
      </div>
      
      <div style="background: #edf7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78;">
        <h3 style="margin-top: 0; color: #276749;">🎯 Aangevraagde activiteiten bij jullie</h3>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          ${itemsHtml}
        </ul>
      </div>
      
      <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4299e1;">
        <h3 style="margin-top: 0; color: #2b6cb0;">📋 Partner Portal</h3>
        <p style="margin-bottom: 12px;">
          Bekijk en beheer deze aanvraag in uw Partner Portal. 
          Bevestig beschikbaarheid of geef een alternatief door.
        </p>
        <a href="${portalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
          Open Partner Portal
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="color: #666; font-size: 14px;">
        <strong>Dit is een vrijblijvende aanvraag.</strong> Neem contact op met de klant om 
        beschikbaarheid te bevestigen en verdere details te bespreken.
      </p>
      
      <p style="margin-top: 30px;">
        Met vriendelijke groet,<br>
        <strong>Bureau Vlieland</strong><br>
        📧 <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a><br>
        📞 0562 700 208
      </p>
    </div>
  `;
}

function generateCustomerConfirmationEmail(
  program: any,
  partnerCount: number,
  portalUrl: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Uw akkoord is ontvangen</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0;">Bureau Vlieland</p>
      </div>
      
      <div style="padding: 32px 24px; background: #ffffff;">
        <p>Beste ${sanitizeHtml(program.customer_name)},</p>
        
        <p>Bedankt voor uw akkoord op het programmavoorstel! Wij hebben de ${partnerCount} betrokken leverancier${partnerCount !== 1 ? "s" : ""} op de hoogte gebracht van uw reservering.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #22c55e;">
          <h3 style="margin-top: 0; color: #166534;">✓ Wat gebeurt er nu?</h3>
          <ul style="margin-bottom: 0; padding-left: 20px;">
            <li>De leveranciers controleren hun beschikbaarheid</li>
            <li>U ontvangt per activiteit een bevestiging in uw portaal</li>
            <li>Na alle bevestigingen vult u de factuurgegevens in</li>
            <li>Daarna is uw boeking compleet</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${portalUrl}" style="display: inline-block; background: #1e3a5f; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Bekijk uw programma
          </a>
        </div>
        
        <p style="color: #6b7280;">
          Heeft u vragen? Neem gerust contact met ons op. Wij helpen u graag verder!
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <p style="margin-bottom: 0;">
          Met vriendelijke groet,<br>
          <strong>Bureau Vlieland</strong><br>
          📧 <a href="mailto:hallo@bureauvlieland.nl" style="color: #1e3a5f;">hallo@bureauvlieland.nl</a><br>
          📞 0562 700 208
        </p>
      </div>
    </div>
  `;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse and validate request
    const rawData = await req.json();
    const validationResult = AcceptQuoteSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ");
      return new Response(
        JSON.stringify({ error: `Validatiefout: ${errors}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { token, request_id, admin_override, origin } = validationResult.data;
    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const isAdmin = !!admin_override;

    console.log(`Accepting quote proposal [admin: ${isAdmin}] [Test mode: ${testMode}]`);

    // 1. Fetch the program by token or request_id
    let programQuery = supabase.from("program_requests").select("*");
    if (isAdmin && request_id) {
      programQuery = programQuery.eq("id", request_id);
    } else if (token) {
      programQuery = programQuery.eq("customer_token", token);
    } else {
      return new Response(
        JSON.stringify({ error: "token of request_id is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: program, error: programError } = await programQuery.single();

    if (programError || !program) {
      console.error("Program not found:", programError);
      return new Response(
        JSON.stringify({ error: "Programma niet gevonden" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Validate quote status (skip for admin override)
    if (!isAdmin) {
      if (program.quote_status !== "offerte_verstuurd") {
        return new Response(
          JSON.stringify({
            error: "Dit voorstel kan niet meer geaccepteerd worden",
            currentStatus: program.quote_status,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 3. Check validity date (only for customer)
      if (program.quote_valid_until) {
        const validUntil = new Date(program.quote_valid_until);
        if (validUntil < new Date()) {
          return new Response(
            JSON.stringify({
              error: "Dit voorstel is verlopen",
              validUntil: program.quote_valid_until,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // 4. Update quote_status and program_published_at
    // For self_service programs, skip quote_status update (they don't use quotes)
    const isSelfService = program.program_type === "self_service";
    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (!isSelfService && !(isAdmin && program.quote_status === "akkoord_ontvangen")) {
      updateFields.quote_status = "akkoord_ontvangen";
    }
    
    // Always set program_published_at if not yet set (admin sending to partners = publishing)
    if (!program.program_published_at) {
      updateFields.program_published_at = new Date().toISOString();
    }
    
    if (Object.keys(updateFields).length > 1) { // more than just updated_at
      const { error: updateProgramError } = await supabase
        .from("program_requests")
        .update(updateFields)
        .eq("id", program.id);

      if (updateProgramError) {
        console.error("Error updating program status:", updateProgramError);
        throw updateProgramError;
      }
    }

    // Ensure all active items have at least "bevestigd" quote status
    const { error: updateQuoteStatusError } = await supabase
      .from("program_request_items")
      .update({
        item_quote_status: "in_afstemming",
        updated_at: new Date().toISOString(),
      })
      .eq("request_id", program.id)
      .neq("status", "cancelled")
      .in("item_quote_status", ["concept", "in_afstemming"]);

    if (updateQuoteStatusError) {
      console.error("Error updating item quote statuses:", updateQuoteStatusError);
    } else {
      console.log(`Updated item_quote_status to 'bevestigd' for concept/in_afstemming items`);
    }

    // Auto-resolve terms_reminder todo
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("auto_type", "terms_reminder")
      .eq("auto_entity_id", program.id)
      .neq("status", "done");
    console.log(`Resolved terms_reminder todo for program ${program.id}`);

    // 5. Fetch items with skip_partner_notification = true AND not already approved individually
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("request_id", program.id)
      .eq("skip_partner_notification", true)
      .is("customer_approved_at", null)
      .neq("status", "cancelled");

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      throw itemsError;
    }

    console.log(`Found ${items?.length || 0} items to notify partners about`);

    // 6. Group items by provider
    const partnerGroups = await groupItemsByProvider(items || [], supabase);
    console.log(`Grouped into ${partnerGroups.size} partner groups`);

    // 7. Build portal URLs
    const baseUrl = getPortalBaseUrl(origin);
    const customerPortalUrl = `${baseUrl}/mijn-programma/${program.customer_token}`;

    // 8. Update items and send notifications per partner
    const emailMessages: any[] = [];
    const emailLogs: any[] = [];

    for (const [partnerId, group] of partnerGroups) {
      // Update items to pending and remove skip flag
      const { error: updateItemsError } = await supabase
        .from("program_request_items")
        .update({
          skip_partner_notification: false,
          status: "pending",
          status_updated_at: new Date().toISOString(),
        })
        .in("id", group.itemIds);

      if (updateItemsError) {
        console.error(`Error updating items for partner ${partnerId}:`, updateItemsError);
        continue;
      }

      const partnerPortalUrl = `${baseUrl}/partner/login`;

      // Generate email
      const emailHtml = generatePartnerNotificationEmail(group, program, partnerPortalUrl);
      const recipientEmail = getRecipientEmail(group.partnerEmail, origin);

      emailMessages.push({
        From: {
          Email: "hallo@bureauvlieland.nl",
          Name: "Bureau Vlieland",
        },
        To: [
          {
            Email: recipientEmail,
            Name: group.partnerName,
          },
        ],
        Subject: `${subjectPrefix}Nieuwe aanvraag: ${program.customer_name} - ${program.reference_number || ""}`,
        HTMLPart: emailHtml,
      });

      emailLogs.push({
        email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
        subject: `${subjectPrefix}Nieuwe aanvraag: ${program.customer_name}`,
        recipient_email: recipientEmail,
        recipient_name: group.partnerName,
        related_request_id: program.id,
        related_partner_id: partnerId,
        status: "pending",
        sent_by: "system",
        metadata: {
          item_count: group.items.length,
          triggered_by: "quote_accepted",
          test_mode: testMode,
        },
      });

      console.log(`Prepared notification for partner ${group.partnerName} (${group.items.length} items)`);
    }

    // Send all partner emails
    if (emailMessages.length > 0) {
      try {
        const mailjetResponse = await sendEmailViaMailjet(emailMessages);
        console.log(`Sent ${emailMessages.length} partner notification emails`);

        // Log emails as sent
        for (let i = 0; i < emailLogs.length; i++) {
          emailLogs[i].status = "sent";
          emailLogs[i].mailjet_message_id =
            mailjetResponse?.Messages?.[i]?.MessageID?.toString() || null;
          await logEmail(emailLogs[i]);
        }
      } catch (emailError) {
        console.error("Error sending partner emails:", emailError);
        // Log as failed
        for (const log of emailLogs) {
          log.status = "failed";
          log.error_message = emailError instanceof Error ? emailError.message : "Unknown error";
          await logEmail(log);
        }
      }
    }

    // 9. Create bureau_item_pricing todos for bureau items without pricing
    const customerName = program.customer_company || program.customer_name;
    const { data: allProgramItems } = await supabase
      .from("program_request_items")
      .select("id, block_name, block_type, admin_price_override, quoted_price")
      .eq("request_id", program.id)
      .neq("status", "cancelled");

    const bureauNeedPricing = (allProgramItems || []).filter(
      (i: any) => i.block_type === "bureau" && i.admin_price_override === null && i.quoted_price === null
    );

    for (const bi of bureauNeedPricing) {
      const { data: existingTodo } = await supabase
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "bureau_item_pricing")
        .eq("auto_entity_id", bi.id)
        .neq("status", "done")
        .maybeSingle();

      if (!existingTodo) {
        await supabase.from("admin_todos").insert({
          title: `Prijs invullen: "${bi.block_name}" voor ${customerName}`,
          description: `Bureau-item "${bi.block_name}" heeft nog geen prijs. Vul een admin prijs in.`,
          priority: "normal",
          status: "todo",
          related_request_id: program.id,
          auto_type: "bureau_item_pricing",
          auto_entity_id: bi.id,
        });
        console.log(`Created bureau_item_pricing todo for ${bi.block_name}`);
      }
    }

    // 10. Log history entry
    await supabase.from("program_request_history").insert({
      request_id: program.id,
      action: isAdmin ? "admin_sent_to_partners" : "quote_accepted",
      actor: isAdmin ? "admin" : "customer",
      actor_name: isAdmin ? "Admin" : program.customer_name,
      notes: isAdmin
        ? `Admin heeft ${partnerGroups.size} partner(s) genotificeerd over ${items?.length || 0} item(s).`
        : `Klant heeft voorstel geaccepteerd. ${partnerGroups.size} partner(s) genotificeerd.`,
    });

    // 10. Send confirmation email to customer (only for customer-initiated acceptance)
    if (!isAdmin) {
      const customerEmailHtml = generateCustomerConfirmationEmail(
        program,
        partnerGroups.size,
        customerPortalUrl
      );
      const customerRecipientEmail = getRecipientEmail(program.customer_email, origin);

      try {
        const customerMailjetResponse = await sendEmailViaMailjet([
          {
            From: {
              Email: "hallo@bureauvlieland.nl",
              Name: "Bureau Vlieland",
            },
            To: [
              {
                Email: customerRecipientEmail,
                Name: program.customer_name,
              },
            ],
            Subject: `${subjectPrefix}Uw akkoord is ontvangen - Bureau Vlieland`,
            HTMLPart: customerEmailHtml,
          },
        ]);

        await logEmail({
          email_type: "quote_accepted_customer",
          subject: `${subjectPrefix}Uw akkoord is ontvangen - Bureau Vlieland`,
          recipient_email: customerRecipientEmail,
          recipient_name: program.customer_name,
          related_request_id: program.id,
          status: "sent",
          mailjet_message_id:
            customerMailjetResponse?.Messages?.[0]?.MessageID?.toString() || null,
          sent_by: "system",
          metadata: {
            partner_count: partnerGroups.size,
            test_mode: testMode,
          },
        });

        console.log(`Sent confirmation email to customer ${customerRecipientEmail}`);
      } catch (customerEmailError) {
        console.error("Error sending customer confirmation:", customerEmailError);
        await logEmail({
          email_type: "quote_accepted_customer",
          subject: `${subjectPrefix}Uw akkoord is ontvangen - Bureau Vlieland`,
          recipient_email: customerRecipientEmail,
          recipient_name: program.customer_name,
          related_request_id: program.id,
          status: "failed",
          error_message:
            customerEmailError instanceof Error
              ? customerEmailError.message
              : "Unknown error",
          sent_by: "system",
        });
      }
    }

    console.log(`Quote acceptance completed for ${program.reference_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Voorstel geaccepteerd",
        partnersNotified: partnerGroups.size,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in accept-quote-proposal:", error);
    return new Response(
      JSON.stringify({
        error: "Er ging iets mis bij het accepteren van het voorstel",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
