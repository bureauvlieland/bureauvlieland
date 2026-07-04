CREATE OR REPLACE VIEW public.partner_accommodation_requests_safe
WITH (security_invoker=on) AS
SELECT id, reference_number, status, created_at, updated_at, expires_at,
  arrival_date, departure_date, number_of_guests, accommodation_type,
  room_count, room_occupancy, room_types, location_preference,
  facilities_required, budget_range, special_requests, wants_activities,
  linked_program_id, room_assignment, guest_details_updated_at,
  completion_status, completed_at,
  customer_name, customer_email, customer_phone, customer_company
FROM public.accommodation_requests ar
WHERE public.is_admin(auth.uid())
   OR EXISTS (
     SELECT 1 FROM public.accommodation_quotes aq
     WHERE aq.request_id = ar.id
       AND aq.partner_id = public.get_partner_id(auth.uid())
   );