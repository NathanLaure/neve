-- Migration: RPC function to check existing user authentication providers
CREATE OR REPLACE FUNCTION public.check_user_provider(email_input TEXT)
RETURNS TABLE (
  user_exists BOOLEAN,
  providers TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id UUID;
  user_providers TEXT[];
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(email_input))
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT false, ARRAY[]::TEXT[];
  ELSE
    SELECT ARRAY_AGG(DISTINCT provider) INTO user_providers
    FROM auth.identities
    WHERE user_id = target_user_id;

    RETURN QUERY SELECT true, COALESCE(user_providers, ARRAY['email']::TEXT[]);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_provider(TEXT) TO anon, authenticated;
