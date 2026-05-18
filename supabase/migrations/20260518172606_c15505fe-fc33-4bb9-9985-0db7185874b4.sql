UPDATE public.email_templates SET body_html = $$<h2 style="color:#0F4C5C;margin:0 0 16px;">📋 Nieuwe offerteaanvraag ontvangen</h2>

<div style="background:#f7fafc;padding:20px;border-radius:8px;margin:20px 0;">
  <h3 style="margin:0 0 12px;color:#2d3748;">Contactgegevens</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:5px 0;color:#666;">Naam:</td><td style="padding:5px 0;"><strong>{{customer_name}}</strong></td></tr>
    {{#if company_name}}<tr><td style="padding:5px 0;color:#666;">Bedrijf:</td><td style="padding:5px 0;"><strong>{{company_name}}</strong></td></tr>{{/if}}
    <tr><td style="padding:5px 0;color:#666;">E-mail:</td><td style="padding:5px 0;"><a href="mailto:{{customer_email}}" style="color:#0F4C5C;">{{customer_email}}</a></td></tr>
    <tr><td style="padding:5px 0;color:#666;">Telefoon:</td><td style="padding:5px 0;"><a href="tel:{{customer_phone}}" style="color:#0F4C5C;">{{customer_phone}}</a></td></tr>
  </table>
</div>

<div style="background:#f7fafc;padding:20px;border-radius:8px;margin:20px 0;">
  <h3 style="margin:0 0 12px;color:#2d3748;">📅 Evenement-details</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:5px 0;color:#666;">Aantal personen:</td><td style="padding:5px 0;"><strong>{{number_of_people}}</strong></td></tr>
    <tr><td style="padding:5px 0;color:#666;">Gewenste startdatum:</td><td style="padding:5px 0;"><strong>{{start_date}}</strong></td></tr>
    <tr><td style="padding:5px 0;color:#666;">Aantal dagen:</td><td style="padding:5px 0;"><strong>{{number_of_days}}</strong></td></tr>
    <tr><td style="padding:5px 0;color:#666;">Budget-indicatie:</td><td style="padding:5px 0;"><strong>{{budget_per_person}}</strong></td></tr>
  </table>
</div>

{{#if description}}
<div style="background:#fffbeb;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #f59e0b;">
  <h3 style="margin:0 0 12px;color:#b45309;">💬 Omschrijving / bijzondere wensen</h3>
  <p style="margin:0;white-space:pre-line;">{{description}}</p>
</div>
{{/if}}$$
WHERE id = 'quote_request_bureau';