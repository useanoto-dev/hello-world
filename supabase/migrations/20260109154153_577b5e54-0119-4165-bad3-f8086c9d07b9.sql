-- Drop all old conflicting triggers first
DROP TRIGGER IF EXISTS deduct_stock_on_order_complete ON orders;
DROP TRIGGER IF EXISTS deduct_inventory_on_order_complete ON orders;
DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_new_completed_order ON orders;
DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_order_complete ON orders;

-- Drop old functions
DROP FUNCTION IF EXISTS deduct_stock_on_order_complete();
DROP FUNCTION IF EXISTS deduct_inventory_on_order_complete();

-- Create a single unified function that handles stock deduction
CREATE OR REPLACE FUNCTION deduct_stock_on_order_finalized()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  real_product_id UUID;
  item_id TEXT;
  product_record RECORD;
  current_stock INTEGER;
  item_quantity INTEGER;
  target_statuses TEXT[] := ARRAY['completed', 'delivered'];
BEGIN
  -- Only proceed if status changed to a final status (completed OR delivered)
  IF NEW.status = ANY(target_statuses) AND (OLD.status IS NULL OR OLD.status != ALL(target_statuses)) THEN
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_quantity := COALESCE((item.value->>'quantity')::INTEGER, 1);
      
      -- Try to get the product_id first (new standard)
      -- If it doesn't exist, extract UUID from id by removing timestamp suffix
      item_id := item.value->>'id';
      
      BEGIN
        -- Priority 1: use product_id if exists
        IF item.value->>'product_id' IS NOT NULL THEN
          real_product_id := (item.value->>'product_id')::UUID;
        -- Priority 2: check if id starts with 'inv-' (inventory product prefix)
        ELSIF item_id IS NOT NULL AND item_id LIKE 'inv-%' THEN
          real_product_id := (SUBSTRING(item_id FROM 5 FOR 36))::UUID;
        -- Priority 3: extract UUID from id (remove -timestamp suffix)
        ELSIF item_id IS NOT NULL AND item_id ~ '^[a-f0-9\-]{36}' THEN
          real_product_id := (REGEXP_REPLACE(item_id, '-[0-9]+$', ''))::UUID;
        ELSE
          -- Could not extract valid UUID, skip this item
          CONTINUE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Invalid UUID, skip this item
        CONTINUE;
      END;
      
      -- Try to deduct from products table (menu products with stock control)
      SELECT id, stock_quantity, has_stock_control, store_id 
      INTO product_record 
      FROM products 
      WHERE id = real_product_id AND has_stock_control = true;
      
      IF FOUND THEN
        current_stock := COALESCE(product_record.stock_quantity, 0);
        
        -- Update stock
        UPDATE products 
        SET stock_quantity = GREATEST(0, current_stock - item_quantity),
            updated_at = NOW()
        WHERE id = real_product_id;
        
        -- Record movement
        INSERT INTO inventory_movements (
          product_id, store_id, movement_type, quantity, 
          previous_stock, new_stock, reason, order_id, created_by
        ) VALUES (
          real_product_id,
          product_record.store_id,
          'saida',
          item_quantity,
          current_stock,
          GREATEST(0, current_stock - item_quantity),
          'Venda - Pedido #' || NEW.order_number,
          NEW.id,
          'system'
        );
      END IF;
      
      -- Try to deduct from inventory_products table
      SELECT id, stock_quantity, store_id 
      INTO product_record 
      FROM inventory_products 
      WHERE id = real_product_id;
      
      IF FOUND THEN
        current_stock := COALESCE(product_record.stock_quantity, 0);
        
        -- Update stock
        UPDATE inventory_products 
        SET stock_quantity = GREATEST(0, current_stock - item_quantity),
            updated_at = NOW()
        WHERE id = real_product_id;
        
        -- Record movement
        INSERT INTO inventory_movements (
          product_id, store_id, movement_type, quantity, 
          previous_stock, new_stock, reason, order_id, created_by
        ) VALUES (
          real_product_id,
          product_record.store_id,
          'saida',
          item_quantity,
          current_stock,
          GREATEST(0, current_stock - item_quantity),
          'Venda - Pedido #' || NEW.order_number,
          NEW.id,
          'system'
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create single trigger for UPDATE events
CREATE TRIGGER trigger_deduct_stock_on_order_finalized
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_order_finalized();

-- Create trigger for INSERT events with status already finalized
CREATE TRIGGER trigger_deduct_stock_on_order_insert_finalized
AFTER INSERT ON orders
FOR EACH ROW
WHEN (NEW.status IN ('completed', 'delivered'))
EXECUTE FUNCTION deduct_stock_on_order_finalized();