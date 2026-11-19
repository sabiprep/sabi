-- Restore auth.users -> public.profiles synchronization.
-- The existing function intentionally does not auto-confirm email.
-- This migration only restores profile creation for newly registered users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_or_linked_user();
