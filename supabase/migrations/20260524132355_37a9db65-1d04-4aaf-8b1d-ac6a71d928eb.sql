-- Backfill: strip public URL prefix from quote_attachment_path so it stores raw object paths
UPDATE public.accommodation_quotes
SET quote_attachment_path = regexp_replace(
  quote_attachment_path,
  '^https?://[^/]+/storage/v1/object/public/accommodation-quote-attachments/',
  ''
)
WHERE quote_attachment_path IS NOT NULL
  AND quote_attachment_path LIKE 'http%';

-- Lock down the bucket: remove anonymous public read and make it private.
DROP POLICY IF EXISTS "Public can read quote attachments" ON storage.objects;

UPDATE storage.buckets
SET public = false
WHERE id = 'accommodation-quote-attachments';