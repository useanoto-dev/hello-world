-- Insert pizza sizes for the existing pizza category
INSERT INTO public.pizza_sizes (store_id, category_id, name, description, slices, min_flavors, max_flavors, base_price, price_model, display_order, is_active)
VALUES 
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Pequena', '4 fatias • Ideal para 1 pessoa', 4, 1, 1, 29.90, 'highest', 0, true),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Média', '6 fatias • Ideal para 2 pessoas', 6, 1, 2, 44.90, 'highest', 1, true),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Grande', '8 fatias • Ideal para 3 pessoas', 8, 1, 3, 59.90, 'highest', 2, true),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Gigante', '12 fatias • Ideal para 4+ pessoas', 12, 1, 4, 79.90, 'highest', 3, true);