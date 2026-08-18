UPDATE public.program_request_items
SET partner_dismissed_at = now(),
    partner_dismissed_reason = 'Gefactureerd op factuur 20260013 (samen met de retourroute) — geen aparte factuur nodig',
    executed_at = COALESCE(executed_at, now()),
    status = 'executed',
    commission_status = 'not_applicable',
    updated_at = now()
WHERE id = 'ce700798-7c95-49b7-bb4c-0c0e94d129c6';