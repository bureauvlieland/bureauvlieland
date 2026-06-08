// Catering request notification — sends customer confirmation + internal notice
import { z } from "npm:zod@3.22.4";
import { sanitizeHtml, isTestMode, getSubjectPrefix, SENDER_EMAIL, SENDER_NAME } from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
const INTERNAL_RECIPIENT = "erwin@bureauvlieland.nl";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limit
const rl = new Map<string, number[]>();
const isRateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (rl.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) return true;
  recent.push(now);
  rl.set(ip, recent);
  return false;
};

const ItemSchema = z.object({
  name: z.string(),
  role: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  priceIndication: z.string().nullable().optional(),
});

const PayloadSchema = z.object({
  requestId: z.string().uuid(),
  referenceNumber: z.string().nullable().optional(),
  customerToken: z.string().min(8).max(64).optional(),
  cateringType: z.string().min(1).max(40),
  date: z.string().min(4).max(40),
  startTime: z.string().nullable().optional(),
  locationText: z.string().min(1).max(300),
  hasHorecaOnSite: z.boolean().nullable().optional(),
  guests: z.number().int().min(1).max(2000),
  contact: z.object({
    name: z.string().trim().min(2).max(100),
    company: z.string().max(150).optional().or(z.literal("")),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(6).max(40),
    notes: z.string().max(2000).optional().or(z.literal("")),
    dietary: z.string().max(2000).optional().or(z.literal("")),
  }),
  items: z.array(ItemSchema).max(50),
  indicativeTotal: z.number().nullable().optional(),
  origin: z.string().optional(),
});

const sendMailjet = async (messages: any[]) => {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) throw new Error("MAILJET_NOT_CONFIGURED");
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  const r = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ Messages: messages }),
  });
  if (!r.ok) {
    console.error("Mailjet error", await r.text());
    throw new Error("EMAIL_SERVICE_ERROR");
  }
  return r.json();
};

const fmtEur = (n: number | null | undefined) =>
  typeof n === "number" ? `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Op aanvraag";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Te veel verzoeken." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const raw = await req.json();
    const parsed = PayloadSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("Validation failed", parsed.error.errors);
      return new Response(JSON.stringify({ error: "Validatiefout", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const p = parsed.data;
    const testMode = isTestMode(p.origin);
    const prefix = getSubjectPrefix(p.origin);

    const safe = {
      name: sanitizeHtml(p.contact.name),
      company: sanitizeHtml(p.contact.company || ""),
      email: sanitizeHtml(p.contact.email),
      phone: sanitizeHtml(p.contact.phone),
      notes: sanitizeHtml(p.contact.notes || ""),
      dietary: sanitizeHtml(p.contact.dietary || ""),
      type: sanitizeHtml(p.cateringType),
      date: sanitizeHtml(p.date),
      startTime: sanitizeHtml(p.startTime || ""),
      location: sanitizeHtml(p.locationText),
      ref: sanitizeHtml(p.referenceNumber || ""),
    };

    const horeca = p.hasHorecaOnSite === true ? "Ja" : p.hasHorecaOnSite === false ? "Nee" : "Onbekend";

    const itemsHtml = p.items.length
      ? `<ul style="padding-left:18px;margin:8px 0;">${p.items
          .map(
            (i) => `<li style="margin-bottom:6px;">
              <strong>${sanitizeHtml(i.name)}</strong>${i.role ? ` <span style="color:#666;font-size:12px;">(${sanitizeHtml(i.role)})</span>` : ""}
              ${i.provider ? `<br><span style="color:#666;font-size:12px;">${sanitizeHtml(i.provider)}</span>` : ""}
              ${i.priceIndication ? `<br><span style="color:#666;font-size:12px;">${sanitizeHtml(i.priceIndication)}</span>` : ""}
            </li>`,
          )
          .join("")}</ul>`
      : `<p style="color:#666;">Maatwerk — invulling volgt in afstemming.</p>`;

    const indicative = fmtEur(p.indicativeTotal ?? null);

    // CUSTOMER (formal "u")
    const customerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#111;">
        <h2 style="color:#1a365d;margin-bottom:8px;">Beste ${safe.name},</h2>
        <p>Hartelijk dank voor uw catering-aanvraag bij Bureau Vlieland. Wij hebben uw aanvraag in goede orde ontvangen en nemen binnen <strong>2 werkdagen</strong> contact met u op met een definitieve offerte.</p>

        <h3 style="color:#1a365d;margin-top:24px;">Uw aanvraag</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#555;width:160px;">Type</td><td style="padding:6px 0;"><strong>${safe.type}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#555;">Datum</td><td style="padding:6px 0;">${safe.date}${safe.startTime ? ` om ${safe.startTime}` : ""}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Aantal gasten</td><td style="padding:6px 0;">${p.guests}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Locatie</td><td style="padding:6px 0;">${safe.location}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Horeca op locatie</td><td style="padding:6px 0;">${horeca}</td></tr>
          ${safe.ref ? `<tr><td style="padding:6px 0;color:#555;">Referentie</td><td style="padding:6px 0;">${safe.ref}</td></tr>` : ""}
        </table>

        <h3 style="color:#1a365d;margin-top:24px;">Samenstelling</h3>
        ${itemsHtml}

        <p style="background:#f7fafc;padding:12px 14px;border-left:3px solid #1a365d;margin-top:16px;">
          <strong>Indicatieve prijs:</strong> ${indicative} (incl. BTW)<br>
          <span style="font-size:12px;color:#555;">Drank is altijd een p.m.-post en wordt na afloop op nacalculatie verrekend. Definitieve prijs altijd in offerte.</span>
        </p>

        ${safe.dietary ? `<h3 style="color:#1a365d;margin-top:24px;">Dieetwensen</h3><p>${safe.dietary.replace(/\n/g, "<br>")}</p>` : ""}
        ${safe.notes ? `<h3 style="color:#1a365d;margin-top:24px;">Uw opmerkingen</h3><p>${safe.notes.replace(/\n/g, "<br>")}</p>` : ""}

        <p style="margin-top:24px;">Heeft u nog vragen? Beantwoord deze e-mail of bel ons op <strong>0562 700 208</strong>.</p>
        <p>Met vriendelijke groet,<br><strong>Erwin & Team Bureau Vlieland</strong></p>
      </div>
    `;

    // INTERNAL
    const internalHtml = `
      <div style="font-family:Arial,sans-serif;max-width:680px;">
        <h2 style="color:#1a365d;">Nieuwe catering-aanvraag${safe.ref ? ` — ${safe.ref}` : ""}</h2>
        <h3>Klant</h3>
        <p>
          <strong>${safe.name}</strong>${safe.company ? ` — ${safe.company}` : ""}<br>
          ${safe.email} · ${safe.phone}
        </p>
        <h3>Catering</h3>
        <ul>
          <li><strong>Type:</strong> ${safe.type}</li>
          <li><strong>Datum:</strong> ${safe.date}${safe.startTime ? ` om ${safe.startTime}` : ""}</li>
          <li><strong>Gasten:</strong> ${p.guests}</li>
          <li><strong>Locatie:</strong> ${safe.location}</li>
          <li><strong>Horeca op locatie:</strong> ${horeca}</li>
          <li><strong>Indicatieve prijs (incl. BTW):</strong> ${indicative}</li>
        </ul>
        <h3>Samenstelling</h3>
        ${itemsHtml}
        ${safe.dietary ? `<h3>Dieet</h3><p>${safe.dietary.replace(/\n/g, "<br>")}</p>` : ""}
        ${safe.notes ? `<h3>Opmerkingen klant</h3><p>${safe.notes.replace(/\n/g, "<br>")}</p>` : ""}
        <p style="margin-top:16px;"><a href="https://bureauvlieland.nl/admin/projecten" style="color:#1a365d;">→ Open in admin</a></p>
      </div>
    `;

    const customerRecipient = testMode ? INTERNAL_RECIPIENT : p.contact.email;

    await sendMailjet([
      {
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        To: [{ Email: customerRecipient, Name: p.contact.name }],
        Subject: `${prefix}Bevestiging catering-aanvraag — Bureau Vlieland`,
        HTMLPart: customerHtml,
      },
      {
        From: { Email: SENDER_EMAIL, Name: "Bureau Vlieland Website" },
        To: [{ Email: INTERNAL_RECIPIENT, Name: "Erwin Soolsma" }],
        Subject: `${prefix}Nieuwe catering-aanvraag — ${safe.type} · ${p.guests}p · ${safe.date}`,
        HTMLPart: internalHtml,
      },
    ]);

    console.log(`Catering request emails sent for ${p.contact.email} (test=${testMode})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("send-catering-request error", e);
    return new Response(JSON.stringify({ error: e.message || "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
