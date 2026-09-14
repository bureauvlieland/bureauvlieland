/**
 * Validatie voor een Nederlands mobiel nummer (06-nummer), verplicht bij
 * elke aanvraag zodat we de contactpersoon van een groep via WhatsApp of
 * sms kunnen bereiken. Accepteert spaties, haakjes en streepjes; vast
 * (0XX) nummers en buitenlandse nummers worden bewust geweigerd.
 */
export function isDutchMobileNumber(phone: string): boolean {
  const digitsOnly = phone.trim().replace(/[\s().-]/g, "");
  return /^(?:\+31|0031|0)6\d{8}$/.test(digitsOnly);
}

export const DUTCH_MOBILE_PHONE_ERROR =
  "Voer een geldig Nederlands mobiel nummer in (06-nummer).";
