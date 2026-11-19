/**
 * Verloop van een project in het partnerportaal: de vertaling van een
 * historieregel naar "wanneer, wie, wat". De filter (welke regels de partner
 * ziet) staat in supabase/functions/_shared/partnerProjectLog.ts; hier staan
 * de labels in de woorden van de partner (u-vorm, klant/Bureau Vlieland/u).
 */
export * from "../../supabase/functions/_shared/partnerProjectLog";
import { isSentenceAction } from "../../supabase/functions/_shared/partnerProjectLog";
import { formatTimeHHmm } from "@/lib/timeUtils";

export interface PartnerLogEntry {
  id: string;
  item_id: string | null;
  item_name: string | null;
  action: string;
  actor: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/** Het verloop van één project, op het partnertoken (get-partner-project-log). */
export async function fetchPartnerProjectLog(token: string, requestId: string): Promise<PartnerLogEntry[]> {
  const response = await fetch(`${FUNCTIONS_URL}/get-partner-project-log?token=${encodeURIComponent(token)}&requestId=${encodeURIComponent(requestId)}`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!response.ok) throw new Error(`Kon het verloop niet laden (${response.status})`);
  const body = (await response.json()) as { entries?: PartnerLogEntry[] };
  return body.entries ?? [];
}

export type PartnerLogActor = "klant" | "bureau" | "u" | "systeem";

export const logActor = (actor: string): PartnerLogActor => {
  if (actor === "customer") return "klant";
  if (actor === "partner") return "u";
  if (actor === "system") return "systeem";
  return "bureau";
};

export const actorLabel: Record<PartnerLogActor, string> = {
  klant: "Klant",
  bureau: "Bureau Vlieland",
  u: "U",
  systeem: "Automatisch",
};

const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v));
const euro = (v: unknown): string | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
};
const time = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  return s.toLowerCase() === "flexibel" ? "flexibel" : (formatTimeHHmm(s) ?? s);
};
const valueOf = (o: Record<string, unknown> | null, key = "value"): unknown => (o ? o[key] : undefined);

const partnerStatusLabel: Record<string, string> = {
  confirmed: "bevestigd",
  alternative: "een alternatief voorgesteld",
  unavailable: "niet beschikbaar gemeld",
  executed: "gemarkeerd als uitgevoerd",
  accepted: "akkoord",
  cancelled: "geannuleerd",
  pending: "opnieuw open gezet",
};

/**
 * Eén regel tekst per gebeurtenis. Het onderdeel wordt apart getoond, dus de
 * tekst noemt het niet nog eens. `null` betekent: niets tonen.
 */
export function describeLogEntry(e: PartnerLogEntry): string {
  const nv = e.new_value;
  const ov = e.old_value;
  switch (e.action) {
    case "created":
      return "Aanvraag ingediend";
    case "admin_sent_to_partners":
    case "admin_sent_to_partners_without_terms":
      return "Aanvraag naar u verstuurd";
    case "quote_accepted":
      return "Klant heeft de offerte geaccepteerd";
    case "terms_accepted":
      return "Klant heeft de voorwaarden getekend";
    case "reopened":
      return "Project heropend";
    case "cancelled":
    case "customer_cancelled":
      return e.item_id ? "Onderdeel geannuleerd" : "Project geannuleerd";
    case "removed":
      return "Onderdeel uit het programma gehaald";
    case "added":
    case "item_added":
      return "Onderdeel toegevoegd";
    case "dates_changed": {
      const from = Array.isArray(valueOf(ov, "dates")) ? (valueOf(ov, "dates") as unknown[]).join(", ") : null;
      const to = Array.isArray(valueOf(nv, "dates")) ? (valueOf(nv, "dates") as unknown[]).join(", ") : null;
      return from && to ? `Data gewijzigd: ${from} → ${to}` : "Data van het programma gewijzigd";
    }
    case "people_changed": {
      const from = str(valueOf(ov, "people")) ?? str(valueOf(ov));
      const to = str(valueOf(nv, "people")) ?? str(valueOf(nv));
      return from && to ? `Aantal personen: ${from} → ${to}` : "Aantal personen gewijzigd";
    }
    case "time_changed": {
      const from = time(valueOf(ov)) ?? "flexibel";
      const to = time(valueOf(nv)) ?? "flexibel";
      return `Tijd gewijzigd: ${from} → ${to}`;
    }
    case "day_changed": {
      const from = str(valueOf(ov));
      const to = str(valueOf(nv));
      return from && to ? `Dag gewijzigd: ${from.toLowerCase()} → ${to.toLowerCase()}` : "Dag gewijzigd";
    }
    case "notes_changed": {
      const to = str(valueOf(nv));
      return to && to !== "(geen)" ? `Wens van de klant aangepast: "${to}"` : "Wens van de klant verwijderd";
    }
    case "counter_proposed": {
      const t = time(nv?.customer_counter_time);
      return t ? `Klant stelt een andere tijd voor: ${t}` : "Klant stelt een andere tijd voor";
    }
    case "customer_accepted":
    case "item_approved":
      return "Klant akkoord met dit onderdeel";
    case "admin_changed_price": {
      const p = euro(nv?.admin_price_override);
      return p ? `Bureau Vlieland stelt een nieuwe prijs voor: ${p}` : "Bureau Vlieland heeft de prijs aangepast";
    }
    case "price_change_acknowledged":
      return "U bent akkoord gegaan met de nieuwe prijs";
    case "status_changed": {
      const status = str(nv?.status);
      const label = status ? partnerStatusLabel[status] ?? status : "gewijzigd";
      const price = euro(nv?.quoted_price);
      const note = str(nv?.status_note);
      const parts = [`U hebt ${label}`];
      if (price && status !== "executed") parts.push(`voor ${price}`);
      const base = parts.join(" ");
      return note ? `${base}: "${note}"` : base;
    }
    case "bureau_published_time":
      return `Bureau Vlieland heeft de tijd aangepast: ${time(valueOf(ov)) ?? "flexibel"} → ${time(valueOf(nv)) ?? "flexibel"}`;
    case "bureau_published_day": {
      const d = (v: unknown) => (typeof v === "number" ? `dag ${v + 1}` : (str(v) ?? "?"));
      return `Bureau Vlieland heeft de dag aangepast: ${d(valueOf(ov))} → ${d(valueOf(nv))}`;
    }
    case "bureau_published_people":
      return `Bureau Vlieland heeft het aantal aangepast: ${str(valueOf(ov)) ?? "groepstotaal"} → ${str(valueOf(nv)) ?? "groepstotaal"}`;
    case "bureau_published_notes":
      return "Bureau Vlieland heeft de wens van de klant aangepast";
    case "bureau_published_price": {
      const p = euro(valueOf(nv));
      return p ? `Bureau Vlieland heeft de prijs aangepast: ${p}` : "Bureau Vlieland heeft de prijs aangepast";
    }
    case "bureau_published_location":
      return "Bureau Vlieland heeft de locatie aangepast";
    case "bureau_published_name":
      return `Bureau Vlieland heeft de naam aangepast: ${str(valueOf(nv)) ?? ""}`.trim();
    case "price_recalculated": {
      const p = euro(nv?.quoted_price);
      const n = str(nv?.people);
      return `Prijs herberekend op het nieuwe aantal${n ? ` (${n} pers.)` : ""}${p ? `: ${p}` : ""}`;
    }
    case "partner_dismissed":
      return "U hebt dit onderdeel gesloten zonder factuur";
    case "auto_closed":
      return str(nv?.status) === "executed" ? "Automatisch op uitgevoerd gezet na afloop" : "Automatisch afgerond na afloop";
    case "purchase_invoice_registered":
      return "Factuur geregistreerd";
    case "purchase_invoice_deleted":
      return "Factuur verwijderd";
    default:
      // Zinnen uit override-item-status, auto-close en facturatie-vrijgave.
      if (e.action.startsWith("Admin override:")) {
        const status = str(nv?.status) ?? e.action.match(/handmatig op (\w+)$/)?.[1] ?? null;
        return `Bureau Vlieland heeft de status handmatig op "${status ? partnerStatusLabel[status] ?? status : "?"}" gezet`;
      }
      return isSentenceAction(e.action) ? e.action : e.action;
  }
}
