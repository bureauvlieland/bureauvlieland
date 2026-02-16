INSERT INTO public.app_settings (id, category, label, description, value, value_type)
VALUES (
  'default_quote_personal_message',
  'quotes',
  'Standaard mailtekst offerte',
  'Standaardtekst die geladen kan worden bij het versturen van een offerte naar de klant.',
  '"Hierbij ontvangt u ons maatwerkvoorstel voor uw verblijf op Vlieland. We hebben met zorg een programma samengesteld op basis van uw wensen.\n\nIn de bijlage vindt u een overzicht van het voorgestelde programma. Na uw akkoord nemen wij contact op met de betrokken partners om beschikbaarheid en definitieve prijzen te bevestigen.\n\nHeeft u vragen of wilt u aanpassingen? Neem dan gerust contact met ons op."',
  'textarea'
)
ON CONFLICT (id) DO NOTHING;