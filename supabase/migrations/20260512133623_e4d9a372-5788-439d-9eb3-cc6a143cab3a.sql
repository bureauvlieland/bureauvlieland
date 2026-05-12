
INSERT INTO public.email_templates (id, name, description, subject, body_html, variables, is_active)
VALUES (
  'arrival_reminder',
  'arrival_reminder',
  'Enthousiaste aankomstherinnering aan klant, een paar dagen voor de eerste programmadag. Bevat het Word-programma als bijlage en uitleg over Rederij Doeksen.',
  'Over een paar dagen bent u op Vlieland — uw programma & aankomstinformatie',
  $HTML$<div style="font-family: Arial, sans-serif; color:#1f2937; max-width:640px; line-height:1.55;">
  <p>Beste {{customer_name}},</p>

  <p>Nog een paar nachtjes slapen — op <strong>{{arrival_date}}</strong> verwelkomen wij u en uw groep op Vlieland! Wij hebben er zin in.</p>

  <p>In de bijlage vindt u het volledige programma met alle tijden, locaties en kaartjes. U kunt het programma ook altijd online bekijken via uw <a href="{{portal_link}}">persoonlijke portaal</a>.</p>

  <h3 style="margin-top:28px; margin-bottom:8px;">Reis met Rederij Doeksen</h3>
  <p>De boot vertrekt vanuit Harlingen Haven. Houd er rekening mee ruim op tijd aanwezig te zijn — minimaal 30 minuten voor vertrek. De actuele vertrektijden vindt u op <a href="{{ferry_info_link}}">rederij-doeksen.nl</a>.</p>

  <h3 style="margin-top:24px; margin-bottom:8px;">Reist u met een groepsticket?</h3>
  <p>Meld u zich dan bij aankomst in Harlingen bij de <strong>klantenservicebalie van Rederij Doeksen</strong>. Daar ontvangt u uw tickets, waarna u als groep door de ticketcontrole kunt.</p>

  <p style="margin-top:24px;">Heeft u nog vragen? Stuur gerust een bericht via uw portaal of antwoord op deze mail.</p>

  <p style="margin-top:24px;">Tot snel op Vlieland!<br/>
  Hartelijke groet,<br/>
  <strong>Bureau Vlieland</strong></p>

  <p style="font-size:12px; color:#6b7280; margin-top:32px;">Referentie: {{reference_number}} · Aantal personen: {{number_of_people}}</p>
</div>$HTML$,
  '["customer_name","arrival_date","number_of_people","reference_number","ferry_info_link","portal_link"]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE
SET subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    description = EXCLUDED.description,
    variables = EXCLUDED.variables,
    is_active = true,
    updated_at = now();
