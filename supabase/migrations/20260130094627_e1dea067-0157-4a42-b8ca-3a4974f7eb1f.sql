-- Drop the existing trigger first
DROP TRIGGER IF EXISTS create_program_for_accommodation_trigger ON public.accommodation_requests;

-- Recreate the function as an AFTER INSERT trigger
-- This ensures the accommodation_request exists before we create the linked program_request
CREATE OR REPLACE FUNCTION public.create_program_for_accommodation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_program_id uuid;
  new_program_token text;
BEGIN
  -- Generate a unique token using pgcrypto's gen_random_bytes from extensions schema
  new_program_token := encode(extensions.gen_random_bytes(12), 'hex');
  
  -- Create the linked program_request
  -- Now NEW.id exists because this is an AFTER INSERT trigger
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
  
  -- Update the accommodation_request to link back to the program
  UPDATE public.accommodation_requests 
  SET linked_program_id = new_program_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger as AFTER INSERT instead of BEFORE INSERT
CREATE TRIGGER create_program_for_accommodation_trigger
  AFTER INSERT ON public.accommodation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_program_for_accommodation();