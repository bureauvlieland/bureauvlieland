/**
 * Lettertype voor de factuur-PDF's (klantfactuur en commissiefactuur).
 *
 * jsPDF kent standaard alleen Helvetica met de WinAnsi-tekenset. Dat
 * lettertype wijkt af van de huisstijl (Inter op het scherm) en kent geen
 * pijl: "Overtocht Harlingen → Vlieland" kwam op de factuur als "!'" terecht
 * (FV-BV-2606-0013-001, 3 november 2026). Daarom sluiten we Inter in: een
 * Latijnse subset met leestekens, valuta en pijlen (`src/assets/fonts`,
 * SIL Open Font License). Lukt het laden niet, dan valt de PDF terug op
 * Helvetica en worden tekens die daar niet in zitten vervangen.
 */
import type { jsPDF } from "jspdf";
import interRegularUrl from "@/assets/fonts/Inter-Regular.ttf?url";
import interBoldUrl from "@/assets/fonts/Inter-Bold.ttf?url";

export type InvoiceFontFamily = "Inter" | "helvetica";

/** Haalt de bytes van een lettertype op; in tests van schijf, in de browser via fetch. */
export type FontBytesLoader = (url: string) => Promise<Uint8Array>;

const fetchFontBytes: FontBytesLoader = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lettertype niet gevonden: ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
};

let cachedBase64: { regular: string; bold: string } | null = null;

/** Alleen voor tests: dwingt opnieuw laden af. */
export function resetInvoiceFontCache(): void {
  cachedBase64 = null;
}

/** Base64 zonder FileReader, zodat dit ook buiten de browser werkt. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Registreert Inter (normaal en vet) op dit document en geeft de familie
 * terug die de renderer moet gebruiken. Bij een laadfout: "helvetica".
 */
export async function registerInvoiceFonts(pdf: jsPDF, load: FontBytesLoader = fetchFontBytes): Promise<InvoiceFontFamily> {
  try {
    if (!cachedBase64) {
      const [regular, bold] = await Promise.all([load(interRegularUrl), load(interBoldUrl)]);
      cachedBase64 = { regular: bytesToBase64(regular), bold: bytesToBase64(bold) };
    }
    pdf.addFileToVFS("Inter-Regular.ttf", cachedBase64.regular);
    pdf.addFont("Inter-Regular.ttf", "Inter", "normal");
    pdf.addFileToVFS("Inter-Bold.ttf", cachedBase64.bold);
    pdf.addFont("Inter-Bold.ttf", "Inter", "bold");
    return "Inter";
  } catch (err) {
    console.warn("Factuurlettertype niet geladen, terug naar Helvetica", err);
    return "helvetica";
  }
}

/** Tekens buiten WinAnsi die Helvetica in jsPDF niet kan tonen, met een leesbare vervanging. */
const STANDARD_FONT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[→⟶➔➜]/g, "-"],
  [/[←⟵]/g, "-"],
  [/[↔⟷]/g, "-"],
  [/[✓✔]/g, "v"],
  [/[✗✘]/g, "x"],
  [/\u00A0/g, " "],
];

// WinAnsi: Latin-1 plus de leestekens uit het bereik 0x80–0x9F.
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const NOT_WINANSI = new RegExp(`[^\\u0000-\\u00FF${WINANSI_EXTRA}]`, "g");

/**
 * Maakt tekst geschikt voor Helvetica: pijlen worden een streepje, andere
 * tekens buiten WinAnsi vervallen. Alleen nodig als Inter niet laadt.
 */
export function sanitizeForStandardFont(text: string): string {
  let out = text;
  for (const [pattern, replacement] of STANDARD_FONT_REPLACEMENTS) out = out.replace(pattern, replacement);
  return out.replace(NOT_WINANSI, "");
}
