// Personalisatie van partnermailings: {{partner_name}} plus per-partner variabelen.

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

/** Vult {{partner_name}} en de per-partner variabelen in; onbekende variabelen blijven leeg. */
export function personalize(
  html: string,
  partnerName: string,
  variables: Record<string, string> | undefined,
): string {
  let out = html.replace(/\{\{partner_name\}\}/g, escapeHtml(partnerName));
  for (const [key, value] of Object.entries(variables ?? {})) {
    if (!/^[a-z0-9_]+$/i.test(key)) continue;
    // Waarden mogen eenvoudige HTML bevatten (lijstjes), maar geen scripts.
    const safe = /<\s*script/i.test(value) ? escapeHtml(value) : value;
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), safe);
  }
  return out.replace(/\{\{[a-z0-9_]+\}\}/gi, "");
}
