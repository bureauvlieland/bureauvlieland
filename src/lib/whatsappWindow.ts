/**
 * WhatsApp Business 24-uursvenster.
 *
 * Meta staat vrije (niet-template) antwoorden alleen toe binnen 24 uur na het
 * laatste bericht van de klant. Daarna weigert Twilio de zending met foutcode
 * 63016. Deze helpers berekenen de resterende tijd zodat de admin-UI kan
 * waarschuwen vóórdat er een mislukte poging wordt gedaan.
 */

export const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface WhatsappWindowState {
  /** Is er nog ruimte voor een vrij tekstbericht? */
  isOpen: boolean;
  /** Milliseconden tot het venster sluit (0 als gesloten of onbekend). */
  msRemaining: number;
  /** Leesbare resttijd, bv. "3 uur 12 min". Null als gesloten/onbekend. */
  remainingLabel: string | null;
}

const CLOSED: WhatsappWindowState = { isOpen: false, msRemaining: 0, remainingLabel: null };

export function formatWindowRemaining(msRemaining: number): string {
  const totalMinutes = Math.max(0, Math.floor(msRemaining / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} uur ${minutes} min`;
}

/**
 * @param lastInboundAt tijdstip van het laatste bericht van de klant (ISO of Date)
 * @param now referentietijd (default: nu)
 */
export function getWhatsappWindowState(
  lastInboundAt: string | Date | null | undefined,
  now: Date = new Date(),
): WhatsappWindowState {
  if (!lastInboundAt) return CLOSED;
  const last = lastInboundAt instanceof Date ? lastInboundAt : new Date(lastInboundAt);
  if (Number.isNaN(last.getTime())) return CLOSED;

  const msRemaining = last.getTime() + WHATSAPP_WINDOW_MS - now.getTime();
  if (msRemaining <= 0) return CLOSED;

  return {
    isOpen: true,
    msRemaining,
    remainingLabel: formatWindowRemaining(msRemaining),
  };
}
