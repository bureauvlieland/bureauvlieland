UPDATE public.email_templates SET body_html = '<h2 style="margin:0 0 20px;color:#0F4C5C;font-size:20px;">Alternatief voorstel, {{customer_name}}</h2>

<p style="margin:0 0 20px;color:#4a5568;font-size:16px;line-height:1.6;">
  <strong>{{partner_name}}</strong> heeft een alternatief voorstel gedaan voor een activiteit uit uw programma:
</p>

<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;background-color:#fffaf0;border-radius:8px;border:1px solid #f6ad55;">
  <tr><td style="padding:20px;">
    <div style="display:inline-block;width:32px;height:32px;background-color:#dd6b20;color:white;border-radius:50%;text-align:center;line-height:32px;font-size:18px;margin-bottom:12px;">↻</div>

    <p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Activiteit</p>
    <p style="margin:0 0 16px;color:#0F4C5C;font-size:18px;font-weight:600;">{{activity_name}}</p>

    <p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Partner</p>
    <p style="margin:0 0 16px;color:#2d3748;font-size:16px;">{{partner_name}}</p>

    {{#if proposed_date}}
    <p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Voorgestelde datum</p>
    <p style="margin:0 0 16px;color:#2d3748;font-size:16px;">{{proposed_date}}</p>
    {{/if}}

    {{#if proposed_time}}
    <p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Voorgestelde tijd</p>
    <p style="margin:0 0 16px;color:#2d3748;font-size:16px;">{{proposed_time}}</p>
    {{/if}}

    {{#if quoted_price}}
    <p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Prijs</p>
    <p style="margin:0 0 16px;color:#2d3748;font-size:16px;font-weight:600;">{{quoted_price}}</p>
    {{/if}}

    {{#if status_note}}
    <p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #f6ad55;color:#4a5568;font-size:14px;">
      <strong>Toelichting van partner:</strong><br/>"{{status_note}}"
    </p>
    {{/if}}
  </td></tr>
</table>

<p style="margin:20px 0;color:#4a5568;font-size:16px;line-height:1.6;">
  Bekijk het voorstel in uw persoonlijke portaal en laat ons weten of u akkoord gaat of een ander tijdstip wenst.
</p>

<div style="text-align:center;padding:8px 0 20px;">
  {{actor_line}}<a href="{{portal_link}}" style="display:inline-block;padding:14px 32px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">Bekijk uw programma</a>
</div>', updated_at = now() WHERE id = 'status_alternative';