-- Migration: Create RPC function delete_unconfirmed_user to delete unconfirmed user upon email change
CREATE OR REPLACE FUNCTION public.delete_unconfirmed_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
  is_confirmed TIMESTAMPTZ;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT email_confirmed_at INTO is_confirmed FROM auth.users WHERE id = current_user_id;

  -- Delete from auth.users only if email is unconfirmed
  IF is_confirmed IS NULL THEN
    DELETE FROM public.profiles WHERE id = current_user_id;
    DELETE FROM auth.users WHERE id = current_user_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_unconfirmed_user() TO anon, authenticated;
