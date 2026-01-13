-- Fix deduct_inventory_on_order_accepted trigger to use 'venda' instead of 'sale'
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order_accepted()
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
  -- Process when status changes to 'preparing' (accepted)
  IF NEW.status = 'preparing' AND (OLD.status IS NULL OR OLD.status != 'preparing') THEN
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
          
          -- Record the movement with correct Portuguese value
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
            'venda',  -- Changed from 'sale' to 'venda'
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
            
            -- Record the movement with correct Portuguese value
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
              'venda',  -- Changed from 'sale' to 'venda'
              -item_qty,
              current_stock,
              GREATEST(0, current_stock - item_qty),
              'Venda - Pedido #' || NEW.order_number,
              NEW.id,
              'system'
            );
          END IF;
        EXCEPTION WHEN invalid_text_representation THEN
          NULL;
        END;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also update the InventoryMovementReport to recognize 'venda' type
-- (This is just for documentation - the frontend code also needs updating)