ALTER TABLE public.accommodation_quote_extras
  ADD COLUMN service_date date,
  ADD COLUMN service_time time without time zone;