
UPDATE public.email_templates
SET body_html = $body$<p style="margin:0 0 12px;color:#4a5568;font-size:16px;">Hoi {{partner_name}},</p>

<p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
  <strong>{{sender_label}}</strong> heeft een bericht over de reservering bij <strong>{{accommodation_name}}</strong> voor {{dates}}.
</p>

<div style="background:#f7fafc;border-left:4px solid #0F4C5C;padding:16px;margin:16px 0;border-radius:4px;">
  <p style="margin:0 0 8px;font-weight:600;color:#0F4C5C;font-size:15px;">{{subject}}</p>
  <p style="margin:0;color:#2d3748;font-size:15px;line-height:1.6;">{{message}}</p>
</div>

<p style="margin:16px 0;padding:12px 16px;background:#fef9e7;border-left:3px solid #f59e0b;border-radius:4px;font-size:14px;color:#744210;line-height:1.5;">
  <strong>Antwoord direct op deze e-mail</strong> — je reactie gaat naar {{reply_info}} en wordt gelogd in je partner-dashboard onder "Berichten met klant".
</p>

{{#if contact_info}}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
<div style="font-size:13px;color:#666;">
  <p style="margin:0 0 6px;color:#4a5568;"><strong>Contactgegevens:</strong></p>
  {{contact_info}}
</div>
{{/if}}$body$,
    updated_at = now()
WHERE id = 'customer_accommodation_message';

UPDATE public.email_templates
SET body_html = $body$<h2 style="color:#0F4C5C;margin:0 0 16px;font-size:20px;">Datumwijziging logiesaanvraag</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 16px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  De klant <strong>{{customer_name}}</strong> heeft de datums van het verblijf gewijzigd. Graag je offerte herzien of opnieuw indienen via het Partner Portal.
</p>

<div style="background:#f7fafc;border-left:4px solid #0F4C5C;padding:16px;margin:20px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Nieuwe periode</p>
  <p style="margin:0 0 12px;color:#0F4C5C;font-size:18px;font-weight:600;">{{arrival_date}} — {{departure_date}}</p>
  <p style="margin:0 0 4px;color:#4a5568;font-size:14px;"><strong>Accommodatie:</strong> {{accommodation_name}}</p>
  <p style="margin:0;color:#4a5568;font-size:14px;"><strong>Aantal gasten:</strong> {{number_of_people}}</p>
</div>

<div style="text-align:center;padding:8px 0 20px;">
  <a href="https://bureauvlieland.nl/partner/login" style="display:inline-block;padding:14px 32px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">Open Partner Portal</a>
</div>

<p style="color:#718096;font-size:14px;margin:16px 0 0;line-height:1.5;">
  Bedankt voor je flexibiliteit — laat het weten als je vragen hebt.
</p>$body$,
    updated_at = now()
WHERE id = 'date_change_accommodation';
