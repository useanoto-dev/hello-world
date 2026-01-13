-- Atualizar dados do restaurante com informações reais
UPDATE restaurant_info SET
  name = 'Pizzaria Portuguesa',
  slogan = 'O sabor incomparável',
  phone = '(99) 98457-3587',
  whatsapp = '5599984573587',
  address = 'Rua Abílio Monteiro, 1519 - Engenho, Pedreiras - MA',
  logo_url = 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/logo-pizzaria.webp',
  banner_url = 'https://pizzariaportuguesa.site/wp-content/uploads/2025/07/home-P.-PORTUGUESA.webp',
  instagram = 'https://www.instagram.com/pizzariaportuguesaofc/',
  google_maps_url = 'https://share.google/YX6zwujcDgpRoFL9V',
  pix_key = '99991297042',
  qr_code_url = 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/pagamento.webp',
  min_order_value = 10.00,
  open_hour = 18,
  close_hour = 23,
  updated_at = now()
WHERE id = (SELECT id FROM restaurant_info LIMIT 1);