
-- cancellation_customer: "Wil je toch" → "Wilt u toch"
UPDATE public.email_templates
SET body_html = replace(body_html, 'Wil je toch een programma samenstellen?', 'Wilt u toch een programma samenstellen?'),
    updated_at = now()
WHERE id = 'cancellation_customer';

-- accommodation_request_customer: replace residual "je" with formal "u"
UPDATE public.email_templates
SET body_html = regexp_replace(
                  regexp_replace(body_html, '\mje\M', 'u', 'g'),
                '\mJe\M', 'U', 'g'),
    updated_at = now()
WHERE id = 'accommodation_request_customer';

-- accommodation_selected_partner: residual "U"
UPDATE public.email_templates
SET body_html = regexp_replace(body_html, '\mU\M', 'Je', 'g'),
    updated_at = now()
WHERE id = 'accommodation_selected_partner';
