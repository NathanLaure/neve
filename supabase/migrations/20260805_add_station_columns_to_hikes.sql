-- Add station columns to hikes table if not exists
ALTER TABLE public.hikes
ADD COLUMN IF NOT EXISTS start_station_name TEXT,
ADD COLUMN IF NOT EXISTS start_station_lat NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS start_station_lng NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS end_station_name TEXT,
ADD COLUMN IF NOT EXISTS end_station_lat NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS end_station_lng NUMERIC(9,6);
