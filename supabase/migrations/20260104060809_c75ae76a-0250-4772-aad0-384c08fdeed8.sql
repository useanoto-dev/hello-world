-- Add use_comanda_mode field to stores table
-- When true: shows Comandas menu, status columns, tracking link in WhatsApp
-- When false: hides Comandas menu, shows simple orders list, no tracking link
ALTER TABLE public.stores 
ADD COLUMN use_comanda_mode boolean DEFAULT true;