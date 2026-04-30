INSERT INTO public.email_templates (id, name, subject, body_html, variables, is_active, description) VALUES
('presales_intake_followup',
 'Pre-sales — Aanvraag opvolgen',
 'Aanvulling op uw aanvraag — {{reference_number}}',
 '<p>Beste {{customer_name}},</p>
<p>Hartelijk dank voor uw aanvraag bij Bureau Vlieland. Voordat wij een passend voorstel kunnen samenstellen, hebben wij nog enkele aanvullende gegevens nodig:</p>
<ul>
  <li><em>(vul hier uw vragen in)</em></li>
</ul>
<p>Zodra wij uw reactie ontvangen, gaan wij voor u aan de slag.</p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>',
 '["customer_name","reference_number"]'::jsonb,
 true,
 'Pre-sales: aanvullende vragen aan klant voor het uitwerken van een voorstel'),
('presales_clarification',
 'Pre-sales — Verduidelijking wensen',
 'Even afstemmen — uw aanvraag {{reference_number}}',
 '<p>Beste {{customer_name}},</p>
<p>Wij zijn bezig met het uitwerken van een passend programma voor {{number_of_people}} personen. Om dit zo goed mogelijk aan te laten sluiten op uw wensen, willen wij graag het volgende met u afstemmen:</p>
<p><em>(beschrijf hier uw vragen)</em></p>
<p>U mag uw reactie eenvoudig op deze e-mail beantwoorden — wij ontvangen deze direct in uw projectdossier.</p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>',
 '["customer_name","reference_number","number_of_people"]'::jsonb,
 true,
 'Pre-sales: aanvullende afstemming over wensen voor een aanvraag'),
('presales_proposal_intro',
 'Pre-sales — Voorstel komt eraan',
 'Wij gaan voor u aan de slag — {{reference_number}}',
 '<p>Beste {{customer_name}},</p>
<p>Hartelijk dank voor uw aanvraag voor {{number_of_people}} personen. Wij zijn nu uw voorstel aan het samenstellen en koppelen u zo spoedig mogelijk een uitgewerkt programma terug.</p>
<p>Heeft u in de tussentijd nog aanvullende wensen of vragen? Beantwoord dan eenvoudig deze e-mail.</p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>',
 '["customer_name","reference_number","number_of_people"]'::jsonb,
 true,
 'Pre-sales: bevestigen dat voorstel in behandeling is'),
('presales_partner_question',
 'Pre-sales — Vraag aan partner',
 'Vraag over een aanvraag — {{reference_number}}',
 '<p>Hi {{partner_name}},</p>
<p>Voor een aanvraag van een klant hebben we even jouw input nodig:</p>
<p><em>(vul hier je vraag in)</em></p>
<p>Je mag deze mail eenvoudig beantwoorden — je antwoord komt automatisch in het projectdossier.</p>
<p>Groet,<br/>Bureau Vlieland</p>',
 '["partner_name","reference_number"]'::jsonb,
 true,
 'Pre-sales: vraag aan partner over een (potentiële) aanvraag')
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  subject     = EXCLUDED.subject,
  body_html   = EXCLUDED.body_html,
  variables   = EXCLUDED.variables,
  description = EXCLUDED.description,
  is_active   = true,
  updated_at  = now();