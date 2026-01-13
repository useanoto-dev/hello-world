-- Add policy to allow anonymous users to insert/update customer_points during checkout
-- This is needed because customers need to be enrolled in loyalty program during order creation

-- Policy for anonymous INSERT (for new customers joining the program)
CREATE POLICY "Allow anonymous insert to customer_points"
ON public.customer_points
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy for anonymous UPDATE (for existing customers earning more points)
CREATE POLICY "Allow anonymous update to customer_points"
ON public.customer_points
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);