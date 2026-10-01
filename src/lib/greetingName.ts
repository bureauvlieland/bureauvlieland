/**
 * Naam voor de begroeting in het klantportaal.
 *
 * Klanten typen in de wizard soms een aanhef mee in het naamveld
 * ("Mevrouw. M. Swagerman", "Dhr. Jansen"). "Welkom, Mevrouw. M. Swagerman"
 * leest dan als een fout. Deze helper haalt zo'n aanhef vooraan weg en geeft
 * de rest terug; blijft er niets over, dan een lege string, zodat de
 * aanroeper gewoon "Welkom" toont.
 */
const SALUTATION =
  /^(?:(?:mevrouw|mevr|mw|mej|mejuffrouw|dhr|hr|heer|meneer|de\s+heer|mr|mrs|ms|miss)(?:\.|\b)\s*)+/i;

export const greetingName = (name?: string | null): string => {
  if (!name) return "";
  return name.replace(/\s+/g, " ").trim().replace(SALUTATION, "").trim();
};
