-- Migration: Add share_token to user_adventures and allow public read for guest/share links
ALTER TABLE public.user_adventures 
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS user_adventures_share_token_idx ON public.user_adventures (share_token);

DROP POLICY IF EXISTS "Allow public read on shared adventures" ON public.user_adventures;
CREATE POLICY "Allow public read on shared adventures" ON public.user_adventures
  FOR SELECT TO anon
  USING (share_token IS NOT NULL);
