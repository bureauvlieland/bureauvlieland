/**
 * Gebeurtenissen van buiten voor het bureau.
 *
 * Een partner die reageert, een klant die akkoord geeft of tekent: dat zijn
 * meldingen die Erwin moet zien, geen taken die de reconciler mag opruimen
 * (docs/plan-notificaties.md, §4 punt 1 en 2). Deze helper doet voor elk van
 * die momenten hetzelfde:
 *
 *  1. een Werkbank-taak in het cluster "Binnengekomen" (één open taak per
 *     gebeurtenis en onderdeel; een nieuwe reactie op hetzelfde onderdeel
 *     werkt de bestaande taak bij), die blijft staan tot Erwin hem als
 *     gezien afvinkt of tot hij na zeven dagen vervalt;
 *  2. optioneel een korte bureau-mail naar het instelbare bureauadres
 *     (`bureau_admin_email`), met idempotency-sleutel zodat dezelfde
 *     gebeurtenis niet twee keer mailt.
 *
 * Het bureauadres komt uit één bron (`resolveBureauAddress`), zodat een
 * wijziging van de instelling alle meldingen tegelijk verplaatst. Model:
 * lodging-bureau-alert.ts. Faalt nooit hard: de aanroepende function mag door
 * een melding nooit de eigenlijke afhandeling verliezen.
 */
import { sendMailjet } from "./mailjet-send.ts";
import { logEmail } from "./email-logger.ts";
import {
  sanitizeHtml,
  formatCurrencyNL,
  getBureauAdminEmail,
  getRecipientEmail,
  getSubjectPrefix,
  getPortalBaseUrl,
} from "./email-templates.ts";
import { GENERAL_CONTACT_EMAIL } from "./bureau-contact.ts";

export type BureauEventKind =
  | "partner_item_confirmed"
  | "partner_item_unavailable"
  | "partner_item_alternative"
  | "partner_item_executed"
  | "customer_quote_accepted"
  | "customer_terms_signed";

/** Na zoveel dagen vervalt een niet-geziene melding (reconcile-admin-todos). */
export const BUREAU_EVENT_TTL_DAYS = 7;

/**
 * Werkbank-taaktype per gebeurtenis. De sleutels staan hier letterlijk als
 * `auto_type: "…"` zodat reconcileTodosContract.test.ts ze als aanmaakplek
 * herkent.
 */
const TODO_TYPE: Record<BureauEventKind, { auto_type: string }> = {
  partner_item_confirmed: { auto_type: "partner_status_update" },
  partner_item_unavailable: { auto_type: "partner_status_update" },
  partner_item_alternative: { auto_type: "partner_status_update" },
  partner_item_executed: { auto_type: "partner_item_executed" },
  customer_quote_accepted: { auto_type: "customer_quote_accepted" },
  customer_terms_signed: { auto_type: "customer_terms_signed" },
};

/** Alle taaktypen die deze helper aanmaakt; reconcile sluit ze na de TTL. */
export const BUREAU_EVENT_AUTO_TYPES: ReadonlySet<string> = new Set(
  Object.values(TODO_TYPE).map((t) => t.auto_type),
);

/** Mailtype per gebeurtenis; `null` = alleen een taak, geen mail. */
const EMAIL_TYPE: Record<BureauEventKind, string | null> = {
  partner_item_confirmed: "partner_item_response_bureau",
  partner_item_unavailable: "partner_item_response_bureau",
  partner_item_alternative: "partner_item_response_bureau",
  partner_item_executed: null,
  customer_quote_accepted: "quote_accepted_bureau",
  customer_terms_signed: "terms_signed_bureau",
};

export interface BureauEventInput {
  kind: BureauEventKind;
  /** Onderdeel-id bij partnerreacties, project-id bij klantacties. */
  entityId: string;
  request: {
    id: string;
    reference_number?: string | null;
    customer_name: string;
    customer_company?: string | null;
  };
  partner?: { id: string; name: string } | null;
  /** Naam van het onderdeel (partnerreacties). */
  itemName?: string | null;
  /** Prijsopgave van de partner, excl. btw. */
  quotedPrice?: number | null;
  /** Opmerking van partner of klant. */
  note?: string | null;
  /** Voorgestelde tijd/datum bij een alternatief. */
  proposedTime?: string | null;
  proposedDate?: string | null;
  /** Klant tekende onder voorbehoud van deze onderdelen. */
  reservationNames?: string | null;
  /** Origin van de aanroepende client (voor test-mode rerouting). */
  origin?: string;
  /** Versie-marker: een nieuwe reactie op hetzelfde onderdeel mag opnieuw mailen. */
  versionKey?: string | number | null;
}

export interface BureauEventTodo {
  auto_type: string;
  auto_entity_id: string;
  title: string;
  description: string;
  priority: "normal" | "high";
  related_request_id: string;
  related_partner_id: string | null;
}

export interface BureauEventMail {
  email_type: string;
  subject: string;
  heading: string;
  actionLine: string;
  rows: Array<[string, string]>;
}

function customerLabel(input: BureauEventInput): string {
  return input.request.customer_company || input.request.customer_name;
}

function ref(input: BureauEventInput): string {
  return input.request.reference_number ? ` (${input.request.reference_number})` : "";
}

const PARTNER_STATUS_LABEL: Partial<Record<BureauEventKind, string>> = {
  partner_item_confirmed: "bevestigd",
  partner_item_unavailable: "niet beschikbaar",
  partner_item_alternative: "alternatief voorgesteld",
};

/** Titel en omschrijving van de Werkbank-taak; zuiver, getest. */
export function buildBureauEventTodo(input: BureauEventInput): BureauEventTodo {
  const customer = customerLabel(input);
  const partnerName = input.partner?.name ?? "Partner";
  const item = input.itemName ?? "onderdeel";
  const price = typeof input.quotedPrice === "number" ? ` Prijs: ${formatCurrencyNL(input.quotedPrice)}.` : "";
  const note = input.note ? ` Opmerking: ${input.note}` : "";
  const base = {
    auto_type: TODO_TYPE[input.kind].auto_type,
    auto_entity_id: input.entityId,
    related_request_id: input.request.id,
    related_partner_id: input.partner?.id ?? null,
  };

  switch (input.kind) {
    case "partner_item_confirmed":
    case "partner_item_unavailable":
    case "partner_item_alternative": {
      const label = PARTNER_STATUS_LABEL[input.kind]!;
      const proposed = input.kind === "partner_item_alternative" && (input.proposedTime || input.proposedDate)
        ? ` Voorstel: ${[input.proposedDate, input.proposedTime].filter(Boolean).join(" ")}.`
        : "";
      return {
        ...base,
        title: `Partner ${partnerName} reageert op "${item}" — ${label}`,
        description: `Partner ${partnerName} heeft "${item}" ${label} voor ${customer}${ref(input)}.${price}${proposed}${note}`,
        priority: input.kind === "partner_item_unavailable" ? "high" : "normal",
      };
    }
    case "partner_item_executed":
      return {
        ...base,
        title: `Partner ${partnerName} heeft "${item}" als uitgevoerd gemarkeerd`,
        description: `"${item}" voor ${customer}${ref(input)} is volgens ${partnerName} uitgevoerd. De factuurherinneringen aan de partner lopen vanaf nu.${note}`,
        priority: "normal",
      };
    case "customer_quote_accepted":
      return {
        ...base,
        title: `Klant ${customer} heeft akkoord gegeven op het voorstel`,
        description: `${input.request.customer_name} gaf akkoord op het programmavoorstel${ref(input)}. De onderdelen gaan nu naar de partners.${note}`,
        priority: "normal",
      };
    case "customer_terms_signed":
      return {
        ...base,
        title: `Klant ${customer} heeft getekend`,
        description: `${input.request.customer_name} heeft de voorwaarden ondertekend${ref(input)}${input.reservationNames ? `, onder voorbehoud van: ${input.reservationNames}` : ""}. De partners zijn geïnformeerd over de definitieve boeking.${note}`,
        priority: "normal",
      };
  }
}

/** Onderwerp en inhoud van de bureau-mail; `null` als dit moment geen mail krijgt. */
export function buildBureauEventMail(input: BureauEventInput): BureauEventMail | null {
  const emailType = EMAIL_TYPE[input.kind];
  if (!emailType) return null;
  const customer = customerLabel(input);
  const partnerName = input.partner?.name ?? "Partner";
  const item = input.itemName ?? "onderdeel";
  const rows: Array<[string, string]> = [];
  if (input.request.reference_number) rows.push(["Project", input.request.reference_number]);
  rows.push(["Klant", customer]);

  switch (input.kind) {
    case "partner_item_confirmed":
    case "partner_item_unavailable":
    case "partner_item_alternative": {
      const label = PARTNER_STATUS_LABEL[input.kind]!;
      rows.push(["Partner", partnerName], ["Onderdeel", item], ["Reactie", label]);
      if (typeof input.quotedPrice === "number") rows.push(["Prijs (excl. btw)", formatCurrencyNL(input.quotedPrice)]);
      if (input.proposedDate || input.proposedTime) rows.push(["Voorstel", [input.proposedDate, input.proposedTime].filter(Boolean).join(" ")]);
      if (input.note) rows.push(["Opmerking", input.note]);
      const actionLine =
        input.kind === "partner_item_confirmed"
          ? "Aan zet: niemand, tenzij de prijs afwijkt van de offerte. De klant heeft een statusmail gekregen."
          : input.kind === "partner_item_unavailable"
            ? "Aan zet: Bureau Vlieland. Zoek een alternatief en informeer de klant."
            : "Aan zet: de klant. Die heeft het voorstel per mail gekregen; houd in de gaten of er een reactie komt.";
      return {
        email_type: emailType,
        subject: `Partner ${partnerName}: "${item}" ${label}${ref(input)}`,
        heading: `Partner reageert: ${label}`,
        actionLine,
        rows,
      };
    }
    case "customer_quote_accepted":
      if (input.note) rows.push(["Opmerking", input.note]);
      return {
        email_type: emailType,
        subject: `Akkoord van ${customer} op het voorstel${ref(input)}`,
        heading: "Klant geeft akkoord op het voorstel",
        actionLine: "Aan zet: Bureau Vlieland. Stuur de onderdelen naar de partners (taak in de Werkbank).",
        rows,
      };
    case "customer_terms_signed":
      if (input.reservationNames) rows.push(["Onder voorbehoud van", input.reservationNames]);
      return {
        email_type: emailType,
        subject: `${customer} heeft getekend${ref(input)}`,
        heading: "Klant heeft de voorwaarden ondertekend",
        actionLine: "Aan zet: niemand. De partners hebben de definitieve boeking per mail gekregen; de facturatietaak verschijnt na afloop.",
        rows,
      };
    default:
      return null;
  }
}

export function bureauEventIdempotencyKey(input: BureauEventInput): string {
  return `bureau-event-${input.kind}-${input.entityId}-${input.versionKey ?? "v1"}`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0; color:#64748b; font-size:14px;">${sanitizeHtml(label)}</td>
    <td style="padding:6px 0; text-align:right; font-size:14px;"><strong>${sanitizeHtml(value)}</strong></td>
  </tr>`;
}

export function buildBureauEventHtml(mail: BureauEventMail, adminUrl: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; color:#0f172a;">
    <h2 style="color:#0F4C5C; margin-bottom:4px;">${sanitizeHtml(mail.heading)}</h2>
    <p style="margin:0 0 16px; color:#64748b; font-size:14px;">${sanitizeHtml(mail.actionLine)}</p>
    <table style="width:100%; border-collapse:collapse; background:#f8fafc; border-radius:8px; padding:8px;">
      ${mail.rows.map(([l, v]) => row(l, v)).join("")}
    </table>
    <p style="margin:24px 0;">
      <a href="${adminUrl}" style="background:#0F4C5C; color:#ffffff; padding:12px 20px; border-radius:6px; text-decoration:none; display:inline-block;">
        Open het project
      </a>
    </p>
  </div>`;
}

/**
 * Het interne meldingsadres van het bureau: de instelling `bureau_admin_email`,
 * met het algemene adres als terugval. Eén plek voor alle bureau-meldingen.
 */
// deno-lint-ignore no-explicit-any
export async function resolveBureauAddress(supabase: any): Promise<string> {
  try {
    const address = (await getBureauAdminEmail(supabase))?.trim();
    return address || GENERAL_CONTACT_EMAIL;
  } catch {
    return GENERAL_CONTACT_EMAIL;
  }
}

export interface BureauEventResult {
  todo: "created" | "updated" | "failed";
  mail: "sent" | "skipped" | "failed" | "none";
  error?: string;
}

/**
 * Legt de gebeurtenis vast (taak) en meldt hem (mail). Faalt nooit hard.
 */
// deno-lint-ignore no-explicit-any
export async function recordBureauEvent(supabase: any, input: BureauEventInput): Promise<BureauEventResult> {
  const result: BureauEventResult = { todo: "failed", mail: "none" };

  // 1. Werkbank-taak
  try {
    const todo = buildBureauEventTodo(input);
    const { data: existing } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", todo.auto_type)
      .eq("auto_entity_id", todo.auto_entity_id)
      .in("status", ["todo", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1);
    const open = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;
    if (open) {
      const { error } = await supabase
        .from("admin_todos")
        .update({
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          related_partner_id: todo.related_partner_id,
          created_at: new Date().toISOString(),
        })
        .eq("id", open.id);
      result.todo = error ? "failed" : "updated";
      if (error) result.error = error.message;
    } else {
      const { error } = await supabase.from("admin_todos").insert({ ...todo, status: "todo" });
      result.todo = error ? "failed" : "created";
      if (error) result.error = error.message;
    }
  } catch (error) {
    console.error("[bureau-event] taak mislukt:", error);
    result.error = String(error);
  }

  // 2. Bureau-mail
  const mail = buildBureauEventMail(input);
  if (!mail) return result;
  try {
    const idempotencyKey = bureauEventIdempotencyKey(input);
    const { data: already } = await supabase
      .from("email_log")
      .select("id")
      .eq("email_type", mail.email_type)
      .eq("status", "sent")
      .eq("idempotency_key", idempotencyKey)
      .limit(1);
    if (Array.isArray(already) && already.length > 0) {
      result.mail = "skipped";
      return result;
    }

    const address = await resolveBureauAddress(supabase);
    const recipient = getRecipientEmail(address, input.origin);
    const subject = `${getSubjectPrefix(input.origin)}${mail.subject}`;
    const adminUrl = `${getPortalBaseUrl(input.origin)}/admin/aanvragen/${input.request.id}`;
    const html = buildBureauEventHtml(mail, adminUrl);

    const sent = await sendMailjet({
      source: "bureau-event",
      checkSuppression: false,
      messages: [
        {
          From: { Email: GENERAL_CONTACT_EMAIL, Name: "Bureau Vlieland" },
          To: [{ Email: recipient, Name: "Bureau Vlieland" }],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });

    await logEmail({
      email_type: mail.email_type,
      subject,
      recipient_email: recipient,
      recipient_name: "Bureau Vlieland",
      related_request_id: input.request.id,
      related_partner_id: input.partner?.id ?? undefined,
      related_item_id: input.entityId !== input.request.id ? input.entityId : undefined,
      status: sent.ok ? "sent" : "failed",
      error_message: sent.ok ? undefined : sent.error,
      mailjet_message_id: sent.ok ? (sent.messageId ?? undefined) : undefined,
      sent_by: "system",
      html_body: html,
      from_email: GENERAL_CONTACT_EMAIL,
      idempotency_key: idempotencyKey,
      metadata: {
        template_name: mail.email_type,
        actor: `system → bureau (${input.kind})`,
        idempotency_key: idempotencyKey,
        ...(sent.ok ? {} : { failure: true }),
      },
    });
    result.mail = sent.ok ? "sent" : "failed";
    if (!sent.ok) result.error = sent.error;
  } catch (error) {
    console.error("[bureau-event] mail mislukt:", error);
    result.mail = "failed";
    result.error = String(error);
  }
  return result;
}
