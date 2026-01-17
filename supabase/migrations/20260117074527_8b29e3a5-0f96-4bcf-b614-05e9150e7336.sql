-- Add modal_type column to differentiate modal types
ALTER TABLE public.upsell_modals 
ADD COLUMN modal_type TEXT NOT NULL DEFAULT 'upsell';

-- Update existing modals with proper types
UPDATE public.upsell_modals 
SET modal_type = 'edge' 
WHERE name = 'Borda Recheada' AND store_id = 'd76c472f-b50d-4025-842f-1513a377d4f0';

UPDATE public.upsell_modals 
SET modal_type = 'drink' 
WHERE name = 'Bebidas após Pizza' AND store_id = 'd76c472f-b50d-4025-842f-1513a377d4f0';

-- Add comment explaining the types
COMMENT ON COLUMN public.upsell_modals.modal_type IS 'Modal types: edge (pizza edge selection), drink (drink suggestion), upsell (generic upsell/cross-sell)';