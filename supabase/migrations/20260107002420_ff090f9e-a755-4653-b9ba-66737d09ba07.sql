-- Add display_mode column to category_option_groups
ALTER TABLE public.category_option_groups 
ADD COLUMN display_mode text NOT NULL DEFAULT 'modal';

-- Add comment explaining valid values
COMMENT ON COLUMN public.category_option_groups.display_mode IS 'Display mode for the option group: modal or fullscreen';