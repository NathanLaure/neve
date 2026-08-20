-- Migration: Create user_adventures table for syncing planned hikes to user accounts
CREATE TABLE IF NOT EXISTS public.user_adventures (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rando_id TEXT NOT NULL,
  outward_date DATE NOT NULL,
  return_date DATE NOT NULL,
  outward_train JSONB NOT NULL,
  return_train JSONB NOT NULL,
  departure_station_name TEXT NOT NULL,
  return_station_name TEXT,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  passengers_count TEXT,
  passengers JSONB,
  hike_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_adventures_user_id_idx ON public.user_adventures (user_id);
CREATE INDEX IF NOT EXISTS user_adventures_outward_date_idx ON public.user_adventures (outward_date);

-- Enable RLS
ALTER TABLE public.user_adventures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read their own adventures" ON public.user_adventures;
CREATE POLICY "Allow users to read their own adventures" ON public.user_adventures
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own adventures" ON public.user_adventures;
CREATE POLICY "Allow users to insert their own adventures" ON public.user_adventures
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to update their own adventures" ON public.user_adventures;
CREATE POLICY "Allow users to update their own adventures" ON public.user_adventures
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own adventures" ON public.user_adventures;
CREATE POLICY "Allow users to delete their own adventures" ON public.user_adventures
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
