update public.admin_todos t
set
  snoozed_until = greatest(
    ((pr.selected_dates ->> 0)::date - interval '21 days')::date,
    current_date
  ),
  due_date = coalesce(t.due_date, (pr.selected_dates ->> 0)::date)
from public.program_requests pr
where t.auto_type = 'book_ferry_tickets'
  and t.status in ('todo', 'in_progress')
  and t.related_request_id = pr.id
  and pr.selected_dates is not null
  and jsonb_array_length(pr.selected_dates) > 0
  and ((pr.selected_dates ->> 0)::date - interval '21 days')::date > current_date;