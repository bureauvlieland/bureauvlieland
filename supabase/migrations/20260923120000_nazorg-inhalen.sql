-- Nazorgmail inhalen voor programma's die langer dan een maand geleden waren.
-- send-customer-aftersales zet dan `late_intro`; de openingsalinea krijgt
-- daarvoor een eigen tekst. Alleen de eerste alinea wordt vervangen; is die
-- in admin al aangepast, dan verandert er niets.
update public.email_templates
   set body_html = replace(
         body_html,
         $old$<p>Hartelijk dank dat u met uw gezelschap voor Vlieland en voor Bureau Vlieland heeft gekozen. We hopen dat u heeft genoten van uw {{#if program_date_label}}{{program_date_label}}{{else}}bezoek{{/if}} en dat alles naar wens is verlopen.</p>$old$,
         $new${{#if late_intro}}<p>Een tijdje geleden was u met uw gezelschap op Vlieland{{#if program_date_label}} ({{program_date_label}}){{/if}}. Nogmaals hartelijk dank dat u daarvoor Bureau Vlieland heeft gekozen. We hopen dat u er met plezier op terugkijkt.</p>{{else}}<p>Hartelijk dank dat u met uw gezelschap voor Vlieland en voor Bureau Vlieland heeft gekozen. We hopen dat u heeft genoten van uw {{#if program_date_label}}{{program_date_label}}{{else}}bezoek{{/if}} en dat alles naar wens is verlopen.</p>{{/if}}$new$
       ),
       updated_at = now()
 where id = 'customer_aftersales_review';
