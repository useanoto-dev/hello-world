-- Add PrintNode configuration columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS printnode_printer_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS printnode_auto_print BOOLEAN DEFAULT false;