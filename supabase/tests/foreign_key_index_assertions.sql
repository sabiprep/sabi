-- Verify every public-schema foreign key has a valid, non-partial supporting index.
begin;
do $$
declare
  fk record;
  v_columns text[];
  v_supported boolean;
begin
  for fk in
    select c.conrelid, c.conname,
      array_agg(a.attname order by k.ord) as columns
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality k(attnum, ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
    where c.contype='f' and c.connamespace='public'::regnamespace
    group by c.conrelid,c.conname
  loop
    select exists (
      select 1 from pg_index i
      where i.indrelid=fk.conrelid
        and i.indisvalid
        and i.indpred is null
        and i.indexprs is null
        and (
          select array_agg(a.attname order by k.ord)
          from unnest(i.indkey) with ordinality k(attnum,ord)
          join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum
          where k.ord <= cardinality(fk.columns)
        ) = fk.columns
    ) into v_supported;
    if not v_supported then
      raise exception 'Foreign key % on % has no supporting leading index', fk.conname, fk.conrelid::regclass;
    end if;
  end loop;
end $$;
rollback;
