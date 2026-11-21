-- Dode e-mailtemplates verwijderen (docs/plan-notificaties.md, fase 0 "Dood"
-- en fase 3). Geen enkele edge function rendert deze ids nog; de code
-- (TemplateIds, snapshot emailTemplateVariables.ts, admin-groepering) is in
-- dezelfde wijziging opgeschoond.
--
-- - quote_request_bureau, quote_request_customer: hoorden bij de verwijderde
--   functie send-quote-request; het offerteformulier /offerte is in oktober
--   opgeheven (redirect naar /programma-op-maat).
-- - partner_intro_portal: hoorde bij de verwijderde functie
--   send-partner-intro-email (eenmalige introductiemailing, geen aanroeper).
-- - partner_briefing_t3: de T-3-mail aan partners heet partner_headsup_t3 en
--   krijgt in fase 3 een eigen template; deze oude variant werd nergens
--   gerenderd.
-- - proforma_commission_notification: beschrijft een bezwaarronde die niet
--   bestaat; de commissiefactuur gaat via send-commission-invoice-to-partner.
-- - sales_* en presales_*: ooit bedoeld voor compose-followup-email, maar die
--   functie en _shared/emailComposerIntents.ts gebruiken ze niet.
--
-- Oude regels in email_log met deze email_type blijven staan; de labelkaart
-- (src/lib/emailTypeLabels.ts) houdt ze leesbaar onder "Oudere sleutels".
delete from public.email_templates
 where id in (
   'quote_request_bureau',
   'quote_request_customer',
   'partner_intro_portal',
   'partner_briefing_t3',
   'proforma_commission_notification',
   'sales_followup_offer_3d',
   'sales_followup_offer_7d',
   'sales_pre_signing',
   'sales_post_signing_welcome',
   'presales_intake_followup',
   'presales_clarification',
   'presales_proposal_intro',
   'presales_partner_question'
 );
