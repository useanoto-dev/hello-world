-- Add printer width configuration to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS printer_width TEXT DEFAULT '80mm';

-- Add comment for documentation
COMMENT ON COLUMN public.stores.printer_width IS 'Printer paper width: 58mm, 80mm, or a4';