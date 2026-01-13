-- Insert pizza flavors with auto-generated UUIDs
INSERT INTO public.pizza_flavors (store_id, category_id, name, description, flavor_type, is_premium, is_active, display_order)
VALUES 
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Calabresa', 'Molho de tomate, mussarela, calabresa fatiada, cebola e orégano', 'salgada', false, true, 0),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Margherita', 'Molho de tomate, mussarela de búfala, tomate e manjericão fresco', 'salgada', false, true, 1),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Quatro Queijos', 'Molho de tomate, mussarela, provolone, gorgonzola e parmesão', 'salgada', true, true, 2),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Frango com Catupiry', 'Molho de tomate, mussarela, frango desfiado e catupiry', 'salgada', false, true, 3),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Portuguesa', 'Molho de tomate, mussarela, presunto, ovo, cebola, azeitona e ervilha', 'salgada', false, true, 4),
  ('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Chocolate', 'Chocolate ao leite derretido com granulado', 'doce', false, true, 5);