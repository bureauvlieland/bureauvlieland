/**
 * Guard helpers voor de "Geen factuur — sluiten" actie in de partner werkbank.
 * Pure functies zodat we ze in Vitest kunnen dekken zonder Supabase-mocks.
 */

export interface DismissableItem {
  status: string;
  invoiced_number: string | null;
  partner_dismissed_at: string | null;
  executed_at?: string | null;
}

export function canPartnerDismissInvoiceItem(item: DismissableItem): boolean {
  if (item.partner_dismissed_at) return false;
  if (item.invoiced_number) return false;
  // Alleen items die klaar staan voor factureren mogen worden gesloten.
  if (item.status !== "executed" && item.status !== "accepted" && item.status !== "confirmed") {
    return false;
  }
  return true;
}

export function validateDismissReason(reason: string): { ok: true } | { ok: false; error: string } {
  const trimmed = reason.trim();
  if (trimmed.length < 3) return { ok: false, error: "Geef kort aan waarom u geen factuur stuurt (min. 3 tekens)." };
  if (trimmed.length > 500) return { ok: false, error: "Reden is te lang (max. 500 tekens)." };
  return { ok: true };
}
