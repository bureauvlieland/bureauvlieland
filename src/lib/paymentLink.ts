/** Publieke betaalpagina van een klantfactuur; de uuid is het toegangsbewijs. */
export const PUBLIC_SITE_URL = "https://bureauvlieland.nl";

export const paymentPagePath = (invoiceId: string): string => `/betalen/${invoiceId}`;

export const paymentPageUrl = (invoiceId: string): string => `${PUBLIC_SITE_URL}${paymentPagePath(invoiceId)}`;
