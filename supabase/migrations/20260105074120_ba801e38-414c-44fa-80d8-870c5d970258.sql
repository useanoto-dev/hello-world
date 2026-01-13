-- Add CPF column to customer_points table for loyalty program
ALTER TABLE public.customer_points 
ADD COLUMN customer_cpf text;

-- Create unique constraint on store_id + customer_cpf (CPF is unique per store)
CREATE UNIQUE INDEX idx_customer_points_store_cpf ON public.customer_points (store_id, customer_cpf) WHERE customer_cpf IS NOT NULL;

-- Also add CPF column to point_transactions for reference
ALTER TABLE public.point_transactions 
ADD COLUMN customer_cpf text;