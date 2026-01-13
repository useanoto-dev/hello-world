-- Inserir bebidas na tabela products
-- Primeiro verificar se a categoria bebidas existe (id: 57e18475-c832-4ab8-8bd5-5f9988bbcd24)

-- Refrigerantes
INSERT INTO products (name, description, price, category_id, is_available, display_order, image_url) VALUES
('Coca-Cola Lata', 'Coca-Cola lata 350ml', 7, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 1, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/5-1.webp'),
('Coca Zero Lata', 'Coca-Cola Zero lata 350ml', 7, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 2, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/8.webp'),
('Jesus Lata', 'Refrigerante Jesus lata 350ml', 7, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 3, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/7-1.webp'),
('Guaraná Lata', 'Guaraná Antarctica lata 350ml', 7, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 4, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/6-1.webp'),
('Guaraná 1L', 'Guaraná garrafa 1 litro', 10, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 5, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/7-2.webp'),
('Coca 1L Retornável', 'Coca-Cola 1L garrafa retornável', 10, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 6, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/8-1.webp'),
('Coca-Cola 2L', 'Coca-Cola garrafa 2 litros', 15, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 7, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/20.webp'),
('Coca Zero 2L', 'Coca-Cola Zero garrafa 2 litros', 15, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 8, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/22.webp'),
('Jesus 2L', 'Refrigerante Jesus garrafa 2 litros', 15, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 9, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/21.webp'),

-- Sucos
('Suco de Goiaba', 'Suco natural de goiaba', 6, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 10, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/goiaba.webp'),
('Suco de Abacaxi', 'Suco natural de abacaxi', 6, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 11, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/abacaxi.webp'),
('Suco de Cupuaçu', 'Suco cupuaçu com leite', 9, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 12, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/cupuacu.webp'),
('Suco de Maracujá', 'Suco natural de maracujá', 6, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 13, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/maracuja.webp'),
('Suco de Manga', 'Suco natural de manga', 6, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 14, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/manga.webp'),
('Suco de Acerola', 'Suco natural de acerola', 6, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 15, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/acerola.webp'),

-- Água
('Água sem Gás', 'Água mineral sem gás 500ml', 6, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 16, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/30-2.webp'),
('Água com Gás', 'Água mineral com gás 500ml', 6, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 17, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/31.webp'),
('H2O 500ml', 'Água H2O 500ml', 8, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 18, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/30.webp'),

-- Cervejas
('Skol 600ml', 'Cerveja Skol long neck 600ml', 10, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 19, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/24.webp'),
('Brahma 600ml', 'Cerveja Brahma long neck 600ml', 10, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 20, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/25.webp'),
('Stella Artois 600ml', 'Cerveja Stella Artois long neck 600ml', 15, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 21, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/23.webp'),
('Heineken 600ml', 'Cerveja Heineken long neck 600ml', 16, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 22, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/26.webp'),
('Itaipava 600ml', 'Cerveja Itaipava long neck 600ml', 10, '57e18475-c832-4ab8-8bd5-5f9988bbcd24', true, 23, 'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/27.webp');