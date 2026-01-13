-- Add whatsapp_number and whatsapp_name columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_name TEXT;