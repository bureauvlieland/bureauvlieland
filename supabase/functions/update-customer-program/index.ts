import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingChange {
  type: "time_changed" | "day_changed" | "notes_changed" | "removed" | "added";
  itemId: string;
  itemName: string;
  providerName: string;
  providerEmail?: string;
  oldValue?: string;
  newValue?: string;
}

interface ProgramDetailsUpdate {
  selectedDates?: string[];
  numberOfPeople?: number;
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

const sanitizeHtml = (str: string | undefined | null): string => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const changeTypeLabels: Record<PendingChange["type"], string> = {
  time_changed: "Tijd gewijzigd",
  day_changed: "Dag gewijzigd",
  notes_changed: "Opmerking aangepast",
  removed: "Geannuleerd",
  added: "Toegevoegd",
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, changes, items, programDetails, billingDetails, acceptTerms, signatureName, origin } = await req.json() as {
      token: string;
      changes?: PendingChange[];
      items?: ProgramRequestItem[];
      programDetails?: ProgramDetailsUpdate;
      billingDetails?: BillingDetailsUpdate;
      acceptTerms?: boolean;
      signatureName?: string;
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
    if ((!changes || !items) && !programDetails && !billingDetails && !acceptTerms) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify program exists and get details
    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select("*")
      .eq("customer_token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Program not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailMessages: any[] = [];

    // Handle program details updates (dates/people changes)
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
        
        // Email providers about date change (redirected in test mode)
        for (const [, provider] of providerItems) {
          emailMessages.push({
            From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.name }],
            Subject: `${subjectPrefix}Datumwijziging aanvraag - ${sanitizeHtml(program.customer_company || program.customer_name)}`,
            HTMLPart: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Datumwijziging</h2>
                <p>Beste ${sanitizeHtml(provider.name)},</p>
                <p>De klant heeft de datum(s) gewijzigd naar: <strong>${newDates}</strong></p>
                <p>Graag je beschikbaarheid opnieuw bevestigen.</p>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p><strong>Jouw activiteit(en):</strong></p>
                  <ul>${provider.items.map(i => `<li>${sanitizeHtml(i)}</li>`).join("")}</ul>
                </div>
                <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
              </div>
            `,
          });
        }
        
        // Customer confirmation for date change
        // Customer confirmation (always to real customer email)
        emailMessages.push({
          From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
          To: [{ Email: program.customer_email, Name: program.customer_name }],
          Subject: `${subjectPrefix}Datumwijziging bevestigd`,
          HTMLPart: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Datumwijziging bevestigd</h2>
              <p>Beste ${sanitizeHtml(program.customer_name)},</p>
              <p>Je hebt de datum(s) gewijzigd naar: <strong>${newDates}</strong></p>
              <p>Alle ${providerItems.size} betrokken aanbieder(s) zijn op de hoogte gesteld en we wachten op hun bevestiging.</p>
              <p>
                <a href="https://bureauvlieland.nl/mijn-programma/${token}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Bekijk je programma
                </a>
              </p>
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            </div>
          `,
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

    // Handle terms acceptance with digital signature
    if (acceptTerms) {
      const termsVersion = "2026-01"; // Version identifier for tracking
      
      // Generate unique signature ID
      const signatureId = `SIG-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;

      await supabase
        .from("program_requests")
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: termsVersion,
          signature_name: signatureName || null,
          signature_ip: clientIp,
          signature_user_agent: userAgent,
          signature_id: signatureId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", program.id);

      // Log to history with signature details
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        action: "terms_accepted",
        actor: "customer",
        actor_name: signatureName || program.customer_name,
        notes: `Digitaal ondertekend (${signatureId}) - Voorwaarden versie ${termsVersion}`,
        new_value: {
          signature_id: signatureId,
          signature_name: signatureName,
          signature_ip: clientIp,
          terms_version: termsVersion,
        },
      });

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
      for (const [, provider] of providerItems) {
        const itemsList = provider.items.map(i => 
          `<li>${sanitizeHtml(i.block_name)}${i.preferred_time ? ` (${i.preferred_time})` : ""}</li>`
        ).join("");

        emailMessages.push({
          From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
          To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.name }],
          Subject: `${subjectPrefix}Definitieve boeking - ${sanitizeHtml(program.customer_company || program.customer_name)}`,
          HTMLPart: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Definitieve boeking bevestigd</h2>
              <p>Beste ${sanitizeHtml(provider.name)},</p>
              <p>De klant heeft de boeking definitief bevestigd. Hieronder de facturatiegegevens:</p>
              
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0;">Facturatiegegevens</h3>
                <table style="width: 100%;">
                  <tr><td style="padding: 4px 0;"><strong>Bedrijf:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_company_name || "-")}</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>KvK:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_kvk_number || "-")}</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>BTW:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_vat_number || "-")}</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>Adres:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_address_street || "-")}, ${sanitizeHtml(updatedProgram?.billing_address_postal || "")} ${sanitizeHtml(updatedProgram?.billing_address_city || "")}</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>Contactpersoon:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_contact_name || "-")}</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>Email:</strong></td><td>${sanitizeHtml(updatedProgram?.billing_contact_email || program.customer_email)}</td></tr>
                  ${updatedProgram?.billing_reference ? `<tr><td style="padding: 4px 0;"><strong>Referentie:</strong></td><td>${sanitizeHtml(updatedProgram.billing_reference)}</td></tr>` : ""}
                </table>
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
          `,
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

      emailMessages.push({
        From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: program.customer_email, Name: program.customer_name }],
        Subject: `${subjectPrefix}Boeking definitief bevestigd`,
        HTMLPart: `
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
              <table style="width: 100%; font-size: 14px;">
                <tr><td style="padding: 4px 0;"><strong>Handtekening-ID:</strong></td><td>${signatureId}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Ondertekend door:</strong></td><td>${sanitizeHtml(signatureName || program.customer_name)}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Datum/tijd:</strong></td><td>${signatureDate}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Voorwaarden versie:</strong></td><td>${termsVersion}</td></tr>
              </table>
              <p style="font-size: 12px; color: #666; margin-top: 12px; margin-bottom: 0;">
                Dit document dient als bewijs van je digitale akkoord op de algemene voorwaarden van Bureau Vlieland
                ${providerItems.size > 0 ? ` en de voorwaarden van ${providerItems.size} betrokken partner(s)` : ""}.
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
        `,
      });
    }

    // Handle item changes
    if (changes && items && changes.length > 0) {
      for (const item of items) {
        const change = changes.find((c) => c.itemId === item.id);
        if (!change) continue;

        // For cancelled items, update status
        if (change.type === "removed") {
          await supabase
            .from("program_request_items")
            .update({
              status: "cancelled",
              version: item.version + 1,
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
      Object.values(changesByProvider).forEach((provider) => {
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

        // Provider emails (redirected in test mode)
        emailMessages.push({
          From: {
            Email: "noreply@bureauvlieland.nl",
            Name: "Bureau Vlieland",
          },
          To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.providerName }],
          Subject: `${subjectPrefix}Wijziging aanvraag - ${program.customer_company || program.customer_name} - ${selectedDates}`,
          HTMLPart: `
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
          `,
        });
      });

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

      // Customer confirmation (always to real customer email)
      emailMessages.push({
        From: {
          Email: "noreply@bureauvlieland.nl",
          Name: "Bureau Vlieland",
        },
        To: [{ Email: program.customer_email, Name: program.customer_name }],
        Subject: `${subjectPrefix}Wijzigingen in je programma bevestigd`,
        HTMLPart: `
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
        `,
      });
    }

    // Send all emails
    if (emailMessages.length > 0) {
      try {
        await sendEmailViaMailjet(emailMessages);
      } catch (emailError) {
        console.error("Error sending emails:", emailError);
        // Don't fail the request if emails fail
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
