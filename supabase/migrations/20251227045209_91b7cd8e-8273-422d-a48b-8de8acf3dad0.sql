-- Add content_blocks column to categories table
-- Using JSONB array to store flexible block content per category
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS content_blocks jsonb DEFAULT '[]'::jsonb;

-- Add description column for category
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS description text;

-- Add category_type to differentiate between product categories and content categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS category_type text DEFAULT 'products';

-- Comment for documentation
COMMENT ON COLUMN public.categories.content_blocks IS 'Array of content blocks for the category page. Each block has: type, content, order, settings';
COMMENT ON COLUMN public.categories.category_type IS 'Type of category: products (shows products), content (custom blocks), hybrid (both)';