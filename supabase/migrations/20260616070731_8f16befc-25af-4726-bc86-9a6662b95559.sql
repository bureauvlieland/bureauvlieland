create policy "Authenticated can read email attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'email-attachments');