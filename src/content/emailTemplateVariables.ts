// Snapshot van de {{placeholders}} in de actieve e-mailtemplates in de database.
// Bijwerken wanneer een template wordt gewijzigd; de test emailTemplateVariables.test.ts
// controleert dat elke edge function alle vereiste variabelen aanlevert.
export const EMAIL_TEMPLATE_VARIABLES: Record<string, string[]> = {
  "reminder_activity_pending": [
    "block_name",
    "customer_name",
    "days_since",
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
    "status_note"
  ],
  "cancellation_partner": [
    "cancellation_reason",
    "cancelled_items",
    "customer_name",
    "partner_name",
    "reference_number"
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
  "program_request_bureau": [
    "bureau_fee",
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
    "bureau_fee",
    "coordinated_items",
    "customer_name",
    "notes",
    "number_of_people",
    "portal_url",
    "selected_date",
    "self_arranged_items"
  ],
  "partner_activity_unconfirmed_t7": [
    "block_name",
    "customer_name",
    "event_date",
    "partner_name",
    "portal_url"
  ],
  "partner_briefing_t3": [
    "block_name",
    "customer_name",
    "event_date",
    "number_of_people",
    "partner_name",
    "portal_url",
    "time_info"
  ],
  "partner_invoice_reminder_t1": [
    "amount_excl_vat",
    "block_name",
    "customer_name",
    "partner_name",
    "portal_url",
    "reference_number"
  ],
  "partner_invitation": [
    "commission_accommodation",
    "commission_activity",
    "partner_email",
    "partner_name",
    "partner_portal_link",
    "set_password_link"
  ],
  "quote_expired_partner": [
    "accommodation_name",
    "customer_name",
    "partner_name",
    "portal_url",
    "valid_until"
  ],
  "partner_invoice_reminder_t7": [
    "amount_excl_vat",
    "block_name",
    "customer_name",
    "partner_name",
    "portal_url",
    "reference_number"
  ],
  "accommodation_selected_partner": [
    "accommodation_name",
    "arrival_date",
    "departure_date",
    "extras_list",
    "guest_name",
    "number_of_guests",
    "partner_portal_link",
    "price_total"
  ],
  "presales_partner_question": [
    "partner_name",
    "question_body",
    "reference_number"
  ],
  "program_request_partner": [
    "block_name",
    "customer_company",
    "customer_name",
    "dates",
    "effective_time",
    "number_of_people",
    "partner_name",
    "portal_url"
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
  "presales_intake_followup": [
    "customer_name",
    "reference_number"
  ],
  "presales_clarification": [
    "customer_name",
    "number_of_people",
    "reference_number"
  ],
  "presales_proposal_intro": [
    "customer_name",
    "number_of_people",
    "reference_number"
  ],
  "quote_request_bureau": [
    "budget_per_person",
    "company_name",
    "customer_email",
    "customer_name",
    "customer_phone",
    "description",
    "number_of_days",
    "number_of_people",
    "start_date"
  ],
  "customer_aftersales_review": [
    "customer_name",
    "else",
    "google_review_url",
    "own_review_url",
    "program_date_label",
    "reference_number"
  ],
  "accommodation_selected_customer": [
    "accommodation_name",
    "arrival_date",
    "customer_name",
    "departure_date",
    "number_of_guests",
    "portal_link",
    "price_total"
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
  "sales_followup_offer_3d": [
    "customer_name",
    "portal_url",
    "reference_number"
  ],
  "sales_followup_offer_7d": [
    "customer_name",
    "portal_url",
    "reference_number"
  ],
  "sales_pre_signing": [
    "customer_name",
    "portal_url"
  ],
  "accommodation_rejected_partner": [
    "accommodation_name",
    "arrival_date",
    "departure_date",
    "partner_name"
  ],
  "quote_request_customer": [
    "budget_per_person",
    "customer_name",
    "number_of_days",
    "number_of_people",
    "start_date"
  ],
  "sales_post_signing_welcome": [
    "customer_name",
    "portal_url"
  ],
  "reminder_partner_quote": [
    "arrival_date",
    "customer_name",
    "days_ago",
    "departure_date",
    "number_of_guests",
    "partner_name",
    "portal_link"
  ],
  "reminder_customer_quote": [
    "arrival_date",
    "customer_name",
    "departure_date",
    "number_of_guests",
    "portal_url",
    "quote_count"
  ],
  "reminder_customer_request": [
    "customer_name",
    "days_since",
    "portal_url"
  ],
  "chat_notification_bureau": [
    "chat_url",
    "message_preview",
    "source_label",
    "visitor_email",
    "visitor_name"
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
  "partner_password_reset": [
    "partner_name",
    "reset_link"
  ],
  "partner_intro_portal": [],
  "item_cancelled_partner": [
    "block_name",
    "cancellation_reason",
    "customer_name",
    "partner_name",
    "reference_number",
    "selected_dates"
  ],
  "date_change_partner": [
    "activities_list",
    "customer_name",
    "new_dates",
    "old_dates",
    "partner_name"
  ],
  "date_change_customer": [
    "customer_name",
    "new_dates",
    "portal_url"
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
  "item_changes_partner": [
    "changes_list",
    "customer_name",
    "number_of_people",
    "partner_name",
    "selected_dates"
  ],
  "inbound_reply_to_customer": [
    "customer_name",
    "message",
    "partner_name",
    "portal_url",
    "reference_number",
    "subject"
  ],
  "item_changes_customer": [
    "changes_summary",
    "customer_name",
    "portal_url",
    "reference_number"
  ],
  "chat_reply_visitor": [
    "chat_url",
    "message_preview",
    "visitor_name"
  ],
  "booking_confirmed_customer": [
    "booking_summary",
    "customer_name",
    "portal_link",
    "reference_number"
  ],
  "booking_confirmed_partner": [
    "customer_name",
    "items_list",
    "number_of_people",
    "partner_name",
    "portal_url",
    "selected_dates"
  ],
  "date_change_accommodation": [
    "accommodation_name",
    "arrival_date",
    "customer_name",
    "departure_date",
    "number_of_people",
    "partner_name",
    "partner_portal_url"
  ],
  "people_change_accommodation": [
    "accommodation_name",
    "customer_name",
    "new_people",
    "old_people",
    "partner_name",
    "partner_portal_url"
  ],
  "guest_details_reminder": [
    "arrival_date",
    "customer_name",
    "portal_link"
  ],
  "arrival_reminder": [
    "arrival_date",
    "customer_name",
    "ferry_info_link",
    "number_of_people",
    "portal_link",
    "reference_number"
  ],
  "accommodation_quote_notification": [
    "accommodation_name",
    "customer_name",
    "description",
    "portal_link",
    "price_per_person_per_night",
    "price_total",
    "valid_until"
  ],
  "status_unavailable": [
    "activity_name",
    "actor_line",
    "customer_name",
    "partner_name",
    "portal_link",
    "status_note"
  ],
  "accommodation_request_customer": [
    "accommodation_type",
    "arrival_date",
    "customer_name",
    "departure_date",
    "number_of_guests",
    "portal_link"
  ],
  "proforma_commission_notification": [
    "amount_excl_vat",
    "commission_amount",
    "commission_percentage",
    "completion_text",
    "customer_name",
    "deadline_date",
    "item_name",
    "partner_name",
    "partner_portal_link",
    "quoted_amount_incl",
    "vat_rate"
  ],
  "quote_offer_customer": [
    "dates",
    "number_of_people",
    "personal_message",
    "portal_url",
    "valid_until"
  ],
  "status_confirmed": [
    "activity_name",
    "actor_line",
    "customer_name",
    "partner_name",
    "portal_link",
    "quoted_price",
    "status_note"
  ],
  "cancellation_accommodation_partner": [
    "accommodation_name",
    "cancellation_reason",
    "customer_name",
    "dates",
    "partner_name"
  ],
  "cancellation_customer": [
    "cancellation_reason",
    "customer_name",
    "dates",
    "programma_url",
    "providers_count"
  ]
};
