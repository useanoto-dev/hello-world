-- Add item_layout column to category_option_groups
ALTER TABLE public.category_option_groups 
ADD COLUMN item_layout text NOT NULL DEFAULT 'list';

-- Add comment explaining valid values
COMMENT ON COLUMN public.category_option_groups.item_layout IS 'Layout for option items: list or grid';