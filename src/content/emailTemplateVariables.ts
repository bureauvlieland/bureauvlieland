// Snapshot van de {{placeholders}} in de actieve e-mailtemplates in de database.
// Bijwerken wanneer een template wordt gewijzigd; de test emailTemplateVariables.test.ts
// controleert dat elke edge function alle vereiste variabelen aanlevert.
// Gegenereerd op 8 september 2026 uit de tabel email_templates (53 templates; zes ongebruikte verwijderd).
// 21 november 2026: dertien templates die geen code rendert verwijderd (migratie 20261121150000_dode-templates.sql).
// 21 november 2026: bijgewerkt naar de toestand ná de migraties 20261121120000_notificaties-herinneringen-fase1,
// 20261121130000_logies-gekozen-templates, 20261121140000_notificaties-teksten-fase1, 20261121160000_partnermails-fase3
// en 20261121170000_klant-bureau-templates (49 templates; ook de namen in {{#if naam}} tellen mee).
export const EMAIL_TEMPLATE_VARIABLES: Record<string, string[]> = {
  "accommodation_quote_notification": [
    "accommodation_name",
    "arrival_date",
    "customer_name",
    "departure_date",
    "description",
    "number_of_guests",
    "number_of_nights",
    "portal_link",
    "price_per_person_per_night",
    "price_total",
    "valid_until"
  ],
  "accommodation_rejected_partner": [
    "accommodation_name",
    "arrival_date",
    "departure_date",
    "partner_name"
  ],
  "accommodation_request_customer": [
    "accommodation_type",
    "arrival_date",
    "customer_name",
    "departure_date",
    "number_of_guests",
    "portal_link"
  ],
  "accommodation_selected_customer": [
    "accommodation_name",
    "arrival_date",
    "board_label",
    "customer_name",
    "departure_date",
    "extras_list",
    "includes_block",
    "number_of_guests",
    "portal_link",
    "price_total",
    "room_configuration_block",
    "terms_accepted_block"
  ],
  "accommodation_selected_partner": [
    "accommodation_name",
    "arrival_date",
    "board_label",
    "departure_date",
    "dietary_notes",
    "else",
    "extras_list",
    "guest_name",
    "guest_pays_directly",
    "includes_block",
    "number_of_guests",
    "partner_name",
    "partner_portal_link",
    "price_total",
    "reference_number",
    "room_assignment",
    "room_configuration_block",
    "special_requests"
  ],
  "arrival_reminder": [
    "arrival_date",
    "customer_name",
    "ferry_info_link",
    "number_of_people",
    "portal_link",
    "reference_number"
  ],
  "booking_confirmed_customer": [
    "booking_summary",
    "customer_name",
    "else",
    "partner_terms_note",
    "portal_link",
    "reference_number",
    "reservation_notice"
  ],
  "booking_confirmed_partner": [
    "customer_name",
    "items_list",
    "number_of_people",
    "partner_name",
    "portal_url",
    "reference_number",
    "selected_dates"
  ],
  "cancellation_accommodation_partner": [
    "accommodation_name",
    "cancellation_reason",
    "customer_name",
    "dates",
    "else",
    "partner_name",
    "portal_url",
    "program_reference",
    "reference_number",
    "was_selected"
  ],
  "cancellation_customer": [
    "cancellation_reason",
    "customer_name",
    "dates",
    "programma_url",
    "reference_number"
  ],
  "cancellation_partner": [
    "cancellation_reason",
    "cancelled_items",
    "customer_name",
    "partner_name",
    "portal_url",
    "reference_number"
  ],
  "chat_notification_bureau": [
    "chat_url",
    "message_preview",
    "reference_number",
    "source_label",
    "visitor_email",
    "visitor_name"
  ],
  "chat_reply_visitor": [
    "chat_url",
    "else",
    "message_preview",
    "reference_number",
    "visitor_name"
  ],
  "counter_proposal_partner": [
    "block_name",
    "counter_note_section",
    "counter_time",
    "customer_name",
    "original_time",
    "partner_portal_link",
    "price_section",
    "provider_name"
  ],
  "counter_proposal_response": [
    "action_text",
    "block_name",
    "customer_name",
    "note_section",
    "partner_name",
    "portal_link",
    "price_section",
    "proposed_time_section",
    "status_bg_color",
    "status_border_color",
    "status_color",
    "status_text"
  ],
  "customer_accommodation_message": [
    "accommodation_name",
    "contact_info",
    "dates",
    "message",
    "partner_name",
    "reply_info",
    "sender_label",
    "subject"
  ],
  "customer_aftersales_review": [
    "customer_name",
    "else",
    "google_review_url",
    "late_intro",
    "own_review_url",
    "program_date_label",
    "reference_number"
  ],
  "customer_review_google_reminder": [
    "customer_name",
    "google_review_url",
    "own_review_url",
    "reference_number",
    "review_text"
  ],
  "date_change_customer": [
    "customer_name",
    "has_accommodation",
    "new_dates",
    "portal_url"
  ],
  "event_referral_customer": [
    "aantal_gasten",
    "datum",
    "partner_email",
    "partner_naam",
    "voornaam"
  ],
  "event_referral_partner": [
    "aantal_gasten",
    "aanvraagtekst",
    "al_bekend_link",
    "datum",
    "email_klant",
    "naam_klant",
    "overnachtingen",
    "partner_contactpersoon",
    "telefoon_klant",
    "uiterlijk_datum"
  ],
  "guest_details_reminder": [
    "arrival_date",
    "customer_name",
    "portal_link",
    "reference_number"
  ],
  "inbound_reply_to_customer": [
    "customer_name",
    "message",
    "partner_name",
    "portal_url",
    "reference_number",
    "subject"
  ],
  "item_added_customer_approval": [
    "changes_summary",
    "customer_name",
    "portal_url",
    "reference_number"
  ],
  "item_added_partner": [
    "block_name",
    "customer_name",
    "notes",
    "number_of_people",
    "partner_name",
    "preferred_time",
    "selected_dates"
  ],
  "item_cancelled_partner": [
    "block_name",
    "cancellation_reason",
    "customer_name",
    "partner_name",
    "reference_number",
    "selected_dates"
  ],
  "item_changes_customer": [
    "changes_summary",
    "customer_name",
    "portal_url",
    "reference_number"
  ],
  "item_changes_partner": [
    "changes_list",
    "customer_name",
    "number_of_people",
    "partner_name",
    "selected_dates"
  ],
  "partner_activity_unconfirmed_t7": [
    "block_name",
    "customer_name",
    "event_date",
    "partner_name",
    "portal_url"
  ],
  "partner_headsup_t3": [
    "block_name",
    "bureau_invoice",
    "customer_name",
    "dietary_notes",
    "duration",
    "event_date",
    "guest_names",
    "guests_updated",
    "location",
    "number_of_people",
    "partner_instructions",
    "partner_name",
    "portal_url",
    "reference_number",
    "time_info"
  ],
  "partner_invitation": [
    "commission_accommodation",
    "commission_activity",
    "partner_email",
    "partner_name",
    "partner_portal_link",
    "set_password_link"
  ],
  "partner_invoice_reminder_t1": [
    "amount_excl_vat",
    "block_name",
    "customer_name",
    "partner_name",
    "portal_url",
    "reference_number"
  ],
  "partner_invoice_reminder_t14": [
    "block_name",
    "customer_name",
    "partner_name",
    "portal_url",
    "reference_number"
  ],
  "partner_invoice_reminder_t7": [
    "amount_excl_vat",
    "block_name",
    "customer_name",
    "partner_name",
    "portal_url",
    "reference_number"
  ],
  "partner_password_reset": [
    "admin_initiated",
    "else",
    "partner_name",
    "reset_link"
  ],
  "program_request_bureau": [
    "admin_url",
    "bureau_items",
    "customer_company",
    "customer_email",
    "customer_name",
    "customer_phone",
    "notes",
    "number_of_people",
    "partner_items",
    "selected_date",
    "self_arranged_items"
  ],
  "program_request_customer": [
    "coordinated_items",
    "customer_name",
    "notes",
    "number_of_people",
    "portal_url",
    "selected_date",
    "self_arranged_items"
  ],
  "program_request_partner": [
    "billing_note",
    "block_name",
    "bureau_invoice",
    "customer_company",
    "customer_name",
    "dates",
    "effective_time",
    "else",
    "is_confirm_only",
    "is_inform",
    "number_of_people",
    "partner_name",
    "portal_url",
    "reference_number"
  ],
  "quote_expired_partner": [
    "accommodation_name",
    "customer_name",
    "partner_name",
    "portal_url",
    "valid_until"
  ],
  "quote_offer_customer": [
    "dates",
    "number_of_people",
    "personal_message",
    "portal_url",
    "valid_until"
  ],
  "reference_case_approval": [
    "approval_url",
    "customer_name",
    "reference_number",
    "title"
  ],
  "reminder_activity_pending": [
    "block_name",
    "customer_name",
    "days_since",
    "partner_name",
    "portal_url"
  ],
  "reminder_headcount_pending": [
    "arrival_date",
    "customer_name",
    "days_since",
    "departure_date",
    "number_of_guests",
    "partner_name",
    "portal_url",
    "previous_number_of_guests"
  ],
  "reminder_quote_pending": [
    "arrival_date",
    "customer_name",
    "days_since",
    "departure_date",
    "number_of_guests",
    "partner_name",
    "portal_url"
  ],
  "status_alternative": [
    "activity_name",
    "actor_line",
    "customer_name",
    "partner_name",
    "portal_link",
    "proposed_date",
    "proposed_time",
    "quoted_price",
    "reference_number",
    "status_note"
  ],
  "status_confirmed": [
    "activity_name",
    "actor_line",
    "customer_name",
    "partner_name",
    "portal_link",
    "quoted_price",
    "reference_number",
    "status_note"
  ],
  "status_unavailable": [
    "activity_name",
    "actor_line",
    "customer_name",
    "partner_name",
    "portal_link",
    "reference_number",
    "status_note"
  ],
  "wedding_referral_customer": [
    "aantal_gasten",
    "partner_email",
    "partner_naam",
    "trouwdatum",
    "voornaam"
  ],
  "wedding_referral_partner": [
    "aantal_gasten",
    "aanvraagtekst",
    "al_bekend_link",
    "email_klant",
    "naam_klant",
    "overnachtingen",
    "partner_contactpersoon",
    "telefoon_klant",
    "trouwdatum",
    "uiterlijk_datum"
  ]
};
