-- Validate the isolated synthetic learner archetype catalogue used by QA.
begin;
do $$
declare
  v_count integer;
begin
  if to_regclass('sabi_simulation.personas') is null then
    raise exception 'Synthetic persona schema is missing';
  end if;

  select count(*) into v_count from sabi_simulation.personas;
  if v_count <> 25 then
    raise exception 'Expected 25 synthetic learner archetypes, found %', v_count;
  end if;

  if has_schema_privilege('anon','sabi_simulation','USAGE')
    or has_schema_privilege('authenticated','sabi_simulation','USAGE') then
    raise exception 'Synthetic simulation schema must not be exposed to client roles';
  end if;

  if has_table_privilege('anon','sabi_simulation.personas','SELECT')
    or has_table_privilege('authenticated','sabi_simulation.personas','SELECT') then
    raise exception 'Synthetic persona catalogue must not be readable by client roles';
  end if;

  if exists (
    select 1 from sabi_simulation.personas
    where target_score not between 0 and 400
       or baseline_score not between 0 and 400
       or learning_consistency not between 0 and 1
       or response_speed not between 0 and 1
       or answer_revision_rate not between 0 and 1
       or hint_usage_rate not between 0 and 1
       or jsonb_typeof(subject_mix) <> 'array'
       or jsonb_typeof(subject_strengths) <> 'object'
       or jsonb_typeof(subject_weaknesses) <> 'object'
  ) then
    raise exception 'Synthetic persona catalogue contains invalid archetype data';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='personas'
  ) then
    raise exception 'Synthetic archetypes must remain outside public learner tables';
  end if;
end $$;
rollback;
