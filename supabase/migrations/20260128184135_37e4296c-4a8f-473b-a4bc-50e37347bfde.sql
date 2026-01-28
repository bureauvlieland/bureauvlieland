-- =====================================================
-- Uniforme Klant-URL Architectuur: Automatische koppeling
-- =====================================================

-- Functie die automatisch een program_request aanmaakt bij nieuwe accommodation_request
CREATE OR REPLACE FUNCTION public.create_program_for_accommodation()
RETURNS trigger AS $$
DECLARE
  new_program_id uuid;
  new_program_token text;
BEGIN
  -- Genereer een uniek token voor het program
  new_program_token := encode(gen_random_bytes(12), 'hex');
  
  -- Maak automatisch een gekoppeld program_request aan
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
  
  -- Koppel het program terug aan de accommodation request
  NEW.linked_program_id := new_program_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Maak de trigger aan
DROP TRIGGER IF EXISTS auto_create_program_for_accommodation ON public.accommodation_requests;
CREATE TRIGGER auto_create_program_for_accommodation
  BEFORE INSERT ON public.accommodation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_program_for_accommodation();

-- =====================================================
-- Migratie bestaande data: Link standalone accommodations
-- =====================================================

-- Tijdelijke functie om bestaande standalone accommodations te migreren
DO $$
DECLARE
  acc RECORD;
  new_program_id uuid;
  new_program_token text;
BEGIN
  -- Loop door alle accommodation_requests zonder gekoppeld program
  FOR acc IN 
    SELECT * FROM public.accommodation_requests 
    WHERE linked_program_id IS NULL
  LOOP
    -- Genereer een uniek token
    new_program_token := encode(gen_random_bytes(12), 'hex');
    
    -- Maak een program_request aan
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
      acc.customer_name,
      acc.customer_email,
      acc.customer_phone,
      acc.customer_company,
      acc.number_of_guests,
      jsonb_build_array(acc.arrival_date::text, acc.departure_date::text),
      acc.id,
      'active'
    )
    RETURNING id INTO new_program_id;
    
    -- Update de accommodation request met de link
    UPDATE public.accommodation_requests
    SET linked_program_id = new_program_id
    WHERE id = acc.id;
    
    RAISE NOTICE 'Migrated accommodation % -> program %', acc.id, new_program_id;
  END LOOP;
END $$;