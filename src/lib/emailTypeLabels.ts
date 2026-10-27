/**
 * Eén labelkaart voor alle `email_type`-sleutels uit `email_log`, in gewoon
 * Nederlands. Gebruikt door het Berichtencentrum, het projectdossier, de
 * partnerkaart, de e-maildetails en de verzendlogs. Voeg een nieuwe sleutel
 * hier toe zodra een edge function een nieuw type gaat loggen; een sleutel
 * zonder label valt terug op de sleutel zelf.
 *
 * Categorie: waar de mail over gaat, voor filters en groepering.
 */
export type EmailTypeCategory =
  | "Aanvraag"
  | "Offerte"
  | "Programma"
  | "Logies"
  | "Annulering"
  | "Facturatie"
  | "Partner"
  | "Chat"
  | "Klant"
  | "Bureau"
  | "Bruiloft"
  | "Systeem"
  | "Overig";

export interface EmailTypeInfo {
  label: string;
  category: EmailTypeCategory;
}

export const EMAIL_TYPES: Record<string, EmailTypeInfo> = {
  // Aanvragen
  program_request_bureau: { label: "Nieuwe aanvraag (melding bureau)", category: "Aanvraag" },
  program_request_customer: { label: "Aanvraag bevestigd aan klant", category: "Aanvraag" },
  program_request_partner: { label: "Aanvraag naar partner", category: "Aanvraag" },
  catering_request_bureau: { label: "Cateringaanvraag (melding bureau)", category: "Aanvraag" },
  catering_request_customer: { label: "Cateringaanvraag bevestigd aan klant", category: "Aanvraag" },
  quote_request_bureau: { label: "Offerteaanvraag (melding bureau)", category: "Aanvraag" },
  quote_request_customer: { label: "Offerteaanvraag bevestigd aan klant", category: "Aanvraag" },

  // Offerte en akkoord
  quote_offer_customer: { label: "Offerte verstuurd", category: "Offerte" },
  quote_accepted_customer: { label: "Akkoord ontvangen", category: "Offerte" },
  customer_terms_request: { label: "Ondertekenverzoek", category: "Offerte" },
  booking_confirmed_customer: { label: "Akkoord vastgelegd aan klant", category: "Offerte" },
  booking_confirmed_partner: { label: "Definitieve boeking aan partner", category: "Offerte" },
  reminder_quote_pending: { label: "Herinnering openstaande offerte", category: "Offerte" },
  quote_expired_partner: { label: "Offerte verlopen (partner)", category: "Offerte" },

  // Programma en onderdelen
  status_confirmed: { label: "Onderdeel bevestigd aan klant", category: "Programma" },
  status_unavailable: { label: "Onderdeel niet beschikbaar", category: "Programma" },
  status_alternative: { label: "Alternatief voorgesteld aan klant", category: "Programma" },
  counter_proposal_partner: { label: "Tegenvoorstel klant naar partner", category: "Programma" },
  counter_proposal_response: { label: "Reactie op tegenvoorstel", category: "Programma" },
  customer_counter_proposal_bureau: { label: "Tegenvoorstel klant (melding bureau)", category: "Programma" },
  item_added_partner: { label: "Onderdeel toegevoegd (partner)", category: "Programma" },
  item_added_customer_approval: { label: "Onderdeel toegevoegd, akkoord gevraagd", category: "Programma" },
  item_changes_customer: { label: "Programma bijgewerkt (klant)", category: "Programma" },
  item_changes_partner: { label: "Wijziging onderdeel (partner)", category: "Programma" },
  date_change_customer: { label: "Datumwijziging bevestigd (klant)", category: "Programma" },
  date_change_partner: { label: "Datumwijziging (partner)", category: "Programma" },
  customer_date_change_bureau: { label: "Datumwijziging klant (melding bureau)", category: "Programma" },
  partner_briefing_t3: { label: "Briefing partner, 3 dagen vooraf", category: "Programma" },
  partner_activity_unconfirmed_t7: { label: "Herinnering onbevestigd onderdeel, 7 dagen", category: "Programma" },
  arrival_reminder: { label: "Aankomstmail", category: "Programma" },
  guest_details_reminder: { label: "Herinnering gastgegevens", category: "Programma" },
  customer_aftersales_review: { label: "Beoordelingsverzoek", category: "Klant" },

  // Logies
  accommodation_request_bureau: { label: "Logiesaanvraag (melding bureau)", category: "Logies" },
  accommodation_request_customer: { label: "Logiesaanvraag bevestigd aan klant", category: "Logies" },
  accommodation_quote_request_partner: { label: "Logiesaanvraag naar partner", category: "Logies" },
  accommodation_quote_notification: { label: "Logiesofferte binnen (klant)", category: "Logies" },
  accommodation_quote_withdrawn: { label: "Logiesaanvraag ingetrokken", category: "Logies" },
  accommodation_selected_customer: { label: "Logies geboekt (klant)", category: "Logies" },
  accommodation_selected_partner: { label: "Logiesofferte geaccepteerd (partner)", category: "Logies" },
  accommodation_rejected_partner: { label: "Logiesofferte niet gekozen (partner)", category: "Logies" },
  accommodation_people_change: { label: "Aantal gasten gewijzigd (logies)", category: "Logies" },
  customer_accommodation_message: { label: "Bericht van klant aan logiespartner", category: "Logies" },
  partner_customer_message: { label: "Bericht van logiespartner aan klant", category: "Logies" },

  // Annulering
  cancellation_customer: { label: "Annulering bevestigd aan klant", category: "Annulering" },
  cancellation_partner: { label: "Annulering naar partner", category: "Annulering" },
  cancellation_accommodation_partner: { label: "Annulering logies naar partner", category: "Annulering" },
  partner_item_cancellation: { label: "Onderdeel vervallen (partner)", category: "Annulering" },
  internal_customer_cancellation: { label: "Klant annuleerde (melding bureau)", category: "Annulering" },

  // Facturatie
  bureau_invoice_to_customer: { label: "Factuur naar klant", category: "Facturatie" },
  bureau_invoice_forward: { label: "Factuur naar boekhouding", category: "Facturatie" },
  purchase_invoice_forward: { label: "Inkoopfactuur naar boekhouding", category: "Facturatie" },
  partner_invoice_registered_bureau: { label: "Inkoopfactuur geregistreerd", category: "Facturatie" },
  partner_invoice_reminder_t1: { label: "Verzoek inkoopfactuur", category: "Facturatie" },
  partner_invoice_reminder_t7: { label: "Herinnering inkoopfactuur, 7 dagen", category: "Facturatie" },
  partner_missing_pdf_reminder: { label: "Herinnering ontbrekende factuur-pdf", category: "Facturatie" },
  proforma_invoice: { label: "Proformafactuur", category: "Facturatie" },

  // Partnerbeheer
  partner_invitation: { label: "Uitnodiging partnerportaal", category: "Partner" },
  partner_intro_portal: { label: "Introductie partnerportaal", category: "Partner" },
  partner_password_reset: { label: "Wachtwoord partnerportaal", category: "Partner" },

  // Chat
  chat_notification: { label: "Chatmelding aan bureau", category: "Chat" },
  chat_reply_notification: { label: "Chatantwoord aan bezoeker", category: "Chat" },

  // Handmatig vanuit het dossier
  admin_project_email: { label: "E-mail vanuit dossier", category: "Bureau" },
  inbound_reply_to_customer: { label: "Antwoord aan klant", category: "Bureau" },

  // Bruiloft
  wedding_referral_customer: { label: "Doorverwijzing bruiloft (bruidspaar)", category: "Bruiloft" },
  wedding_referral_partner: { label: "Doorverwijzing bruiloft (partner)", category: "Bruiloft" },
  wedding_referral_claim_bureau: { label: "Bruidspaar al bekend bij partner (melding bureau)", category: "Bruiloft" },

  // Systeem
  cron_watchdog_alert: { label: "Systeemwaarschuwing", category: "Systeem" },

  // Oudere sleutels die nog in de database kunnen staan
  partner_quote_request: { label: "Offerteaanvraag partner", category: "Partner" },
  partner_reminder: { label: "Herinnering partner", category: "Partner" },
  partner_notification: { label: "Melding partner", category: "Partner" },
  partner_invite: { label: "Uitnodiging partner", category: "Partner" },
  customer_confirmation: { label: "Bevestiging klant", category: "Klant" },
  customer_quote: { label: "Offerte klant", category: "Offerte" },
  customer_program: { label: "Programma klant", category: "Programma" },
  accommodation_quote_request: { label: "Logiesaanvraag naar partner", category: "Logies" },
  accommodation_selected: { label: "Logies gekozen", category: "Logies" },
  admin_notification: { label: "Melding bureau", category: "Bureau" },
  terms_request: { label: "Ondertekenverzoek", category: "Offerte" },
  project_email: { label: "E-mail vanuit dossier", category: "Bureau" },
};

/** Nederlands label voor een `email_type`; onbekend type → de sleutel zelf. */
export function emailTypeLabel(type: string | null | undefined): string {
  if (!type) return "";
  return EMAIL_TYPES[type]?.label ?? type;
}

/** Categorie voor filters; onbekend type → "Overig". */
export function emailTypeCategory(type: string | null | undefined): EmailTypeCategory {
  if (!type) return "Overig";
  return EMAIL_TYPES[type]?.category ?? "Overig";
}

/** Mailjet-status van een verzonden mail als Nederlands label. */
export const EMAIL_STATUS_LABELS: Record<string, string> = {
  pending: "In wachtrij",
  sent: "Verzonden",
  delivered: "Afgeleverd",
  opened: "Geopend",
  clicked: "Geklikt",
  failed: "Mislukt",
  bounced: "Gebounced",
  blocked: "Geblokkeerd",
  spam: "Als spam gemeld",
  unsubscribed: "Uitgeschreven",
  suppressed: "Onderdrukt",
  dlq: "Mislukt",
};

export function emailStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  return EMAIL_STATUS_LABELS[status] ?? status;
}
