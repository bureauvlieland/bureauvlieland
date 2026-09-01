/**
 * Token-uitlezing voor de Mailjet-webhook.
 *
 * Mailjet-configuraties verschillen: de ene zet het token in de query-string,
 * de andere kan alleen headers meegeven. Beide varianten worden geaccepteerd,
 * zodat een verkeerd ingestelde URL niet stil alle feedback blokkeert.
 */
export function extractWebhookToken(url: string, headers: Headers): string | null {
  const fromQuery = new URL(url).searchParams.get("token");
  if (fromQuery) return fromQuery;
  return headers.get("x-mailjet-token") ?? headers.get("x-webhook-token") ?? null;
}

export function isWebhookAuthorized(
  url: string,
  headers: Headers,
  expectedToken: string,
): boolean {
  return extractWebhookToken(url, headers) === expectedToken;
}
