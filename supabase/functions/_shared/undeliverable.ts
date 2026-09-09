// Melding in de Werkbank als een e-mail niet bezorgd kan worden: het adres
// staat op de suppressielijst (bij ons) of Mailjet heeft de mail geblokkeerd,
// gebounced of als spam gemeld. Zonder deze taak verdwijnt zo'n mail stil.
// deno-lint-ignore-file no-explicit-any

export const UNDELIVERABLE_TODO_TYPE = "email_undeliverable";

export const REASON_LABEL: Record<string, string> = {
  blocked: "geblokkeerd door Mailjet",
  bounce: "hard bounce (adres bestaat niet of weigert)",
  bounced: "hard bounce (adres bestaat niet of weigert)",
  spam: "als spam gemeld",
  unsub: "afgemeld",
  suppressed: "staat op onze suppressielijst",
  manual: "handmatig op de suppressielijst gezet",
};

export function reasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason;
}

export function undeliverableTodoText(input: {
  email: string;
  reason: string;
  subject?: string | null;
  detail?: string | null;
}): { title: string; description: string } {
  const label = reasonLabel(input.reason);
  const lines = [
    `Een e-mail naar ${input.email} is niet bezorgd: ${label}.`,
    input.subject ? `Onderwerp: ${input.subject}` : null,
    input.detail ? `Mailjet: ${input.detail}` : null,
    "",
    "Wat te doen:",
    "1. Controleer met de ontvanger of het adres klopt en of onze mail in de spam zit.",
    "2. Staat het adres bij Mailjet op geblokkeerd? Vraag Mailjet-support het vrij te geven (Contacts → Statistics → geblokkeerde mail, of het chat-icoon).",
    "3. Haal het adres van onze suppressielijst: Admin → Email health → Suppressies. Daarna gaat onze mail weer naar dit adres.",
    "4. Verstuur de mail opnieuw vanuit het dossier.",
  ].filter((l) => l !== null) as string[];
  return {
    title: `E-mail niet afgeleverd: ${input.email}`,
    description: lines.join("\n"),
  };
}

/**
 * Zet (of ververst) één open Werkbank-taak per e-mailadres. Zonder request-
 * context wordt het laatste dossier waar we dit adres voor mailden gebruikt.
 */
export async function noteUndeliverableEmail(
  supabase: any,
  input: {
    email: string;
    reason: string;
    subject?: string | null;
    detail?: string | null;
    relatedRequestId?: string | null;
    relatedPartnerId?: string | null;
  },
): Promise<void> {
  try {
    const email = input.email.trim().toLowerCase();
    if (!email) return;
    let relatedRequestId = input.relatedRequestId ?? null;
    let relatedPartnerId = input.relatedPartnerId ?? null;
    let subject = input.subject ?? null;
    if (!relatedRequestId && !relatedPartnerId) {
      const { data: last } = await supabase
        .from("email_log")
        .select("related_request_id, related_partner_id, subject")
        .ilike("recipient_email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      relatedRequestId = last?.related_request_id ?? null;
      relatedPartnerId = last?.related_partner_id ?? null;
      subject = subject ?? last?.subject ?? null;
    }
    const { title, description } = undeliverableTodoText({ email, reason: input.reason, subject, detail: input.detail });
    const { data: existing } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", UNDELIVERABLE_TODO_TYPE)
      .eq("auto_entity_id", email)
      .not("status", "in", "(done,dismissed)")
      .maybeSingle();
    if (existing) {
      await supabase
        .from("admin_todos")
        .update({ title, description, priority: "high", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("admin_todos").insert({
        auto_type: UNDELIVERABLE_TODO_TYPE,
        auto_entity_id: email,
        related_request_id: relatedRequestId,
        related_partner_id: relatedPartnerId,
        priority: "high",
        status: "todo",
        title,
        description,
      });
    }
  } catch (err) {
    console.error("[undeliverable] taak aanmaken mislukt:", err);
  }
}
