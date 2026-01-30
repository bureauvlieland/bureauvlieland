-- Fix the trigger function using the correct schema for gen_random_bytes
-- In Supabase, pgcrypto is installed in the 'extensions' schema
CREATE OR REPLACE FUNCTION public.create_program_for_accommodation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_program_id uuid;
  new_program_token text;
BEGIN
  -- Generate a unique token using pgcrypto's gen_random_bytes from extensions schema
  new_program_token := encode(extensions.gen_random_bytes(12), 'hex');
  
  -- Create the linked program_request
  INSERT INTO public.program_requests (
    customer_token,
    customer_name,
    customer_email,
    customer_phone,
    customer_company,
    number_of_people,
    selected_dates,
    linked_accommodation_id,
    status
  ) VALUES (
    new_program_token,
    NEW.customer_name,
    NEW.customer_email,
    NEW.customer_phone,
    NEW.customer_company,
    NEW.number_of_guests,
    jsonb_build_array(NEW.arrival_date::text, NEW.departure_date::text),
    NEW.id,
    'active'
  )
  RETURNING id INTO new_program_id;
  
  -- Link the program back to the accommodation request
  NEW.linked_program_id := new_program_id;
  
  RETURN NEW;
END;
$function$;

-- Fix defaults to use extensions schema
ALTER TABLE public.accommodation_requests 
ALTER COLUMN customer_token SET DEFAULT encode(extensions.gen_random_bytes(16), 'hex');

ALTER TABLE public.partners 
ALTER COLUMN partner_token SET DEFAULT encode(extensions.gen_random_bytes(12), 'hex');