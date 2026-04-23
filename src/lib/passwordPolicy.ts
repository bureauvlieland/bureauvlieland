import { z } from "zod";

/**
 * Centrale wachtwoordeisen voor partner- en adminaccounts.
 * Wordt gebruikt op alle plekken waar een wachtwoord wordt gekozen of ingevoerd.
 *
 * Eisen:
 *  - minimaal 12 tekens (dit verhoogt de brute-force kosten significant t.o.v. 6/8)
 *  - minimaal 1 hoofdletter
 *  - minimaal 1 kleine letter
 *  - minimaal 1 cijfer
 *  - minimaal 1 leesteken / symbool
 */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_RULES_HINT =
  "Minimaal 12 tekens, met een hoofdletter, kleine letter, cijfer en leesteken.";

const hasLower = /[a-z]/;
const hasUpper = /[A-Z]/;
const hasDigit = /\d/;
const hasSymbol = /[^A-Za-z0-9]/;

/**
 * Strikt schema voor het kiezen van een nieuw wachtwoord (set-password / reset).
 */
export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Wachtwoord moet minimaal ${PASSWORD_MIN_LENGTH} tekens zijn`)
  .max(128, "Wachtwoord mag maximaal 128 tekens zijn")
  .refine((val) => hasLower.test(val), {
    message: "Voeg minimaal één kleine letter toe",
  })
  .refine((val) => hasUpper.test(val), {
    message: "Voeg minimaal één hoofdletter toe",
  })
  .refine((val) => hasDigit.test(val), {
    message: "Voeg minimaal één cijfer toe",
  })
  .refine((val) => hasSymbol.test(val), {
    message: "Voeg minimaal één leesteken of symbool toe",
  });

/**
 * Soepeler schema voor de loginpagina.
 * We controleren alleen op minimumlengte zodat bestaande accounts (met oudere,
 * eventueel kortere wachtwoorden) nog kunnen inloggen — de daadwerkelijke
 * verificatie gebeurt server-side door Supabase Auth.
 */
export const loginPasswordSchema = z
  .string()
  .min(1, "Wachtwoord is verplicht")
  .max(128, "Wachtwoord mag maximaal 128 tekens zijn");
