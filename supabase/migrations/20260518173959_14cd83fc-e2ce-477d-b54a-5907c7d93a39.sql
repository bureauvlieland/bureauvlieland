-- 9. cancellation_customer: fix variable name
UPDATE public.email_templates SET body_html = '<h2 style="color:#0F4C5C;margin:0 0 16px;">Aanvraag geannuleerd</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 16px;">Beste {{customer_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Uw aanvraag voor <strong>{{dates}}</strong> is succesvol geannuleerd.
</p>

{{#if cancellation_reason}}
<div style="background:#f7fafc;padding:15px;border-radius:8px;margin:20px 0;">
  <p style="margin:0;color:#4a5568;"><strong>Reden:</strong> {{cancellation_reason}}</p>
</div>
{{/if}}

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Alle {{providers_count}} betrokken aanbieder(s) zijn automatisch op de hoogte gesteld.
</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 20px;">
  Wilt u toch een programma samenstellen? U kunt altijd een nieuwe aanvraag indienen via onze website.
</p>

<div style="text-align:center;margin:24px 0;">
  <a href="https://bureauvlieland.nl/programma-samenstellen" style="display:inline-block;padding:14px 32px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">Nieuw programma samenstellen</a>
</div>', updated_at = now() WHERE id = 'cancellation_customer';

-- 10. cancellation_partner: Mustache → Handlebars + brand heading
UPDATE public.email_templates SET body_html = '<h2 style="color:#0F4C5C;margin:0 0 16px;font-size:20px;">Aanvraag geannuleerd</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 16px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Hierbij laten we je weten dat aanvraag <strong>{{reference_number}}</strong>{{#if customer_name}} van {{customer_name}}{{/if}} is geannuleerd.
</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 12px;">De volgende onderdelen komen daarmee te vervallen:</p>

<div style="background:#f7fafc;padding:12px 16px;border-radius:6px;margin:12px 0;color:#4a5568;">{{cancelled_items}}</div>

{{#if cancellation_reason}}
<div style="background:#fffaf0;border-left:4px solid #f6ad55;padding:12px 16px;margin:16px 0;">
  <p style="margin:0;color:#4a5568;"><strong>Reden:</strong> {{cancellation_reason}}</p>
</div>
{{/if}}

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:16px 0 0;">
  Je hoeft verder niets te doen. Heb je vragen, mail of bel ons gerust.
</p>', updated_at = now() WHERE id = 'cancellation_partner';

-- 11. cancellation_accommodation_partner: strip duplicate skeleton + brand color
UPDATE public.email_templates SET body_html = '<h2 style="color:#0F4C5C;margin:0 0 16px;font-size:20px;">Logiesaanvraag geannuleerd</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 16px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  De klant heeft de aanvraag voor <strong>{{dates}}</strong> geannuleerd. Hierdoor vervalt ook de logiesaanvraag.
</p>

<div style="background:#f7fafc;padding:16px;border-radius:8px;margin:20px 0;color:#4a5568;">
  <p style="margin:0 0 10px 0;"><strong>Accommodatie:</strong> {{accommodation_name}}</p>
  {{#if cancellation_reason}}
  <p style="margin:10px 0 0 0;padding-top:10px;border-top:1px solid #e2e8f0;"><strong>Reden:</strong> {{cancellation_reason}}</p>
  {{/if}}
</div>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:16px 0 0;">
  Je hoeft verder geen actie te ondernemen. Je offerte is automatisch ingetrokken.
</p>', updated_at = now() WHERE id = 'cancellation_accommodation_partner';