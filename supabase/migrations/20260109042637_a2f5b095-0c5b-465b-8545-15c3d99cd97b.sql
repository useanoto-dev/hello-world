-- Drop the overly restrictive SELECT policy and create a public read one
DROP POLICY IF EXISTS "Anyone can read active flow steps" ON public.pizza_flow_steps;

CREATE POLICY "Anyone can read flow steps"
ON public.pizza_flow_steps
FOR SELECT
USING (true);