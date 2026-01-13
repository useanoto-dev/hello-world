-- Drop existing trigger and function with CASCADE
DROP TRIGGER IF EXISTS deduct_inventory_on_order_complete ON public.orders;
DROP FUNCTION IF EXISTS public.deduct_inventory_on_order_complete() CASCADE;

-- Create enhanced function that handles both inventory_products AND products with stock control
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item RECORD;
  inv_product_id UUID;
  menu_product_id UUID;
  current_stock INTEGER;
  item_qty INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Loop through order items
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_qty := COALESCE((item.value->>'quantity')::INTEGER, 1);
      
      -- Check if item id starts with 'inv-' (inventory product)
      IF (item.value->>'id') LIKE 'inv-%' THEN
        -- Extract the real inventory product UUID (remove 'inv-' prefix)
        inv_product_id := (SUBSTRING(item.value->>'id' FROM 5))::UUID;
        
        -- Get current stock
        SELECT stock_quantity INTO current_stock 
        FROM inventory_products 
        WHERE id = inv_product_id;
        
        IF FOUND AND current_stock IS NOT NULL THEN
          -- Update stock quantity
          UPDATE inventory_products 
          SET stock_quantity = GREATEST(0, stock_quantity - item_qty),
              updated_at = now()
          WHERE id = inv_product_id;
          
          -- Record the movement
          INSERT INTO inventory_movements (
            store_id,
            product_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            order_id,
            created_by
          ) VALUES (
            NEW.store_id,
            inv_product_id,
            'sale',
            -item_qty,
            current_stock,
            GREATEST(0, current_stock - item_qty),
            'Venda - Pedido #' || NEW.order_number,
            NEW.id,
            'system'
          );
        END IF;
      ELSE
        -- Check if it's a regular menu product with stock control
        BEGIN
          menu_product_id := (item.value->>'id')::UUID;
          
          -- Get current stock from products table if has_stock_control is true
          SELECT stock_quantity INTO current_stock 
          FROM products 
          WHERE id = menu_product_id AND has_stock_control = true;
          
          IF FOUND AND current_stock IS NOT NULL THEN
            -- Update stock quantity in products table
            UPDATE products 
            SET stock_quantity = GREATEST(0, stock_quantity - item_qty),
                updated_at = now()
            WHERE id = menu_product_id;
            
            -- Record the movement (using products table id directly)
            INSERT INTO inventory_movements (
              store_id,
              product_id,
              movement_type,
              quantity,
              previous_stock,
              new_stock,
              reason,
              order_id,
              created_by
            ) VALUES (
              NEW.store_id,
              menu_product_id,
              'sale',
              -item_qty,
              current_stock,
              GREATEST(0, current_stock - item_qty),
              'Venda - Pedido #' || NEW.order_number,
              NEW.id,
              'system'
            );
          END IF;
        EXCEPTION WHEN invalid_text_representation THEN
          -- If id is not a valid UUID, skip (could be a custom id format)
          NULL;
        END;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for UPDATE (status change to completed)
CREATE TRIGGER trigger_deduct_inventory_on_order_complete
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_order_complete();

-- Create trigger for INSERT (new order already completed, e.g. PDV)
CREATE TRIGGER trigger_deduct_inventory_on_new_completed_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.deduct_inventory_on_order_complete();