-- Enable replica identity for real-time updates on category_option_items
ALTER TABLE public.category_option_items REPLICA IDENTITY FULL;

-- Add the table to supabase_realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'category_option_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.category_option_items;
  END IF;
END $$;

-- Also add products table for real-time updates on promotional prices
ALTER TABLE public.products REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;