-- Add google_maps_link and about_us columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS google_maps_link text,
ADD COLUMN IF NOT EXISTS about_us text;