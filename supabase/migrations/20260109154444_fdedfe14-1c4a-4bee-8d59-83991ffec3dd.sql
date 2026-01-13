-- Remove the restrictive foreign key that only allows inventory_products
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey;

-- Update the trigger function to NOT insert movements for products table items
-- since the FK relationship is specific to inventory_products
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
          CONTINUE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        CONTINUE;
      END;
      
      -- Try to deduct from products table (menu products with stock control)
      -- Do NOT insert into inventory_movements for products table items
      SELECT id, stock_quantity, has_stock_control, store_id 
      INTO product_record 
      FROM products 
      WHERE id = real_product_id AND has_stock_control = true;
      
      IF FOUND THEN
        current_stock := COALESCE(product_record.stock_quantity, 0);
        
        -- Update stock only (no movement record due to FK constraint)
        UPDATE products 
        SET stock_quantity = GREATEST(0, current_stock - item_quantity),
            updated_at = NOW()
        WHERE id = real_product_id;
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
        
        -- Record movement (only for inventory_products due to FK)
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