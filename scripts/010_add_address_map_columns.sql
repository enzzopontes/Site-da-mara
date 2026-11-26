-- Add map and label columns to public.addresses (additive, idempotent)
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS label TEXT DEFAULT 'casa',
  ADD COLUMN IF NOT EXISTS reference_point TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
