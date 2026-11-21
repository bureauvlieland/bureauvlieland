// Antwoord van een partner op een commissiefactuur.
//
// De commissiefactuur gaat uit met Reply-To `reply+BVC-JJMM-NNNN@…`. Een
// commissiefactuur hangt niet aan één project (geen request_id), dus zo'n
// antwoord past niet in project_communications. We maken daarom een
// Werkbank-taak met afzender, onderwerp en het begin van de tekst, gekoppeld
// aan de partner, zodat het antwoord bij het bureau landt en niet verdwijnt.

export const COMMISSION_REPLY_AUTO_TYPE = "commission_invoice_reply";
export const COMMISSION_REPLY_EXCERPT_LENGTH = 500;

/** Factuurnummer van een commissiefactuur: BVC-JJMM-NNNN. */
export function isCommissionInvoiceReference(referenceNumber: string | null | undefined): boolean {
  return /^BVC-\d{4}-\d{4}$/.test(referenceNumber ?? "");
}

export interface CommissionReplyInput {
  invoiceNumber: string;
  invoiceId: string;
  partnerId: string;
  partnerName: string | null;
  senderName: string | null;
  senderEmail: string | null;
  subject: string | null;
  content: string;
  attachmentNames?: string[];
}

export interface CommissionReplyTodo {
  title: string;
  description: string;
  priority: "normal";
  status: "todo";
  auto_type: typeof COMMISSION_REPLY_AUTO_TYPE;
  auto_entity_id: string;
  related_partner_id: string;
}

/** Bouwt de Werkbank-taak voor een antwoord op een commissiefactuur (puur, los testbaar). */
export function buildCommissionReplyTodo(input: CommissionReplyInput): CommissionReplyTodo {
  const partner = input.partnerName || "onbekende partner";
  const sender = [input.senderName, input.senderEmail].filter(Boolean).join(" <") +
    (input.senderName && input.senderEmail ? ">" : "");
  const excerpt = input.content.length > COMMISSION_REPLY_EXCERPT_LENGTH
    ? input.content.substring(0, COMMISSION_REPLY_EXCERPT_LENGTH) + "…"
    : input.content;

  const lines = [
    `Afzender: ${sender || "onbekend"}`,
    `Onderwerp: ${input.subject || "(geen onderwerp)"}`,
    "",
    excerpt || "(geen inhoud)",
  ];
  if (input.attachmentNames && input.attachmentNames.length > 0) {
    lines.push("", `Bijlagen: ${input.attachmentNames.join(", ")}`);
  }
  lines.push("", `Bekijk de factuur onder Commissiefacturen en reageer naar de partner.`);

  return {
    title: `Antwoord op commissiefactuur ${input.invoiceNumber} van ${partner}`.substring(0, 200),
    description: lines.join("\n"),
    priority: "normal",
    status: "todo",
    auto_type: COMMISSION_REPLY_AUTO_TYPE,
    auto_entity_id: input.invoiceId,
    related_partner_id: input.partnerId,
  };
}

export interface CommissionInvoiceRow {
  id: string;
  invoice_number: string | null;
  partner_id: string;
  partner?: { name?: string | null } | { name?: string | null }[] | null;
}

/**
 * Zoekt de commissiefactuur op nummer en legt een Werkbank-taak aan.
 * Geeft null terug als de factuur niet bestaat (de aanroeper valt dan terug
 * op zijn bestaande "project_not_found"-afhandeling).
 */
export async function routeCommissionInvoiceReply(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  input: Omit<CommissionReplyInput, "invoiceId" | "partnerId" | "partnerName">,
): Promise<{ invoiceId: string; partnerId: string; todo: CommissionReplyTodo } | null> {
  const { data: invoice, error } = await supabase
    .from("commission_invoices")
    .select("id, invoice_number, partner_id, partner:partners(name)")
    .eq("invoice_number", input.invoiceNumber)
    .maybeSingle();
  if (error) throw error;
  if (!invoice) return null;

  const inv = invoice as CommissionInvoiceRow;
  const partnerRel = Array.isArray(inv.partner) ? inv.partner[0] : inv.partner;
  const todo = buildCommissionReplyTodo({
    ...input,
    invoiceId: inv.id,
    partnerId: inv.partner_id,
    partnerName: partnerRel?.name ?? null,
  });

  const { error: insErr } = await supabase.from("admin_todos").insert(todo);
  if (insErr) throw insErr;

  return { invoiceId: inv.id, partnerId: inv.partner_id, todo };
}
