-- Migration: Add newsletter_consent to profiles table and update handle_new_user trigger (GDPR compliant default: false)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, default_station, newsletter_consent)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'default_station', 'Paris Gare de Lyon'),
    COALESCE((NEW.raw_user_meta_data->>'newsletter_consent')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    newsletter_consent = EXCLUDED.newsletter_consent,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
