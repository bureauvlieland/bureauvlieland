UPDATE email_templates
SET body_html = regexp_replace(
  body_html,
  '(<a href="\{\{portal_(link|url)\}\}")',
  '{{actor_line}}\1',
  'g'
),
variables = CASE
  WHEN variables ? 'actor_line' THEN variables
  ELSE variables || '["actor_line"]'::jsonb
END
WHERE id IN ('status_confirmed','status_unavailable','status_alternative')
  AND body_html NOT LIKE '%{{actor_line}}%';