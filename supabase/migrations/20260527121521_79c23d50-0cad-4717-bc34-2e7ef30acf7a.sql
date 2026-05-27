
CREATE OR REPLACE FUNCTION public.generate_program_reference_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_month text;
  next_seq int;
BEGIN
  year_month := to_char(now(), 'YYMM');
  
  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(SUBSTRING(reference_number FROM 'BV-' || year_month || '-(\d{4})'), '')
        AS integer
      )
    ), 0
  ) + 1 INTO next_seq
  FROM public.program_requests
  WHERE reference_number LIKE 'BV-' || year_month || '-%';
  
  NEW.reference_number := 'BV-' || year_month || '-' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END;
$function$;
