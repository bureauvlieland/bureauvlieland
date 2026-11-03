/**
 * De berichtkaart in het Berichtencentrum toonde mails als één lap tekst:
 * regeleinden werden samengedrukt en entiteiten als &#9733; bleven staan.
 */
import { describe, it, expect } from "vitest";
import { decodeHtmlEntities, formatEmailBodyText, htmlToText } from "@/lib/emailBodyText";

describe("formatEmailBodyText", () => {
  it("houdt alinea's en regeleinden van platte tekst", () => {
    const input = "Ik wou de prijs aanpassen.\n\nVerder, bij mist kunnen we niet varen.\n\nMet vriendelijke groet,\nGuido";
    expect(formatEmailBodyText(input)).toBe(input);
  });

  it("maakt van Windows-regeleinden en veel lege regels nette alinea's", () => {
    expect(formatEmailBodyText("Regel 1\r\n\r\n\r\n\r\nRegel 2   \r\n  Regel 3")).toBe("Regel 1\n\nRegel 2\nRegel 3");
  });

  it("ontcijfert numerieke en benoemde entiteiten", () => {
    expect(decodeHtmlEntities("&#9733; NL JNN-81-S &middot; &ldquo;De Bazuin&rdquo; &mdash; &eacute;&eacute;n &copy; 2026")).toBe(
      "★ NL JNN-81-S · “De Bazuin” — één © 2026",
    );
    expect(decodeHtmlEntities("&#x20AC; 105 &amp; &onbekend;")).toBe("€ 105 & &onbekend;");
  });

  it("zet HTML om naar tekst met regeleinden op blokgrenzen", () => {
    const html = "<html><head><style>p{color:red}</style></head><body><p>Beste RMD,</p><p>Dank voor uw reservering.<br>Referentie PP-2026-2887</p><ul><li>Auto 1</li><li>Auto 2</li></ul><p>Groet</p></body></html>";
    expect(formatEmailBodyText(html)).toBe("Beste RMD,\nDank voor uw reservering.\nReferentie PP-2026-2887\nAuto 1\nAuto 2\n\nGroet");
  });

  it("laat losse kleiner-dan-tekens in platte tekst staan", () => {
    expect(formatEmailBodyText("prijs < 100 en > 50")).toBe("prijs < 100 en > 50");
    expect(htmlToText("a <b>b</b>")).toBe("a b");
  });

  it("geeft een lege string voor lege inhoud", () => {
    expect(formatEmailBodyText(null)).toBe("");
    expect(formatEmailBodyText("   ")).toBe("");
  });
});
