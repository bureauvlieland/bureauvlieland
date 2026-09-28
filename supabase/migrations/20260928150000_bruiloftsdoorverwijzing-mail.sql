-- Doorverwijsknop voor bruiloftsaanvragen (docs/plan-bruiloftsdoorverwijzingen.md, fase 2).
--
-- De standaardmail aan het bruidspaar, met de partner in cc. Bewerkbaar
-- onder Systeem → Email Templates. De edge function send-wedding-referral
-- rendert hem als voorzet in het dialoog; de admin past de tekst aan en
-- verstuurt. De verzonden mail wordt aan de doorverwijzing gekoppeld
-- (wedding_referrals.referral_email_log_id).

insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'wedding_referral_customer',
  'Bruiloft — doorverwijzing naar partner',
  'Mail aan het bruidspaar waarin Bureau Vlieland de aanvraag doorverwijst naar een partner; de partner staat in cc. Voorzet in het dialoog "Doorverwijzen naar…", daar nog te bewerken.',
  'Uw bruiloft op Vlieland: wij verwijzen u door naar {{partner_name}}',
  $body$
<p>Beste {{customer_name}},</p>

<p>Hartelijk dank voor uw aanvraag voor een bruiloft op Vlieland{{#if expected_wedding_date}}, met {{expected_wedding_date}} in gedachten{{/if}}. Wat mooi dat u aan het eiland denkt voor deze dag.</p>

<p>Bureau Vlieland organiseert zelf geen bruiloften meer; wij richten ons op groepsuitjes en zakelijke programma's. Bruiloften laten wij graag over aan {{partner_name}}, die daar op Vlieland de meeste ervaring mee heeft. Wij hebben {{partner_name}} in deze mail meegenomen (cc), zodat zij rechtstreeks contact met u kunnen opnemen.</p>

<p>U kunt {{partner_name}} ook zelf bereiken:</p>
<ul>
  <li>E-mail: {{partner_email}}</li>
  {{#if partner_phone}}<li>Telefoon: {{partner_phone}}</li>{{/if}}
  {{#if partner_website}}<li>Website: {{partner_website}}</li>{{/if}}
</ul>

{{#if number_of_people}}<p>Wij hebben doorgegeven dat u rekent op ongeveer {{number_of_people}} gasten.</p>{{/if}}

<p>Wij wensen u een prachtige dag op Vlieland.</p>

<p>Met hartelijke groet,<br>Het team van Bureau Vlieland</p>
$body$,
  '["customer_name","partner_name","partner_email","partner_phone","partner_website","expected_wedding_date","number_of_people"]'::jsonb,
  true
)
on conflict (id) do nothing;
