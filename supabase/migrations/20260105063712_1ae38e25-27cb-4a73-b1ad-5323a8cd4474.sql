-- Update the award_loyalty_points function to include tier bonus
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settings RECORD;
  v_customer RECORD;
  v_points_to_award INTEGER;
  v_base_points INTEGER;
  v_tier_bonus_percent NUMERIC;
  v_tier_bonus_points INTEGER;
  v_is_first_order BOOLEAN;
  v_customer_tier TEXT;
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
    
    -- Calculate base points (based on total spent)
    v_base_points := FLOOR(NEW.total * v_settings.points_per_currency);
    v_points_to_award := v_base_points;
    
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
    
    -- Get customer's current tier for bonus calculation (if tiers enabled)
    IF v_settings.tiers_enabled THEN
      SELECT * INTO v_customer FROM public.customer_points
      WHERE store_id = NEW.store_id AND customer_phone = NEW.customer_phone;
      
      IF FOUND THEN
        -- Calculate tier based on lifetime points
        IF v_customer.lifetime_points >= v_settings.tier_gold_min THEN
          v_customer_tier := 'gold';
          v_tier_bonus_percent := v_settings.tier_gold_bonus;
        ELSIF v_customer.lifetime_points >= v_settings.tier_silver_min THEN
          v_customer_tier := 'silver';
          v_tier_bonus_percent := v_settings.tier_silver_bonus;
        ELSE
          v_customer_tier := 'bronze';
          v_tier_bonus_percent := v_settings.tier_bronze_bonus;
        END IF;
        
        -- Apply tier bonus
        IF v_tier_bonus_percent > 0 THEN
          v_tier_bonus_points := FLOOR(v_base_points * (v_tier_bonus_percent / 100));
          v_points_to_award := v_points_to_award + v_tier_bonus_points;
        END IF;
      ELSE
        v_customer_tier := 'bronze';
      END IF;
    END IF;
    
    -- Upsert customer points and update tier
    INSERT INTO public.customer_points (store_id, customer_phone, customer_name, total_points, lifetime_points, tier)
    VALUES (NEW.store_id, NEW.customer_phone, NEW.customer_name, v_points_to_award, v_points_to_award, COALESCE(v_customer_tier, 'bronze'))
    ON CONFLICT (store_id, customer_phone)
    DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      total_points = customer_points.total_points + v_points_to_award,
      lifetime_points = customer_points.lifetime_points + v_points_to_award,
      tier = CASE 
        WHEN v_settings.tiers_enabled THEN
          CASE 
            WHEN customer_points.lifetime_points + v_points_to_award >= v_settings.tier_gold_min THEN 'gold'
            WHEN customer_points.lifetime_points + v_points_to_award >= v_settings.tier_silver_min THEN 'silver'
            ELSE 'bronze'
          END
        ELSE customer_points.tier
      END,
      updated_at = now();
    
    -- Record transaction with tier info
    INSERT INTO public.point_transactions (store_id, customer_phone, points, type, description, order_id)
    VALUES (
      NEW.store_id, 
      NEW.customer_phone, 
      v_points_to_award, 
      CASE WHEN v_is_first_order AND v_settings.welcome_bonus > 0 THEN 'bonus' ELSE 'earned' END,
      CASE 
        WHEN v_is_first_order AND v_settings.welcome_bonus > 0 THEN
          'Pontos do pedido #' || NEW.order_number || ' + bônus de boas-vindas'
        WHEN v_settings.tiers_enabled AND v_tier_bonus_percent > 0 THEN
          'Pontos do pedido #' || NEW.order_number || ' (+' || v_tier_bonus_percent || '% bônus ' || COALESCE(v_customer_tier, 'bronze') || ')'
        ELSE 
          'Pontos do pedido #' || NEW.order_number
      END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;