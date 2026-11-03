/**
 * Leesbare tekst van een e-mailbericht voor het Berichtencentrum.
 *
 * `stripHtml` uit emailThreads is bedoeld voor één regel (lijst, voorvertoning)
 * en drukt daarom alle witruimte samen tot één spatie. In de berichtkaart
 * verdwenen zo de alinea's en regeleinden van de afzender. Deze helper houdt
 * regeleinden, zet HTML om naar tekst als de inhoud toch opmaak bevat en
 * ontcijfert ook numerieke entiteiten zoals &#9733; en &rsquo;.
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  euro: "€",
  copy: "©",
  middot: "·",
  bull: "•",
  eacute: "é",
  egrave: "è",
  euml: "ë",
  iuml: "ï",
  ouml: "ö",
  uuml: "ü",
  auml: "ä",
  agrave: "à",
  ccedil: "ç",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

const looksLikeHtml = (text: string) => /<(p|div|br|table|tr|td|li|ul|ol|h[1-6]|span|a|b|strong|i|em|img|html|body)[\s>/]/i.test(text);

/** Zet HTML om naar tekst met regeleinden op blokgrenzen. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<\/(table|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<[^>]*>/g, "");
}

/**
 * De tekst van een bericht zoals de kaart hem toont: regeleinden blijven,
 * opmaak gaat eruit, entiteiten worden letters, en meer dan één lege regel
 * wordt er één.
 */
export function formatEmailBodyText(content: string | null | undefined): string {
  if (!content) return "";
  const text = looksLikeHtml(content) ? htmlToText(content) : content;
  return decodeHtmlEntities(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00a0]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
