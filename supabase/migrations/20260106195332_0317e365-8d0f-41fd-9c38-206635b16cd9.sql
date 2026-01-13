-- Function to deduct inventory stock when order is completed
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  inv_product_id UUID;
  current_stock INTEGER;
  item_qty INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Loop through order items
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      -- Check if item id starts with 'inv-' (inventory product)
      IF (item.value->>'id') LIKE 'inv-%' THEN
        -- Extract the real inventory product UUID (remove 'inv-' prefix)
        inv_product_id := (SUBSTRING(item.value->>'id' FROM 5))::UUID;
        
        -- Get quantity from order item
        item_qty := COALESCE((item.value->>'quantity')::INTEGER, 1);
        
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
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS deduct_inventory_on_order_complete ON orders;
CREATE TRIGGER deduct_inventory_on_order_complete
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_on_order_complete();