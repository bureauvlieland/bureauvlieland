-- Add reference_number columns to tables
ALTER TABLE public.program_requests 
ADD COLUMN IF NOT EXISTS reference_number text UNIQUE;

ALTER TABLE public.accommodation_requests 
ADD COLUMN IF NOT EXISTS reference_number text UNIQUE;

ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS reference_number text UNIQUE;

-- Create function to generate reference numbers for program requests (BV-YYMM-NNNN)
CREATE OR REPLACE FUNCTION public.generate_program_reference_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Create function to generate reference numbers for accommodation requests (LOG-YYMM-NNNN)
CREATE OR REPLACE FUNCTION public.generate_accommodation_reference_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_month text;
  next_seq int;
BEGIN
  year_month := to_char(now(), 'YYMM');
  
  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(SUBSTRING(reference_number FROM 'LOG-' || year_month || '-(\d{4})'), '')
        AS integer
      )
    ), 0
  ) + 1 INTO next_seq
  FROM public.accommodation_requests
  WHERE reference_number LIKE 'LOG-' || year_month || '-%';
  
  NEW.reference_number := 'LOG-' || year_month || '-' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Create function to generate reference numbers for partners (P-NNN)
CREATE OR REPLACE FUNCTION public.generate_partner_reference_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_seq int;
BEGIN
  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(SUBSTRING(reference_number FROM 'P-(\d{3})'), '')
        AS integer
      )
    ), 0
  ) + 1 INTO next_seq
  FROM public.partners;
  
  NEW.reference_number := 'P-' || lpad(next_seq::text, 3, '0');
  RETURN NEW;
END;
$$;

-- Create triggers for auto-generation on INSERT
DROP TRIGGER IF EXISTS trigger_generate_program_ref ON public.program_requests;
CREATE TRIGGER trigger_generate_program_ref
  BEFORE INSERT ON public.program_requests
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_program_reference_number();

DROP TRIGGER IF EXISTS trigger_generate_accommodation_ref ON public.accommodation_requests;
CREATE TRIGGER trigger_generate_accommodation_ref
  BEFORE INSERT ON public.accommodation_requests
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_accommodation_reference_number();

DROP TRIGGER IF EXISTS trigger_generate_partner_ref ON public.partners;
CREATE TRIGGER trigger_generate_partner_ref
  BEFORE INSERT ON public.partners
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_partner_reference_number();

-- Generate reference numbers for existing program_requests
UPDATE public.program_requests pr
SET reference_number = 'BV-' || to_char(created_at, 'YYMM') || '-' || lpad(row_num::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY to_char(created_at, 'YYMM') ORDER BY created_at) as row_num
  FROM public.program_requests
  WHERE reference_number IS NULL
) sub
WHERE pr.id = sub.id AND pr.reference_number IS NULL;

-- Generate reference numbers for existing accommodation_requests
UPDATE public.accommodation_requests ar
SET reference_number = 'LOG-' || to_char(created_at, 'YYMM') || '-' || lpad(row_num::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY to_char(created_at, 'YYMM') ORDER BY created_at) as row_num
  FROM public.accommodation_requests
  WHERE reference_number IS NULL
) sub
WHERE ar.id = sub.id AND ar.reference_number IS NULL;

-- Generate reference numbers for existing partners
UPDATE public.partners p
SET reference_number = 'P-' || lpad(row_num::text, 3, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.partners
  WHERE reference_number IS NULL
) sub
WHERE p.id = sub.id AND p.reference_number IS NULL;