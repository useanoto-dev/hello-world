-- Add custom footer message for A4 prints
ALTER TABLE public.stores 
ADD COLUMN print_footer_message TEXT DEFAULT NULL;