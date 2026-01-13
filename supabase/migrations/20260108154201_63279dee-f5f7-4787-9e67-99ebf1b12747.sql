-- Add max print retries configuration to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS printnode_max_retries integer DEFAULT 2;