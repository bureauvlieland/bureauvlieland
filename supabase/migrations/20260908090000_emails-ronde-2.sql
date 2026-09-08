-- E-mails, ronde 2 (8 september 2026).
--
-- 1. Nazorgmail: de knop "Review op bureauvlieland.nl" alleen tonen als er een
--    eigen reviewpagina is ingesteld. Die pagina bestaat niet (404), dus de
--    instelling wordt leeggemaakt en de mail toont alleen de Google-knop.
update public.email_templates
   set body_html = replace(body_html, $old$    <td>
      <a href="{{own_review_url}}" style="display:inline-block; background:#E36414; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
        ✍️ Review op bureauvlieland.nl
      </a>
    </td>$old$, $new$    {{#if own_review_url}}<td>
      <a href="{{own_review_url}}" style="display:inline-block; background:#E36414; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
        ✍️ Review op bureauvlieland.nl
      </a>
    </td>{{/if}}$new$)
 where id = 'customer_aftersales_review';

update public.app_settings
   set value = to_jsonb(''::text), updated_at = now()
 where id = 'customer_aftersales_review_url';

-- 7. Zes templates die door geen enkele functie worden verstuurd. De code
--    (TemplateIds, snapshot, admin-labels) is in dezelfde wijziging opgeschoond.
delete from public.email_templates
 where id in ('date_change_partner', 'date_change_accommodation', 'people_change_accommodation',
              'reminder_customer_quote', 'reminder_customer_request', 'reminder_partner_quote');
