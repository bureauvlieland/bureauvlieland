
-- Allow admins to soft-delete program requests (update status to 'deleted')
-- We use UPDATE policy (already exists) rather than DELETE for soft-delete approach

-- Also allow admins to update accommodation_requests (for unlinking)
CREATE POLICY "Admins can update accommodation requests"
ON public.accommodation_requests FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));
