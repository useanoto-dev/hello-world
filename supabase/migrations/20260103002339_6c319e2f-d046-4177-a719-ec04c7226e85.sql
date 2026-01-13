-- Add estimated time columns to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS estimated_prep_time integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS estimated_delivery_time integer DEFAULT 20;