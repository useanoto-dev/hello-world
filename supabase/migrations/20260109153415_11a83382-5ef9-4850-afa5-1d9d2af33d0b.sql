-- Atualizar função de dedução de estoque para usar product_id ou extrair UUID do id
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  real_product_id UUID;
  item_id TEXT;
  product_record RECORD;
  current_stock INTEGER;
  item_quantity INTEGER;
BEGIN
  -- Only proceed if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_quantity := COALESCE((item.value->>'quantity')::INTEGER, 1);
      
      -- Tentar obter o product_id primeiro (novo padrão)
      -- Se não existir, extrair o UUID do id removendo sufixo de timestamp
      item_id := item.value->>'id';
      
      BEGIN
        -- Prioridade 1: usar product_id se existir
        IF item.value->>'product_id' IS NOT NULL THEN
          real_product_id := (item.value->>'product_id')::UUID;
        -- Prioridade 2: extrair UUID do id (remover sufixo -timestamp)
        ELSIF item_id IS NOT NULL AND item_id ~ '^[a-f0-9\-]{36}' THEN
          real_product_id := (REGEXP_REPLACE(item_id, '-[0-9]+$', ''))::UUID;
        ELSE
          -- Não conseguiu extrair UUID válido, pular este item
          CONTINUE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- UUID inválido, pular este item
        CONTINUE;
      END;
      
      -- Tentar deduzir do estoque de products
      SELECT id, stock_quantity, has_stock_control, store_id 
      INTO product_record 
      FROM products 
      WHERE id = real_product_id AND has_stock_control = true;
      
      IF FOUND THEN
        current_stock := COALESCE(product_record.stock_quantity, 0);
        
        -- Atualizar estoque
        UPDATE products 
        SET stock_quantity = GREATEST(0, current_stock - item_quantity),
            updated_at = NOW()
        WHERE id = real_product_id;
        
        -- Registrar movimentação
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
      
      -- Tentar deduzir do estoque de inventory_products
      SELECT id, stock_quantity, store_id 
      INTO product_record 
      FROM inventory_products 
      WHERE id = real_product_id;
      
      IF FOUND THEN
        current_stock := COALESCE(product_record.stock_quantity, 0);
        
        -- Atualizar estoque
        UPDATE inventory_products 
        SET stock_quantity = GREATEST(0, current_stock - item_quantity),
            updated_at = NOW()
        WHERE id = real_product_id;
        
        -- Registrar movimentação
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

-- Remover trigger duplicada se existir
DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_order_complete ON orders;

-- Garantir que a trigger correta existe
DROP TRIGGER IF EXISTS deduct_stock_on_order_complete ON orders;
CREATE TRIGGER deduct_stock_on_order_complete
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION deduct_stock_on_order_complete();