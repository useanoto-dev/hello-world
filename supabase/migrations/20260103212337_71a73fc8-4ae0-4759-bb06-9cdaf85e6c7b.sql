-- Add response columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS store_response TEXT,
ADD COLUMN IF NOT EXISTS response_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policy to allow owners to update their store's reviews
DROP POLICY IF EXISTS "Owners can manage reviews" ON public.reviews;

CREATE POLICY "Owners can manage reviews" 
ON public.reviews 
FOR ALL 
USING (is_store_owner(auth.uid(), store_id));

-- Ensure the updated_at trigger exists for reviews
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();