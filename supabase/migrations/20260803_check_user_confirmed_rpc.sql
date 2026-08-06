-- Migration: RPC function to check if a user email is confirmed in auth.users
CREATE OR REPLACE FUNCTION public.check_user_confirmed(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(email_input))
    AND email_confirmed_at IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_confirmed(TEXT) TO anon, authenticated;
