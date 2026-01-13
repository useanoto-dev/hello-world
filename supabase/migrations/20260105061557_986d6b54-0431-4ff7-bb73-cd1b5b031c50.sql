-- Loyalty settings per store
CREATE TABLE public.loyalty_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  points_per_currency NUMERIC NOT NULL DEFAULT 1, -- Points earned per R$1 spent
  min_order_for_points NUMERIC DEFAULT 0, -- Minimum order value to earn points
  welcome_bonus INTEGER DEFAULT 0, -- Points given on first order
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id)
);

-- Customer points balance
CREATE TABLE public.customer_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0, -- Total points ever earned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id, customer_phone)
);

-- Point transactions history
CREATE TABLE public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  points INTEGER NOT NULL, -- Positive for earned, negative for redeemed
  type TEXT NOT NULL, -- 'earned', 'redeemed', 'bonus', 'expired', 'adjustment'
  description TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reward_id UUID, -- Will reference loyalty_rewards
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Loyalty rewards/prizes
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'discount', -- 'discount', 'free_item', 'free_delivery'
  reward_value NUMERIC, -- Discount amount or percentage
  is_percentage BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  max_redemptions INTEGER, -- NULL for unlimited
  redemptions_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key for reward_id
ALTER TABLE public.point_transactions 
  ADD CONSTRAINT point_transactions_reward_id_fkey 
  FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_settings
CREATE POLICY "Anyone can read active loyalty settings" ON public.loyalty_settings
  FOR SELECT USING (is_enabled = true);
CREATE POLICY "Owners can manage loyalty settings" ON public.loyalty_settings
  FOR ALL USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies for customer_points
CREATE POLICY "Anyone can read their points" ON public.customer_points
  FOR SELECT USING (true);
CREATE POLICY "Owners can manage customer points" ON public.customer_points
  FOR ALL USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies for point_transactions
CREATE POLICY "Anyone can read their transactions" ON public.point_transactions
  FOR SELECT USING (true);
CREATE POLICY "Anyone can create transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can manage transactions" ON public.point_transactions
  FOR ALL USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies for loyalty_rewards
CREATE POLICY "Anyone can read active rewards" ON public.loyalty_rewards
  FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage rewards" ON public.loyalty_rewards
  FOR ALL USING (is_store_owner(auth.uid(), store_id));

-- Function to award points after order completion
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_points_to_award INTEGER;
  v_is_first_order BOOLEAN;
BEGIN
  -- Only award points when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get loyalty settings for this store
    SELECT * INTO v_settings FROM public.loyalty_settings 
    WHERE store_id = NEW.store_id AND is_enabled = true;
    
    -- If loyalty not enabled, exit
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Check minimum order value
    IF NEW.total < v_settings.min_order_for_points THEN
      RETURN NEW;
    END IF;
    
    -- Calculate points (based on total spent)
    v_points_to_award := FLOOR(NEW.total * v_settings.points_per_currency);
    
    -- Check if first order for welcome bonus
    SELECT NOT EXISTS (
      SELECT 1 FROM public.point_transactions 
      WHERE store_id = NEW.store_id 
      AND customer_phone = NEW.customer_phone 
      AND type = 'earned'
    ) INTO v_is_first_order;
    
    IF v_is_first_order AND v_settings.welcome_bonus > 0 THEN
      v_points_to_award := v_points_to_award + v_settings.welcome_bonus;
    END IF;
    
    -- Upsert customer points
    INSERT INTO public.customer_points (store_id, customer_phone, customer_name, total_points, lifetime_points)
    VALUES (NEW.store_id, NEW.customer_phone, NEW.customer_name, v_points_to_award, v_points_to_award)
    ON CONFLICT (store_id, customer_phone)
    DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      total_points = customer_points.total_points + v_points_to_award,
      lifetime_points = customer_points.lifetime_points + v_points_to_award,
      updated_at = now();
    
    -- Record transaction
    INSERT INTO public.point_transactions (store_id, customer_phone, points, type, description, order_id)
    VALUES (
      NEW.store_id, 
      NEW.customer_phone, 
      v_points_to_award, 
      CASE WHEN v_is_first_order AND v_settings.welcome_bonus > 0 THEN 'bonus' ELSE 'earned' END,
      CASE WHEN v_is_first_order AND v_settings.welcome_bonus > 0 
        THEN 'Pontos do pedido #' || NEW.order_number || ' + bônus de boas-vindas'
        ELSE 'Pontos do pedido #' || NEW.order_number
      END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for awarding points
CREATE TRIGGER on_order_completed_award_points
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points();

-- Also trigger on insert for already-completed orders
CREATE TRIGGER on_order_insert_award_points
  AFTER INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.award_loyalty_points();

-- Indexes for performance
CREATE INDEX idx_customer_points_store_phone ON public.customer_points(store_id, customer_phone);
CREATE INDEX idx_point_transactions_store_phone ON public.point_transactions(store_id, customer_phone);
CREATE INDEX idx_loyalty_rewards_store ON public.loyalty_rewards(store_id, is_active);