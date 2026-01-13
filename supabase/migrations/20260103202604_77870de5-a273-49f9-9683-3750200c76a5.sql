-- Add show_item_images column to control image visibility per option group
ALTER TABLE public.category_option_groups 
ADD COLUMN show_item_images boolean NOT NULL DEFAULT true;

-- Add a comment to explain the column
COMMENT ON COLUMN public.category_option_groups.show_item_images IS 'Controls whether option items in this group display images in the storefront modal';