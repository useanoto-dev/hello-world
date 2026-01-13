-- Add loyalty tier columns to loyalty_settings
ALTER TABLE public.loyalty_settings
ADD COLUMN IF NOT EXISTS tiers_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS tier_bronze_min integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier_bronze_bonus numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier_silver_min integer NOT NULL DEFAULT 500,
ADD COLUMN IF NOT EXISTS tier_silver_bonus numeric NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS tier_gold_min integer NOT NULL DEFAULT 1500,
ADD COLUMN IF NOT EXISTS tier_gold_bonus numeric NOT NULL DEFAULT 10;

-- Add tier column to customer_points
ALTER TABLE public.customer_points
ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'bronze';

-- Create function to calculate customer tier based on lifetime points
CREATE OR REPLACE FUNCTION public.calculate_customer_tier(
  p_lifetime_points integer,
  p_bronze_min integer,
  p_silver_min integer,
  p_gold_min integer
) RETURNS text AS $$
BEGIN
  IF p_lifetime_points >= p_gold_min THEN
    RETURN 'gold';
  ELSIF p_lifetime_points >= p_silver_min THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;