-- Configure fail-closed global AI budget ceilings for the isolated Sabi staging project.
-- The current staging provider order is mock-only; these limits prevent accidental
-- unbounded spend if a provider is enabled during later staging tests.
insert into public.ai_budget_limits (scope_type, scope_id, period, limit_usd, is_active)
values
  ('global', 'global', 'daily', 1.00, true),
  ('global', 'global', 'monthly', 5.00, true)
on conflict (scope_type, scope_id, period)
do update set
  limit_usd = excluded.limit_usd,
  is_active = true,
  updated_at = now();
