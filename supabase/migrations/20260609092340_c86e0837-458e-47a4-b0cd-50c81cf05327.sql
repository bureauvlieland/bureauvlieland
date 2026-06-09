
INSERT INTO public.email_templates (id, name, description, subject, body_html, variables, is_active) VALUES
('sales_followup_offer_3d',
 'Sales — Opvolging offerte (3 dagen)',
 'Vriendelijke check-in 3 dagen na verzending offerte — kan ik u ergens mee helpen?',
 'Kan ik u ergens mee helpen? — {{reference_number}}',
 '<p>Beste {{customer_name}},</p>
<p>Een paar dagen geleden stuurde ik u ons voorstel voor uw verblijf op Vlieland. Ik kan mij goed voorstellen dat u het druk heeft en er nog even niet aan toegekomen bent — daar wil ik graag bij helpen.</p>
<p>Loopt u ergens tegenaan, heeft u nog vragen of wilt u op onderdelen schuiven (data, aantallen, activiteiten)? Laat het mij gerust weten, dan denk ik graag met u mee.</p>
<p>U kunt het voorstel rustig nalezen via uw persoonlijke pagina:</p>
<p><a href="{{portal_url}}">Bekijk uw voorstel</a></p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>',
 '["customer_name","reference_number","portal_url"]'::jsonb,
 true),
('sales_followup_offer_7d',
 'Sales — Laatste herinnering offerte (7 dagen)',
 'Laatste vriendelijke herinnering 7 dagen na offerte, met aanbod tot bellen',
 'Mag ik nog even met u meedenken? — {{reference_number}}',
 '<p>Beste {{customer_name}},</p>
<p>Een week geleden ontving u van ons het voorstel voor uw verblijf op Vlieland. Ik hoor graag of het past bij wat u voor ogen heeft, of dat we het op punten nog moeten bijschaven.</p>
<p>Soms is even bellen makkelijker dan mailen — dat doe ik graag. Belt u liever zelf? Wij zijn bereikbaar op <strong>0562 700 208</strong>. Of laat een moment weten dat u uitkomt, dan bel ik u op een tijdstip dat u schikt.</p>
<p>U kunt uw voorstel nog steeds inzien:</p>
<p><a href="{{portal_url}}">Bekijk uw voorstel</a></p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>',
 '["customer_name","reference_number","portal_url"]'::jsonb,
 true),
('sales_pre_signing',
 'Sales — Voor ondertekening voorwaarden',
 'Klant heeft akkoord gegeven op voorstel; uitnodiging om voorwaarden door te nemen en te ondertekenen',
 'Mooi dat u kiest voor Bureau Vlieland — laatste stap: bevestiging',
 '<p>Beste {{customer_name}},</p>
<p>Wat fijn dat u akkoord bent op het voorstel — daar zijn wij blij mee. Wij gaan zo voor u aan de slag.</p>
<p>Voordat wij de boeking definitief maken, vragen wij u om de reserveringsvoorwaarden door te nemen en uw akkoord te geven. Zo weten wij allebei waar we aan toe zijn en kunnen wij uw partners zonder onnodige vertraging vastleggen.</p>
<p><a href="{{portal_url}}">Naar uw persoonlijke pagina om te bevestigen</a></p>
<p>Heeft u nog een vraag over de voorwaarden of een onderdeel van het voorstel? Bel of mail mij gerust — ik denk graag met u mee.</p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>',
 '["customer_name","portal_url"]'::jsonb,
 true),
('sales_post_signing_welcome',
 'Sales — Welkom na ondertekening',
 'Bedankmail na akkoord met voorwaarden; uitleg over de volgende stappen tot aan aankomst',
 'Bedankt voor uw boeking — dit zijn de volgende stappen',
 '<p>Beste {{customer_name}},</p>
<p>Hartelijk dank voor uw bevestiging. Uw boeking voor Vlieland staat genoteerd — wij hebben er zin in om er samen met u een mooi verblijf van te maken.</p>
<p><strong>Wat gaat er nu gebeuren?</strong></p>
<ul>
  <li>Wij leggen alle onderdelen vast bij onze partners op het eiland.</li>
  <li>Ongeveer tien dagen voor aankomst sturen wij u een definitieve programmaversie met aankomstinformatie en bootgegevens.</li>
  <li>Wij verzoeken u rond die tijd ook om de gastenlijst en eventuele wensen (dieet, allergieën) door te geven.</li>
  <li>U kunt op uw persoonlijke pagina altijd het volledige programma terugzien en eventueel nog kleine wijzigingen doorgeven.</li>
</ul>
<p><a href="{{portal_url}}">Bekijk uw programma</a></p>
<p>Heeft u tussentijds een vraag? Wij staan voor u klaar via hallo@bureauvlieland.nl of 0562 700 208.</p>
<p>Tot snel op Vlieland.</p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>',
 '["customer_name","portal_url"]'::jsonb,
 true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables,
  is_active = true,
  updated_at = now();
