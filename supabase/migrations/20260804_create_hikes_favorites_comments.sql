-- Enable PostGIS extension for spatial queries if available
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS public.user_favorites CASCADE;
DROP TABLE IF EXISTS public.hike_comments CASCADE;
DROP TABLE IF EXISTS public.hikes CASCADE;

-- 1. Create hikes table
CREATE TABLE public.hikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  distance_km NUMERIC(6,2) NOT NULL DEFAULT 0,
  elevation_gain_m INT NOT NULL DEFAULT 0,
  elevation_loss_m INT NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT 'modere' CHECK (difficulty IN ('facile', 'modere', 'difficile', 'expert')),
  route_type TEXT NOT NULL DEFAULT 'boucle' CHECK (route_type IN ('boucle', 'aller_retour', 'point_a_point')),
  start_lat NUMERIC(9,6) NOT NULL DEFAULT 0,
  start_lng NUMERIC(9,6) NOT NULL DEFAULT 0,
  location_name TEXT,
  geometry JSONB,
  cover_image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  gpx_url TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL,
  rating_avg NUMERIC(3,2) DEFAULT 0.0,
  rating_count INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_hike_source UNIQUE (source, source_id)
);

-- Index for searching hikes
CREATE INDEX hikes_location_lat_lng_idx ON public.hikes (start_lat, start_lng);
CREATE INDEX hikes_difficulty_idx ON public.hikes (difficulty);
CREATE INDEX hikes_source_source_id_idx ON public.hikes (source, source_id);

-- Enable RLS for hikes
ALTER TABLE public.hikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select of hikes" ON public.hikes;
CREATE POLICY "Allow public select of hikes" ON public.hikes
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon and authenticated to insert/update hikes" ON public.hikes;
CREATE POLICY "Allow anon and authenticated to insert/update hikes" ON public.hikes
  FOR ALL TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 2. Create user_favorites table
CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hike_id UUID NOT NULL REFERENCES public.hikes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_hike_favorite UNIQUE (user_id, hike_id)
);

CREATE INDEX user_favorites_user_id_idx ON public.user_favorites (user_id);
CREATE INDEX user_favorites_hike_id_idx ON public.user_favorites (hike_id);

-- Enable RLS for user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read their own favorites" ON public.user_favorites;
CREATE POLICY "Allow users to read their own favorites" ON public.user_favorites
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to add their own favorites" ON public.user_favorites;
CREATE POLICY "Allow users to add their own favorites" ON public.user_favorites
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own favorites" ON public.user_favorites;
CREATE POLICY "Allow users to delete their own favorites" ON public.user_favorites
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- 3. Create hike_comments table
CREATE TABLE public.hike_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hike_id UUID NOT NULL REFERENCES public.hikes(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX hike_comments_hike_id_idx ON public.hike_comments (hike_id);
CREATE INDEX hike_comments_user_id_idx ON public.hike_comments (user_id);

-- Enable RLS for hike_comments
ALTER TABLE public.hike_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select of hike_comments" ON public.hike_comments;
CREATE POLICY "Allow public select of hike_comments" ON public.hike_comments
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own comments" ON public.hike_comments;
CREATE POLICY "Allow users to insert their own comments" ON public.hike_comments
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to update their own comments" ON public.hike_comments;
CREATE POLICY "Allow users to update their own comments" ON public.hike_comments
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.hike_comments;
CREATE POLICY "Allow users to delete their own comments" ON public.hike_comments
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- 4. Triggers to maintain counts and rating averages automatically

-- Update favorites_count trigger function
CREATE OR REPLACE FUNCTION public.handle_favorite_count_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hikes
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.hike_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hikes
    SET favorites_count = GREATEST(0, favorites_count - 1)
    WHERE id = OLD.hike_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_favorite_change ON public.user_favorites;
CREATE TRIGGER on_favorite_change
  AFTER INSERT OR DELETE ON public.user_favorites
  FOR EACH ROW EXECUTE FUNCTION public.handle_favorite_count_change();

-- Update rating_avg and rating_count trigger function
CREATE OR REPLACE FUNCTION public.handle_hike_rating_change()
RETURNS TRIGGER AS $$
DECLARE
  target_hike_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_hike_id := OLD.hike_id;
  ELSE
    target_hike_id := NEW.hike_id;
  END IF;

  UPDATE public.hikes
  SET
    rating_count = (SELECT COUNT(*) FROM public.hike_comments WHERE hike_id = target_hike_id),
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.hike_comments WHERE hike_id = target_hike_id), 0.0)
  WHERE id = target_hike_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_rating_change ON public.hike_comments;
CREATE TRIGGER on_comment_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON public.hike_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_hike_rating_change();
