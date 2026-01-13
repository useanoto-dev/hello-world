-- Limpar todos os dados antigos do cardápio para começar do zero
-- Ordem respeitando foreign keys

-- 1. Deletar itens de opções
DELETE FROM category_option_items;

-- 2. Deletar grupos de opções
DELETE FROM category_option_groups;

-- 3. Deletar produtos
DELETE FROM products;

-- 4. Deletar categorias
DELETE FROM categories;