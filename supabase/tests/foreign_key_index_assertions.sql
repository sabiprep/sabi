-- Verify every public-schema foreign key has a valid, non-partial supporting index.
-- Compare attribute numbers (not names) and only the first N index key columns.
begin;
do $$
declare
  v_missing text;
begin
  with foreign_keys as (
    select c.oid, c.conrelid, c.conname, c.conkey,
      cardinality(c.conkey) as key_count
    from pg_constraint c
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
  ),
  unsupported as (
    select fk.*
    from foreign_keys fk
    where not exists (
      select 1
      from pg_index i
      where i.indrelid = fk.conrelid
        and i.indisvalid
        and i.indisready
        and i.indpred is null
        and i.indexprs is null
        and i.indnkeyatts >= fk.key_count
        and (
          select array_agg(k.attnum::smallint order by k.ord)
          from unnest(i.indkey) with ordinality as k(attnum, ord)
          where k.ord <= fk.key_count
        ) = fk.conkey
    )
  )
  select string_agg(format('%s (%s)', conname, conrelid::regclass), ', ')
    into v_missing
  from unsupported;

  if v_missing is not null then
    raise exception 'Foreign keys missing valid leading-column indexes: %', v_missing;
  end if;
end $$;
rollback;
