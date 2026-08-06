-- Migration: Create RPC function check_email_exists and restrict profiles RLS
CREATE OR REPLACE FUNCTION public.check_email_exists(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(email_input))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated;

-- Tighten RLS policies on public.profiles: users can only SELECT their own profile
DROP POLICY IF EXISTS "Allow public select of profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;

CREATE POLICY "Allow users to read their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);
