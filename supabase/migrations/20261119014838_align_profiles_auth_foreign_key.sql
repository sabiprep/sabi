-- Align profiles identity semantics with the canonical schema.
-- Preserve the historical orphan profile while enforcing referential
-- integrity for all new writes.
ALTER TABLE public.profiles
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id)
  ON DELETE CASCADE
  NOT VALID;
