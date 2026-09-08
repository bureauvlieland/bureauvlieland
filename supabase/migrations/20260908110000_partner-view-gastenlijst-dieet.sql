-- Logiespartner ziet de gastenlijst en dieetwensen die de klant op de
-- klantpagina invult (staan op program_requests, niet op de logiesaanvraag).
-- De partner-veilige view krijgt er twee kolommen bij; de rest is ongewijzigd
-- ten opzichte van 20260704055019.
CREATE OR REPLACE VIEW public.partner_accommodation_requests_safe
WITH (security_invoker=on) AS
SELECT ar.id, ar.reference_number, ar.status, ar.created_at, ar.updated_at, ar.expires_at,
  ar.arrival_date, ar.departure_date, ar.number_of_guests, ar.accommodation_type,
  ar.room_count, ar.room_occupancy, ar.room_types, ar.location_preference,
  ar.facilities_required, ar.budget_range, ar.special_requests, ar.wants_activities,
  ar.linked_program_id, ar.room_assignment, ar.guest_details_updated_at,
  ar.completion_status, ar.completed_at,
  ar.customer_name, ar.customer_email, ar.customer_phone, ar.customer_company,
  pr.guest_names   AS program_guest_names,
  pr.dietary_notes AS program_dietary_notes
FROM public.accommodation_requests ar
LEFT JOIN public.program_requests pr ON pr.id = ar.linked_program_id
WHERE public.is_admin(auth.uid())
   OR EXISTS (
     SELECT 1 FROM public.accommodation_quotes aq
     WHERE aq.request_id = ar.id
       AND aq.partner_id = public.get_partner_id(auth.uid())
   );
