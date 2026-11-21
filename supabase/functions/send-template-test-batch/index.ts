// send-template-test-batch
//
// Stuurt alle e-mails als test naar het bureau, in batches: elke template uit
// `email_templates` gerenderd met voorbeeldgegevens, plus de mails die uit een
// opbouwfunctie komen (zie samples.ts). Alleen voor een ingelogde admin.
//
// Body: { batch?: number, size?: number, dryRun?: boolean }
//  - dryRun (standaard true): alleen de lijst teruggeven, niets versturen.
//  - batch 1..N, size (standaard 10): welke mails te versturen.
// De ontvanger staat vast op het testadres (TEST_EMAIL in email-templates.ts);
// een ander adres is niet mogelijk. Gelogd als email_type `template_test`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { wrapEmailHtml } from "../_shared/email-templates.ts";
import { GENERAL_CONTACT_EMAIL } from "../_shared/bureau-contact.ts";
import {
  buildGeneratedTestMails,
  renderTemplateForTest,
  sliceBatch,
  type TestBatchItem,
} from "./samples.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_TYPE = "template_test";
const TEST_RECIPIENT = "erwin@bureauvlieland.nl";
const DEFAULT_SIZE = 10;
const PAUSE_MS = 1500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Niet ingelogd" }, 401);

  // Alleen een admin mag dit starten.
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Ongeldige sessie" }, 401);
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleRow?.role !== "admin") return json({ error: "Alleen voor beheerders" }, 403);

  try {
    const body = await req.json().catch(() => ({})) as { batch?: number; size?: number; dryRun?: boolean };
    const dryRun = body.dryRun !== false;
    const size = Math.min(25, Math.max(1, Number(body.size) || DEFAULT_SIZE));
    const batch = Math.max(1, Number(body.batch) || 1);

    const { data: templates, error } = await supabase
      .from("email_templates")
      .select("id, name, subject, body_html")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(`templates ophalen: ${error.message}`);

    const rendered = ((templates ?? []) as Array<{ id: string; name: string; subject: string; body_html: string }>)
      .map(renderTemplateForTest);
    const generated = buildGeneratedTestMails();

    const all: Array<TestBatchItem & { subject: string; html: string; unknownVariables?: string[] }> = [
      ...rendered.map((r, i) => ({ index: i + 1, kind: "template" as const, id: r.id, name: r.name, subject: r.subject, html: r.html, unknownVariables: r.unknownVariables })),
      ...generated.map((g, i) => ({ index: rendered.length + i + 1, kind: "generated" as const, id: g.id, name: g.name, subject: g.subject, html: g.html })),
    ];
    const { items, batches } = sliceBatch(all, batch, size);
    const total = all.length;

    if (dryRun) {
      return json({
        ok: true,
        dryRun: true,
        total,
        batches,
        size,
        recipient: TEST_RECIPIENT,
        items: all.map((m) => ({ index: m.index, kind: m.kind, id: m.id, name: m.name, subject: m.subject, unknownVariables: m.unknownVariables ?? [] })),
      });
    }

    const results: Array<{ index: number; id: string; status: string; error?: string }> = [];
    for (const m of items) {
      const subject = `[TEST ${m.index}/${total}] ${m.name} — ${m.subject}`;
      const note = `<p style="margin:0 0 16px; padding:10px 14px; background:#fef3c7; border-left:3px solid #d97706; font-size:13px; color:#78350f;">Testmail ${m.index} van ${total}: <strong>${m.name}</strong> (${m.kind === "template" ? `template ${m.id}` : `opbouwfunctie ${m.id}`}). Voorbeeldgegevens, dossier ${"BV-2611-TEST"}.${m.unknownVariables?.length ? ` Zonder voorbeeldwaarde: ${m.unknownVariables.join(", ")}.` : ""}</p>`;
      const html = await wrapEmailHtml(note + m.html, supabase);
      const sent = await sendMailjet({
        source: "send-template-test-batch",
        checkSuppression: false,
        messages: [{
          From: { Email: GENERAL_CONTACT_EMAIL, Name: "Bureau Vlieland" },
          To: [{ Email: TEST_RECIPIENT, Name: "Bureau Vlieland (test)" }],
          Subject: subject,
          HTMLPart: html,
          TrackOpens: "disabled",
          TrackClicks: "disabled",
        }],
      });
      await logEmail({
        email_type: EMAIL_TYPE,
        subject,
        recipient_email: TEST_RECIPIENT,
        recipient_name: "Bureau Vlieland (test)",
        status: sent.ok ? "sent" : "failed",
        error_message: sent.ok ? undefined : sent.error,
        mailjet_message_id: sent.ok ? (sent.messageId ?? undefined) : undefined,
        sent_by: `admin:${user.id}`,
        html_body: html,
        from_email: GENERAL_CONTACT_EMAIL,
        metadata: { template_name: m.id, actor: "admin → bureau (testbatch)", test_index: m.index, test_total: total, kind: m.kind },
      });
      results.push({ index: m.index, id: m.id, status: sent.ok ? "sent" : "failed", error: sent.ok ? undefined : sent.error });
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }

    return json({ ok: results.every((r) => r.status === "sent"), batch, batches, size, total, recipient: TEST_RECIPIENT, results });
  } catch (error) {
    console.error("send-template-test-batch mislukt:", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});
