UPDATE public.email_templates
SET body_html = replace(
  body_html,
  'Afhankelijk van het project factureer je jouw diensten <strong>rechtstreeks aan de eindklant</strong> of aan <strong>Bureau Vlieland</strong>. Dit wordt per project afgestemd. Bureau Vlieland stuurt je periodiek een commissiefactuur over de gerealiseerde omzet:',
  'Bureau Vlieland verzorgt <strong>centraal de facturatie aan de klant</strong>. Jij stuurt jouw factuur (voor de geoffreerde prijs) naar <a href="mailto:facturatie@bureauvlieland.nl">facturatie@bureauvlieland.nl</a> — niet rechtstreeks naar de klant. Bureau Vlieland brengt vervolgens commissie in rekening over de gerealiseerde omzet:'
)
WHERE id = 'partner_invitation';

UPDATE public.email_templates
SET body_html = '<h2>Nieuwe Programma Aanvraag</h2><h3>Contactgegevens</h3><p><strong>Naam:</strong> {{customer_name}}</p>{{#if customer_company}}<p><strong>Bedrijf:</strong> {{customer_company}}</p>{{/if}}<p><strong>Email:</strong> {{customer_email}}</p><p><strong>Telefoon:</strong> {{customer_phone}}</p><h3>Programma Details</h3><p><strong>Aantal personen:</strong> {{number_of_people}}</p><p><strong>Gewenste datum:</strong> {{selected_date}}</p><p><strong>Handling fee:</strong> € {{bureau_fee}}</p><p style="background:#f8f9fa;padding:10px 14px;border-left:3px solid #0F4C5C;font-size:13px;color:#334155;"><strong>Facturatie:</strong> Bureau Vlieland factureert centraal alle onderdelen aan de klant (bureau-centraal model). De onderstaande splitsing gaat over wie het onderdeel <em>uitvoert</em>, niet over wie factureert.</p>{{#if bureau_items}}<h3>Door Bureau Vlieland zelf uitgevoerd</h3><ul>{{bureau_items}}</ul>{{/if}}{{#if partner_items}}<h3>Door te zetten naar partners</h3><ul>{{partner_items}}</ul>{{/if}}{{#if self_arranged_items}}<h3>Zelf te regelen door klant</h3><ul>{{self_arranged_items}}</ul>{{/if}}{{#if notes}}<h3>Algemene opmerkingen / Wensen</h3><p>{{notes}}</p>{{/if}}'
WHERE id = 'program_request_bureau';