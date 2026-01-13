-- Create table to track coupon usage per customer (phone)
CREATE TABLE public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate usage tracking
CREATE UNIQUE INDEX idx_coupon_usage_unique ON public.coupon_usages(coupon_id, customer_phone);

-- Create index for faster lookups
CREATE INDEX idx_coupon_usages_phone ON public.coupon_usages(customer_phone);
CREATE INDEX idx_coupon_usages_coupon ON public.coupon_usages(coupon_id);

-- Enable RLS
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert coupon usage (for order creation)
CREATE POLICY "Anyone can create coupon usage"
ON public.coupon_usages
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read coupon usage (for validation)
CREATE POLICY "Anyone can read coupon usage"
ON public.coupon_usages
FOR SELECT
USING (true);

-- Allow owners to manage coupon usages
CREATE POLICY "Owners can manage coupon usages"
ON public.coupon_usages
FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Add max_uses_per_customer column to coupons table
ALTER TABLE public.coupons ADD COLUMN max_uses_per_customer INTEGER DEFAULT NULL;