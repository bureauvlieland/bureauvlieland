import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  formatDateNL,
  getPortalBaseUrl,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  renderEffectiveTimeLine,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProgramItem {
  id: string;
  block_name: string;
  block_category: string;
  block_type: string;
  provider_id: string;
  provider_name: string;
  provider_email: string | null;
  preferred_time: string | null;
  proposed_time: string | null;
  confirmed_time: string | null;
  day_index: number;
  skip_partner_notification: boolean;
  customer_approved_at: string | null;
  status: string;
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

function generatePartnerNotificationEmail(
  group: PartnerGroup,
  program: any,
  portalUrl: string,
  isReminder = false,
): string {
  const formattedDates = (program.selected_dates as string[])
    .map((d: string) => formatDateNL(d))
    .join(", ");

  const itemsHtml = group.items
    .map((item) => {
      return `<li style="margin-bottom: 12px;">
        <strong>${sanitizeHtml(item.block_name)}</strong>
        ${renderEffectiveTimeLine(item, "Tijd")}
      </li>`;
    })
    .join("");

  const headline = isReminder
    ? "Herinnering: aanvraag staat nog open"
    : "Nieuwe aanvraag via Bureau Vlieland";
  const intro = isReminder
    ? `<p>Beste ${sanitizeHtml(group.partnerName)},</p>
       <p>Een vriendelijke <strong>herinnering</strong>: onderstaande aanvraag staat nog open in jullie partnerportaal en wacht op een reactie.</p>`
    : `<p>Beste ${sanitizeHtml(group.partnerName)},</p>
       <p>Er is een nieuwe <strong>aanvraag</strong> binnengekomen via Bureau Vlieland.</p>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
        ${headline}
      </h2>
      ${intro}
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">📅 Programma details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #666;">Referentie:</td><td style="padding: 5px 0;"><strong>${program.reference_number || "-"}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Datum(s):</td><td style="padding: 5px 0;"><strong>${formattedDates}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Aantal personen:</td><td style="padding: 5px 0;"><strong>${program.number_of_people}</strong></td></tr>
        </table>
      </div>
      <div style="background: #edf7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78;">
        <h3 style="margin-top: 0; color: #276749;">🎯 Aangevraagde activiteiten bij jullie</h3>
        <ul style="padding-left: 20px; margin-bottom: 0;">${itemsHtml}</ul>
      </div>
      <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4299e1;">
        <h3 style="margin-top: 0; color: #2b6cb0;">📋 Partnerportaal</h3>
        <p style="margin-bottom: 12px;">Bekijk en beheer deze aanvraag in je partnerportaal.</p>
        <a href="${portalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
          Ga naar partnerportaal →
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        <strong>Dit is een vrijblijvende aanvraag.</strong> Neem contact op met Bureau Vlieland om beschikbaarheid te bevestigen.
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    interface SendItemsBody {
      request_id?: string;
      origin?: string;
      dry_run?: boolean;
      // Optionele subset van item-ids; als opgegeven worden ALLEEN deze items
      // verstuurd (per-item versturen vanuit admin). Anders alle skip-items.
      item_ids?: string[];
      // "auto" (default): alleen items met skip_partner_notification=true.
      // "force": ook items die al verzonden zijn — gebruikt voor herinneringen
      //   en het forceren van een verzending vóór formeel klantakkoord.
      mode?: "auto" | "force";
    }
    const { request_id, origin, dry_run, item_ids, mode = "auto" }: SendItemsBody = await req.json();
    const isForce = mode === "force";

    if (!request_id) {
      return new Response(
        JSON.stringify({ error: "request_id is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);

    // 1. Fetch program
    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch non-cancelled items that haven't been sent yet.
    //    Als item_ids is meegegeven, beperken we tot die subset (per-item versturen).
    let itemsQuery = supabase
      .from("program_request_items")
      .select("id, block_name, block_category, block_type, provider_id, provider_name, provider_email, preferred_time, proposed_time, confirmed_time, day_index, skip_partner_notification, customer_approved_at, status")
      .eq("request_id", request_id)
      .neq("status", "cancelled");

    // In force-mode (per-item, herinnering) negeren we de skip-filter zodat
    // we ook items kunnen herinneren die al uitgegaan zijn.
    if (!isForce) {
      itemsQuery = itemsQuery.eq("skip_partner_notification", true);
    }

    if (item_ids && item_ids.length > 0) {
      itemsQuery = itemsQuery.in("id", item_ids);
    }

    const { data: allItems, error: itemsError } = await itemsQuery;

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      throw itemsError;
    }

    const items = (allItems || []) as ProgramItem[];

    // 3. Separate bureau items (no email needed) from external partner items
    const bureauItems = items.filter(i => i.provider_id === "bureau");
    const partnerItems = items.filter(i => i.provider_id !== "bureau");

    // 4. If dry_run, return preview data without sending
    if (dry_run) {
      const partnerGroups = new Map<string, { partnerName: string; items: { id: string; block_name: string }[] }>();
      for (const item of partnerItems) {
        if (!partnerGroups.has(item.provider_id)) {
          partnerGroups.set(item.provider_id, { partnerName: item.provider_name, items: [] });
        }
        partnerGroups.get(item.provider_id)!.items.push({ id: item.id, block_name: item.block_name });
      }

      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          partnerItems: partnerItems.length,
          bureauItems: bureauItems.length,
          partners: Array.from(partnerGroups.entries()).map(([id, g]) => ({
            partnerId: id,
            partnerName: g.partnerName,
            items: g.items,
          })),
          bureauItemsList: bureauItems.map(i => ({ id: i.id, block_name: i.block_name })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Release bureau items.
    //    Bureau-items zijn intern (aanbieder = Bureau Vlieland zelf), dus zodra
    //    de klant akkoord heeft gegeven en we 'versturen', zetten we ze direct
    //    op bevestigd — same same als de externe partner-bevestigingsstap.
    //
    //    Uitzondering: bootovertochten (Doeksen). Die moeten nog handmatig
    //    geboekt worden bij de rederij vóór ze definitief bevestigd zijn.
    //    Die laten we op 'pending' staan en triggeren we als todo.
    const isFerryItem = (i: ProgramItem) => {
      const name = (i.block_name || "").toLowerCase();
      return name.includes("overtocht") || name.includes("doeksen");
    };
    const bureauFerryItems = bureauItems.filter(isFerryItem);
    const bureauAutoConfirmItems = bureauItems.filter(i => !isFerryItem(i));
    const nowIso = new Date().toISOString();

    if (bureauAutoConfirmItems.length > 0) {
      const ids = bureauAutoConfirmItems.map(i => i.id);
      await supabase
        .from("program_request_items")
        .update({
          skip_partner_notification: false,
          status: "confirmed",
          item_quote_status: "bevestigd",
          customer_approved_at: nowIso,
          status_updated_at: nowIso,
        })
        .in("id", ids)
        .is("customer_approved_at", null);

      // Voor items die al een customer_approved_at hadden, alleen status doorzetten
      await supabase
        .from("program_request_items")
        .update({
          skip_partner_notification: false,
          status: "confirmed",
          item_quote_status: "bevestigd",
          status_updated_at: nowIso,
        })
        .in("id", ids)
        .not("customer_approved_at", "is", null);

      console.log(`Auto-confirmed ${bureauAutoConfirmItems.length} bureau item(s)`);
    }

    if (bureauFerryItems.length > 0) {
      const ids = bureauFerryItems.map(i => i.id);
      await supabase
        .from("program_request_items")
        .update({
          skip_partner_notification: false,
          status: "pending",
          status_updated_at: nowIso,
        })
        .in("id", ids);
      console.log(`Released ${bureauFerryItems.length} ferry item(s) — pending booking`);

      // Maak per overtocht-item een todo aan om tickets te boeken bij Doeksen.
      const customerLabelForFerry = program.customer_company || program.customer_name;
      for (const fi of bureauFerryItems) {
        const { data: existing } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "book_ferry_tickets")
          .eq("auto_entity_id", fi.id)
          .neq("status", "done")
          .maybeSingle();
        if (!existing) {
          await supabase.from("admin_todos").insert({
            title: `Boot boeken: "${fi.block_name}" voor ${customerLabelForFerry}`,
            description: `Boek de overtocht bij Rederij Doeksen en vul de definitieve prijs in op het programmaonderdeel.`,
            priority: "normal",
            status: "todo",
            related_request_id: program.id,
            auto_type: "book_ferry_tickets",
            auto_entity_id: fi.id,
          });
        }
      }
    }

    // 6. Send only partner items via email
    if (partnerItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: bureauItems.length > 0
            ? `${bureauItems.length} bureau-item(s) vrijgegeven. Geen externe partners om te notificeren.`
            : "Geen items klaar om te versturen.",
          partnersNotified: 0,
          bureauItems: bureauItems.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Group partner items by provider
    const groups = new Map<string, PartnerGroup>();
    const providerIds = [...new Set(partnerItems.map(i => i.provider_id))];

    let partnerMap = new Map<string, { id: string; name: string; email: string; contact_email: string | null }>();
    if (providerIds.length > 0) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, email, contact_email")
        .in("id", providerIds);
      partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));
    }

    for (const item of partnerItems) {
      const partner = partnerMap.get(item.provider_id);
      const email = item.provider_email || (partner ? (partner.contact_email || partner.email) : undefined);
      if (!email) {
        console.warn(`No email for partner ${item.provider_id}, skipping`);
        continue;
      }

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

    // 7. Update items and send emails
    const baseUrl = getPortalBaseUrl(origin);
    const emailMessages: any[] = [];
    const emailLogs: any[] = [];
    const logMessageIndex: number[] = [];

    for (const [partnerId, group] of groups) {
      // In force-mode (herinnering / herversturen) raken we de status niet
      // aan: het item zit al in de partner-flow. We loggen alleen tijdstip.
      const updatePayload = isForce
        ? { status_updated_at: new Date().toISOString() }
        : {
            skip_partner_notification: false,
            status: "pending",
            status_updated_at: new Date().toISOString(),
          };

      const { error: updateError } = await supabase
        .from("program_request_items")
        .update(updatePayload)
        .in("id", group.itemIds);

      if (updateError) {
        console.error(`Error updating items for partner ${partnerId}:`, updateError);
        continue;
      }

      const partnerPortalUrl = `${baseUrl}/partner/login`;
      const emailHtml = generatePartnerNotificationEmail(group, program, partnerPortalUrl, isForce);
      const recipientEmail = getRecipientEmail(group.partnerEmail, origin);
      const subjectLine = isForce
        ? `${subjectPrefix}Herinnering: aanvraag via Bureau Vlieland — ${program.reference_number || ""}`
        : `${subjectPrefix}Nieuwe aanvraag via Bureau Vlieland — ${program.reference_number || ""}`;

      const messageIdx = emailMessages.length;
      emailMessages.push({
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: recipientEmail, Name: group.partnerName }],
        ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
        Subject: subjectLine,
        HTMLPart: emailHtml,
      });

      // Log per item zodat de mail-log popover per onderdeel werkt
      for (const it of group.items) {
        emailLogs.push({
          email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
          subject: subjectLine,
          recipient_email: recipientEmail,
          recipient_name: group.partnerName,
          related_request_id: program.id,
          related_partner_id: partnerId,
          related_item_id: it.id,
          status: "pending",
          sent_by: "admin",
          metadata: {
            item_count: group.items.length,
            item_ids: group.itemIds,
            test_mode: testMode,
            reminder: isForce,
            template_name: EmailTypes.PROGRAM_REQUEST_PARTNER,
            actor: "admin → partner",
          },
        });
        logMessageIndex.push(messageIdx);
      }

      console.log(`Prepared notification for partner ${group.partnerName} (${group.items.length} items)`);
    }

    if (emailMessages.length > 0) {
      try {
        const mailjetResponse = await sendEmailViaMailjet(emailMessages);
        console.log(`Sent ${emailMessages.length} partner notification emails`);
        for (let i = 0; i < emailLogs.length; i++) {
          emailLogs[i].status = "sent";
          const msgIdx = logMessageIndex[i] ?? i;
          emailLogs[i].mailjet_message_id = mailjetResponse?.Messages?.[msgIdx]?.MessageID?.toString() || null;
          await logEmail(emailLogs[i]);
        }
      } catch (emailError) {
        console.error("Error sending partner emails:", emailError);
        for (const log of emailLogs) {
          log.status = "failed";
          log.error_message = emailError instanceof Error ? emailError.message : "Unknown error";
          await logEmail(log);
        }
      }
    }

    // 8. Create bureau_item_pricing todos for bureau items without pricing
    const customerName = program.customer_company || program.customer_name;
    for (const bi of bureauItems) {
      // Check if the item needs pricing (no admin_price_override and no quoted_price)
      const { data: fullItem } = await supabase
        .from("program_request_items")
        .select("admin_price_override, quoted_price")
        .eq("id", bi.id)
        .single();

      if (fullItem && fullItem.admin_price_override === null && fullItem.quoted_price === null) {
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
        }
      }
    }

    // 9. Resolve "send_items_to_partners" auto-todo
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("related_request_id", program.id)
      .eq("auto_type", "send_items_to_partners")
      .neq("status", "done");

    // 10. Log history
    await supabase.from("program_request_history").insert({
      request_id: program.id,
      action: "admin_sent_to_partners",
      actor: "admin",
      actor_name: "Admin",
      notes: `Admin heeft ${groups.size} partner(s) genotificeerd over ${partnerItems.length} item(s).${bureauItems.length > 0 ? ` ${bureauItems.length} bureau-item(s) vrijgegeven.` : ""}`,
    });

    // 10. Set program_published_at if not set
    if (!program.program_published_at) {
      await supabase
        .from("program_requests")
        .update({ program_published_at: new Date().toISOString() })
        .eq("id", program.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${groups.size} partner(s) genotificeerd over ${partnerItems.length} item(s)`,
        partnersNotified: groups.size,
        itemsSent: partnerItems.length,
        bureauItems: bureauItems.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-items-to-partners:", error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het versturen naar partners" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
