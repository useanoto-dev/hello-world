-- Insert default upsell modals for store d76c472f-b50d-4025-842f-1513a377d4f0
-- These represent the existing hardcoded modals in the pizza flow

INSERT INTO upsell_modals (store_id, name, trigger_category_id, target_category_id, title, description, is_active, show_quick_add, max_products, display_order)
VALUES 
  ('d76c472f-b50d-4025-842f-1513a377d4f0', 'Borda Recheada', '763e9b26-f858-4561-9add-2f6d4d5267c6', NULL, 'Escolha a Borda', 'Deixe sua pizza ainda mais gostosa', true, false, 10, 0),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', 'Bebidas após Pizza', '763e9b26-f858-4561-9add-2f6d4d5267c6', NULL, 'Que tal uma bebida?', 'Complete seu pedido!', true, true, 6, 1)
ON CONFLICT DO NOTHING;