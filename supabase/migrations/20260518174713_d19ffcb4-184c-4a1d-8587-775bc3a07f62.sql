UPDATE public.email_templates SET body_html = '<h2 style="color:#0F4C5C;margin:0 0 16px;">Goed nieuws, {{customer_name}}!</h2>
<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 20px;">
  We hebben een nieuwe offerte ontvangen voor uw logies-aanvraag:
</p>

<div style="background-color:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #bbf7d0;">
  <h3 style="margin:0 0 12px;color:#166534;">🏠 {{accommodation_name}}</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:6px 0;color:#666;">Totaalprijs:</td><td style="padding:6px 0;"><strong style="font-size:20px;color:#0F4C5C;">{{price_total}}</strong></td></tr>
    {{#if price_per_person_per_night}}<tr><td style="padding:6px 0;color:#666;">Per persoon/nacht:</td><td style="padding:6px 0;"><strong>{{price_per_person_per_night}}</strong></td></tr>{{/if}}
    <tr><td style="padding:6px 0;color:#666;">Geldig tot:</td><td style="padding:6px 0;"><strong>{{valid_until}}</strong></td></tr>
  </table>
  {{#if description}}<p style="margin:15px 0 0;padding-top:15px;border-top:1px solid #bbf7d0;color:#4a5568;">{{description}}</p>{{/if}}
</div>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 20px;">
  Bekijk alle details en vergelijk met eventuele andere offertes in uw persoonlijke omgeving:
</p>

<div style="text-align:center;margin:24px 0;">
  <a href="{{portal_link}}" style="display:inline-block;padding:14px 32px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">Bekijk offerte →</a>
</div>

<p style="color:#718096;font-size:14px;text-align:center;margin:0;">U ontvangt automatisch bericht bij nieuwe offertes.</p>', updated_at = now() WHERE id = 'accommodation_quote_notification';