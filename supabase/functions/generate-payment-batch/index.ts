import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IBAN mod-97 validation
function validateIban(iban: string): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((c) => (/[A-Z]/.test(c) ? (c.charCodeAt(0) - 55).toString() : c))
    .join("");
  // mod-97 in chunks to avoid bigint overflow
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder === 1;
}

function sanitizeName(s: string, max = 70): string {
  return (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 \-.,&/'+()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, max);
}

function sanitizeRef(s: string, max = 35): string {
  return (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9-]/g, "")
    .substring(0, max);
}

function sanitizeRemittance(s: string, max = 140): string {
  return (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 \-.,&/'+():]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, max);
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const invoiceIds: string[] = body.invoiceIds || [];
    const executionDate: string = body.executionDate; // YYYY-MM-DD

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return new Response(JSON.stringify({ error: "Selecteer minstens één factuur" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!executionDate || !/^\d{4}-\d{2}-\d{2}$/.test(executionDate)) {
      return new Response(JSON.stringify({ error: "Geldige uitvoeringsdatum vereist (YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load bureau settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("id, value")
      .in("id", ["bureau_iban", "bureau_bic", "bureau_account_name"]);
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => {
      const v = typeof s.value === "string" ? s.value.replace(/^"|"$/g, "") : String(s.value || "").replace(/^"|"$/g, "");
      settingsMap[s.id] = v;
    });
    const bureauIban = (settingsMap.bureau_iban || "").replace(/\s/g, "").toUpperCase();
    const bureauBic = (settingsMap.bureau_bic || "").replace(/\s/g, "").toUpperCase();
    const bureauName = sanitizeName(settingsMap.bureau_account_name || "Bureau Vlieland");

    if (!bureauIban || !validateIban(bureauIban)) {
      return new Response(
        JSON.stringify({ error: "Geen geldig IBAN ingesteld voor Bureau Vlieland. Stel deze in onder /admin/instellingen." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load invoices + partners
    const { data: invoices, error: invErr } = await supabase
      .from("partner_purchase_invoices")
      .select(`
        id, invoice_number, invoice_date, amount_incl_vat, description, payment_batch_id, status,
        refund_pending_at, amount_mismatch_reason, pdf_total_incl_vat,
        partners!inner(id, name, iban, bic, pays_by_direct_debit),
        program_requests!inner(reference_number)
      `)
      .in("id", invoiceIds);
    if (invErr || !invoices) {
      return new Response(JSON.stringify({ error: invErr?.message || "Facturen niet gevonden" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check open findings voor deze facturen
    const { data: openFindings } = await supabase
      .from("purchase_invoice_reconciliation_findings")
      .select("invoice_id, difference, pdf_incl_extracted, stored_incl")
      .in("invoice_id", invoiceIds)
      .eq("status", "open");
    const findingsByInvoice = new Map<string, any>();
    (openFindings || []).forEach((f: any) => findingsByInvoice.set(f.invoice_id, f));

    // Validate
    const errors: string[] = [];
    for (const inv of invoices as any[]) {
      if (inv.payment_batch_id) {
        errors.push(`Factuur ${inv.invoice_number} zit al in een batch`);
      }
      if (inv.refund_pending_at) {
        errors.push(`Factuur ${inv.invoice_number} (${inv.partners?.name}) staat gemarkeerd als terug te vorderen en mag niet opnieuw betaald worden`);
      }
      if (findingsByInvoice.has(inv.id)) {
        const f = findingsByInvoice.get(inv.id);
        errors.push(
          `Factuur ${inv.invoice_number} (${inv.partners?.name}) heeft een openstaande bedragafwijking (€${Number(f.difference).toFixed(2)} verschil met PDF) — los eerst op onder /admin/facturen/afwijkingen`,
        );
      }
      if (inv.amount_mismatch_reason && !inv.refund_pending_at) {
        // mismatch bij invoer is genoteerd maar niet als refund afgehandeld — extra bevestiging vereist
        errors.push(
          `Factuur ${inv.invoice_number} (${inv.partners?.name}) is met een handmatige afwijkingsreden opgeslagen. Bevestig dat het bedrag klopt (los de finding op) voordat de batch gegenereerd wordt`,
        );
      }
      if (inv.partners?.pays_by_direct_debit) {
        errors.push(`Partner ${inv.partners?.name} betaalt via automatische incasso en hoort niet in een betaalbatch`);
      }
      const ibanRaw = (inv.partners?.iban || "").replace(/\s/g, "").toUpperCase();
      if (!ibanRaw) errors.push(`Partner ${inv.partners?.name} heeft geen IBAN`);
      else if (!validateIban(ibanRaw)) errors.push(`Ongeldig IBAN voor ${inv.partners?.name}: ${ibanRaw}`);
      if (Number(inv.amount_incl_vat || 0) <= 0) errors.push(`Bedrag ongeldig op factuur ${inv.invoice_number}`);
    }


    // Duplicate guard: same (partner + normalized invoice number) mag maar 1x in de selectie zitten.
    const normalizeInvNr = (v: string | null | undefined) =>
      (v || "").replace(/[\s\-_.]/g, "").toUpperCase();
    const dupBuckets = new Map<string, any[]>();
    for (const inv of invoices as any[]) {
      const partnerId = inv.partners?.id || "";
      const nr = normalizeInvNr(inv.invoice_number);
      if (!partnerId || !nr) continue;
      const key = `${partnerId}::${nr}`;
      const arr = dupBuckets.get(key) || [];
      arr.push(inv);
      dupBuckets.set(key, arr);
    }
    for (const [, group] of dupBuckets) {
      if (group.length > 1) {
        const first = group[0];
        errors.push(
          `Factuur ${first.invoice_number} (${first.partners?.name}) staat ${group.length}× in de selectie — controleer of het niet per ongeluk dubbel is geregistreerd`,
        );
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join("; ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalAmount = (invoices as any[]).reduce((s, i) => s + Number(i.amount_incl_vat || 0), 0);
    const transactionCount = invoices.length;

    // Insert batch
    const { data: batch, error: batchErr } = await supabase
      .from("payment_batches")
      .insert({
        created_by: user.id,
        requested_execution_date: executionDate,
        total_amount: totalAmount,
        transaction_count: transactionCount,
        status: "generated",
      })
      .select()
      .single();
    if (batchErr || !batch) {
      return new Response(JSON.stringify({ error: batchErr?.message || "Kon batch niet aanmaken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchRef = batch.batch_reference as string;
    const now = new Date();
    const creDtTm = now.toISOString().replace(/\.\d{3}Z$/, "");

    const txBlocks = (invoices as any[]).map((inv, idx) => {
      const partnerIban = (inv.partners.iban as string).replace(/\s/g, "").toUpperCase();
      const partnerBic = ((inv.partners.bic as string) || "").replace(/\s/g, "").toUpperCase();
      const amount = Number(inv.amount_incl_vat).toFixed(2);
      const endToEnd = sanitizeRef(`${batchRef}-${idx + 1}-${inv.invoice_number}`.replace(/[^A-Za-z0-9-]/g, ""));
      const cdtrName = sanitizeName(inv.partners.name);
      const projectRef = inv.program_requests?.reference_number || "";
      const remit = sanitizeRemittance(`Factuur ${inv.invoice_number}${projectRef ? " - " + projectRef : ""}`);
      const bicBlock = partnerBic
        ? `        <CdtrAgt><FinInstnId><BIC>${xmlEscape(partnerBic)}</BIC></FinInstnId></CdtrAgt>\n`
        : "";
      return `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${xmlEscape(endToEnd)}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${amount}</InstdAmt></Amt>
${bicBlock}        <Cdtr><Nm>${xmlEscape(cdtrName)}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${xmlEscape(partnerIban)}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${xmlEscape(remit)}</Ustrd></RmtInf>
      </CdtTrfTxInf>`;
    }).join("\n");

    const dbtrAgtBlock = bureauBic
      ? `        <DbtrAgt><FinInstnId><BIC>${xmlEscape(bureauBic)}</BIC></FinInstnId></DbtrAgt>`
      : `        <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xmlEscape(batchRef)}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${transactionCount}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${xmlEscape(bureauName)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xmlEscape(batchRef)}-01</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${transactionCount}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${executionDate}</ReqdExctnDt>
      <Dbtr><Nm>${xmlEscape(bureauName)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${xmlEscape(bureauIban)}</IBAN></Id><Ccy>EUR</Ccy></DbtrAcct>
${dbtrAgtBlock}
      <ChrgBr>SLEV</ChrgBr>
${txBlocks}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    const filename = `BureauVlieland_SEPA_${batchRef}_${executionDate}.xml`;
    const filePath = `${batch.id}/${filename}`;

    // Upload XML
    const { error: uploadErr } = await supabase.storage
      .from("payment-batches")
      .upload(filePath, new Blob([xml], { type: "application/xml" }), {
        contentType: "application/xml",
        upsert: true,
      });
    if (uploadErr) {
      console.error("Upload error:", uploadErr);
    } else {
      await supabase.from("payment_batches").update({ xml_file_path: filePath }).eq("id", batch.id);
    }

    // Link invoices to batch
    const { error: linkErr } = await supabase
      .from("partner_purchase_invoices")
      .update({ payment_batch_id: batch.id })
      .in("id", invoiceIds);
    if (linkErr) {
      console.error("Link error:", linkErr);
    }

    const xmlBase64 = btoa(unescape(encodeURIComponent(xml)));

    return new Response(
      JSON.stringify({
        success: true,
        batchId: batch.id,
        batchReference: batchRef,
        filename,
        xmlBase64,
        totalAmount,
        transactionCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-payment-batch error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
