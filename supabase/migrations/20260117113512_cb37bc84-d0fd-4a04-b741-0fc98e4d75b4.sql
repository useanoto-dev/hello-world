-- Fix security issues: Customer data exposure

-- 1. Fix customers table RLS - remove public read access
-- Drop the overly permissive policy that allows anyone to read customers
DROP POLICY IF EXISTS "Anyone can read customers or super admin all" ON public.customers;

-- The existing policies "Store owners can read their customers" and "Store owners can select customers" 
-- are correct and will continue to work for authenticated store owners

-- 2. Add a helper function for public store data access (excludes sensitive API tokens)
CREATE OR REPLACE FUNCTION public.get_public_store_info(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  banner_url text,
  primary_color text,
  secondary_color text,
  is_active boolean,
  schedule jsonb,
  address text,
  phone text,
  whatsapp text,
  instagram text,
  about_us text,
  google_maps_link text,
  min_order_value numeric,
  delivery_fee numeric,
  estimated_delivery_time integer,
  estimated_prep_time integer
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.logo_url,
    s.banner_url,
    s.primary_color,
    s.secondary_color,
    s.is_active,
    s.schedule,
    s.address,
    s.phone,
    s.whatsapp,
    s.instagram,
    s.about_us,
    s.google_maps_link,
    s.min_order_value,
    s.delivery_fee,
    s.estimated_delivery_time,
    s.estimated_prep_time
  FROM stores s
  WHERE s.slug = p_slug AND s.is_active = true;
$$;

-- Grant execute on the function to allow public access to non-sensitive store data
GRANT EXECUTE ON FUNCTION public.get_public_store_info(text) TO anon, authenticated;

-- 3. Add documentation about sensitive columns
COMMENT ON COLUMN public.stores.uazapi_instance_token IS 'SENSITIVE: WhatsApp API token - only accessible to store owners';
COMMENT ON COLUMN public.stores.printnode_printer_id IS 'SENSITIVE: Printer configuration - only accessible to store owners';
COMMENT ON COLUMN public.stores.pix_key IS 'SENSITIVE: Payment configuration - only accessible to store owners';