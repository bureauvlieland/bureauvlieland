UPDATE public.email_templates
SET body_html = replace(body_html, 'https://bureauvlieland.nl/programma-samenstellen', '{{programma_url}}')
WHERE id = 'cancellation_customer';

UPDATE public.email_templates
SET body_html = replace(body_html, 'https://bureauvlieland.nl/partner/login', '{{partner_portal_url}}')
WHERE id = 'date_change_accommodation';

UPDATE public.email_templates
SET body_html = $$<p style="color:#4a5568;font-size:16px;margin:0 0 16px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Het aantal gasten voor de aanvraag van <strong>{{customer_name}}</strong> is gewijzigd. Graag je offerte herzien of opnieuw indienen via het Partner Portal.
</p>

<div style="background:#f7fafc;border-left:4px solid #0F4C5C;padding:16px;margin:20px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Wijziging</p>
  <p style="margin:0 0 12px;color:#0F4C5C;font-size:18px;font-weight:600;">{{old_people}} → {{new_people}} gasten</p>
  <p style="margin:0;color:#4a5568;font-size:14px;"><strong>Accommodatie:</strong> {{accommodation_name}}</p>
</div>

<div style="text-align:center;padding:8px 0 20px;">
  <a href="{{partner_portal_url}}" style="display:inline-block;padding:14px 32px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">Open Partner Portal</a>
</div>

<p style="color:#718096;font-size:14px;margin:16px 0 0;line-height:1.5;">
  Bedankt voor je flexibiliteit — laat het weten als je vragen hebt.
</p>$$
WHERE id = 'people_change_accommodation';