-- Create missing pizza_flavor_prices for flavors that don't have prices for active sizes
-- This ensures all active flavors appear in the storefront

INSERT INTO public.pizza_flavor_prices (flavor_id, size_id, price, surcharge, is_available)
SELECT 
  pf.id as flavor_id,
  ps.id as size_id,
  ps.base_price as price,
  0 as surcharge,
  true as is_available
FROM public.pizza_flavors pf
CROSS JOIN public.pizza_sizes ps
WHERE pf.category_id = ps.category_id
  AND pf.is_active = true
  AND ps.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.pizza_flavor_prices pfp 
    WHERE pfp.flavor_id = pf.id AND pfp.size_id = ps.id
  );