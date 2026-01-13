-- Add is_primary column to category_option_groups
ALTER TABLE public.category_option_groups
ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_category_option_groups_primary 
ON public.category_option_groups (category_id, is_primary) 
WHERE is_primary = true;

-- Set the first group (lowest display_order) in each category as primary
WITH first_groups AS (
  SELECT DISTINCT ON (category_id) id
  FROM public.category_option_groups
  WHERE is_active = true
  ORDER BY category_id, display_order ASC
)
UPDATE public.category_option_groups
SET is_primary = true
WHERE id IN (SELECT id FROM first_groups);