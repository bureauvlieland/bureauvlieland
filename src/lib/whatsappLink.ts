/**
 * WhatsApp-links die ook op desktop werken.
 *
 * `wa.me` stuurt op desktop door naar `api.whatsapp.com/send`. Die pagina
 * weigert te laden zodra de navigatie niet in een echt top-level tabblad
 * gebeurt (iframe, geblokkeerde popup) → ERR_BLOCKED_BY_RESPONSE.
 * Op desktop gebruiken we daarom `web.whatsapp.com/send`.
 */

export interface WhatsAppLinkOptions {
  /** Telefoonnummer in internationaal formaat; mag +, spaties en streepjes bevatten. Leeg = alleen delen. */
  phone?: string | null;
  /** Voorgevulde berichttekst. */
  text?: string | null;
  /** Forceer desktop/mobiel (voor tests). Standaard afgeleid van de user agent. */
  isMobile?: boolean;
}

/** Strip alles behalve cijfers uit een telefoonnummer. */
export function normalizeWhatsAppPhone(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Detecteer mobiel/tablet op basis van de user agent. */
export function detectMobileUserAgent(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "") ??
    "";
  return /android|iphone|ipad|ipod|iemobile|opera mini|blackberry|mobile/i.test(ua);
}

/** Bouw de juiste WhatsApp-URL voor het huidige apparaat. */
export function buildWhatsAppHref(options: WhatsAppLinkOptions = {}): string {
  const phone = normalizeWhatsAppPhone(options.phone);
  const text = options.text ?? "";
  const mobile = options.isMobile ?? detectMobileUserAgent();

  if (mobile) {
    const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
  }

  const params = new URLSearchParams();
  if (phone) params.set("phone", phone);
  if (text) params.set("text", text);
  const qs = params.toString();
  return qs ? `https://web.whatsapp.com/send?${qs}` : "https://web.whatsapp.com/";
}

/**
 * Open WhatsApp in een nieuw tabblad. Wanneer de popup geblokkeerd wordt
 * (of we in een iframe zitten) navigeert het bovenste venster, zodat er
 * nooit een dood tabblad of foutpagina achterblijft.
 */
export function openWhatsApp(options: WhatsAppLinkOptions | string = {}): void {
  const href = typeof options === "string" ? options : buildWhatsAppHref(options);
  if (typeof window === "undefined") return;

  let win: Window | null = null;
  try {
    win = window.open(href, "_blank", "noopener,noreferrer");
  } catch {
    win = null;
  }

  if (win) return;

  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = href;
      return;
    }
  } catch {
    // cross-origin top: val terug op het eigen venster
  }
  window.location.href = href;
}
