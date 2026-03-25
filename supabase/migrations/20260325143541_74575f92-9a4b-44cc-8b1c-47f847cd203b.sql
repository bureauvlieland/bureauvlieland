UPDATE email_templates 
SET body_html = REPLACE(
  body_html,
  '<tr><td style="padding: 5px 0; color: #666;">Totaalprijs:</td><td style="padding: 5px 0;"><strong style="font-size: 18px; color: #16a34a;">{{price_total}}</strong></td></tr>',
  '{{extras_list}}<tr><td style="padding: 5px 0; color: #666;">Totaalprijs:</td><td style="padding: 5px 0;"><strong style="font-size: 18px; color: #16a34a;">{{price_total}}</strong></td></tr>'
),
updated_at = now()
WHERE id = 'accommodation_selected_partner';