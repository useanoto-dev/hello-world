-- LIMPEZA DO BANCO: Manter apenas dados do email a@gmail.com
-- Esta operação é IRREVERSÍVEL

DO $$
DECLARE
    owner_store_id UUID;
    owner_user_id UUID;
BEGIN
    -- Encontrar o store_id e user_id do proprietário a@gmail.com
    SELECT id, store_id INTO owner_user_id, owner_store_id
    FROM profiles
    WHERE email = 'a@gmail.com'
    LIMIT 1;

    IF owner_store_id IS NULL THEN
        RAISE EXCEPTION 'Store não encontrada para o email a@gmail.com';
    END IF;

    RAISE NOTICE 'Mantendo store_id: % e user_id: %', owner_store_id, owner_user_id;

    -- Deletar histórico de WhatsApp de pedidos de outras lojas
    DELETE FROM historico_whatsapp_pedido 
    WHERE pedido_id IN (SELECT id FROM orders WHERE store_id != owner_store_id);

    -- Deletar order_status_history de outras lojas
    DELETE FROM order_status_history 
    WHERE order_id IN (SELECT id FROM orders WHERE store_id != owner_store_id);

    -- Deletar push_subscriptions de pedidos de outras lojas
    DELETE FROM push_subscriptions 
    WHERE order_id IN (SELECT id FROM orders WHERE store_id != owner_store_id);

    -- Deletar coupon_usages de outras lojas
    DELETE FROM coupon_usages WHERE store_id != owner_store_id;

    -- Deletar point_transactions de outras lojas
    DELETE FROM point_transactions WHERE store_id != owner_store_id;

    -- Deletar print_jobs de outras lojas
    DELETE FROM print_jobs WHERE store_id != owner_store_id;

    -- Deletar orders de outras lojas
    DELETE FROM orders WHERE store_id != owner_store_id;

    -- Deletar reviews de outras lojas
    DELETE FROM reviews WHERE store_id != owner_store_id;

    -- Deletar customers de outras lojas
    DELETE FROM customers WHERE store_id != owner_store_id;

    -- Deletar customer_points de outras lojas
    DELETE FROM customer_points WHERE store_id != owner_store_id;

    -- Deletar loyalty_rewards de outras lojas
    DELETE FROM loyalty_rewards WHERE store_id != owner_store_id;

    -- Deletar loyalty_settings de outras lojas
    DELETE FROM loyalty_settings WHERE store_id != owner_store_id;

    -- Deletar coupons de outras lojas
    DELETE FROM coupons WHERE store_id != owner_store_id;

    -- Deletar banners de outras lojas
    DELETE FROM banners WHERE store_id != owner_store_id;

    -- Deletar delivery_areas de outras lojas
    DELETE FROM delivery_areas WHERE store_id != owner_store_id;

    -- Deletar payment_methods de outras lojas
    DELETE FROM payment_methods WHERE store_id != owner_store_id;

    -- Deletar financial_transactions de outras lojas
    DELETE FROM financial_transactions WHERE store_id != owner_store_id;

    -- Deletar financial_categories de outras lojas
    DELETE FROM financial_categories WHERE store_id != owner_store_id;

    -- Deletar inventory_movements de outras lojas
    DELETE FROM inventory_movements WHERE store_id != owner_store_id;

    -- Deletar inventory_products de outras lojas
    DELETE FROM inventory_products WHERE store_id != owner_store_id;

    -- Deletar inventory_categories de outras lojas
    DELETE FROM inventory_categories WHERE store_id != owner_store_id;

    -- Deletar mensagens_automaticas_whatsapp de outras lojas
    DELETE FROM mensagens_automaticas_whatsapp WHERE restaurant_id != owner_store_id;

    -- Deletar product_option_items de outras lojas
    DELETE FROM product_option_items WHERE store_id != owner_store_id;

    -- Deletar product_option_groups de outras lojas
    DELETE FROM product_option_groups WHERE store_id != owner_store_id;

    -- Deletar products de outras lojas
    DELETE FROM products WHERE store_id != owner_store_id;

    -- Deletar category_option_items de outras lojas
    DELETE FROM category_option_items WHERE store_id != owner_store_id;

    -- Deletar category_option_groups de outras lojas
    DELETE FROM category_option_groups WHERE store_id != owner_store_id;

    -- Deletar pizza_flavor_prices (via flavor_id)
    DELETE FROM pizza_flavor_prices 
    WHERE flavor_id IN (SELECT id FROM pizza_flavors WHERE store_id != owner_store_id);

    -- Deletar pizza_flavors de outras lojas
    DELETE FROM pizza_flavors WHERE store_id != owner_store_id;

    -- Deletar pizza_edge_prices (via edge_id)
    DELETE FROM pizza_edge_prices 
    WHERE edge_id IN (SELECT id FROM pizza_edges WHERE store_id != owner_store_id);

    -- Deletar pizza_edges de outras lojas
    DELETE FROM pizza_edges WHERE store_id != owner_store_id;

    -- Deletar pizza_dough_prices (via dough_id)
    DELETE FROM pizza_dough_prices 
    WHERE dough_id IN (SELECT id FROM pizza_doughs WHERE store_id != owner_store_id);

    -- Deletar pizza_doughs de outras lojas
    DELETE FROM pizza_doughs WHERE store_id != owner_store_id;

    -- Deletar pizza_flow_steps de outras lojas
    DELETE FROM pizza_flow_steps WHERE store_id != owner_store_id;

    -- Deletar standard_addon_prices (via addon_id)
    DELETE FROM standard_addon_prices 
    WHERE addon_id IN (SELECT id FROM standard_addons WHERE store_id != owner_store_id);

    -- Deletar standard_addons de outras lojas
    DELETE FROM standard_addons WHERE store_id != owner_store_id;

    -- Deletar standard_item_prices (via item_id)
    DELETE FROM standard_item_prices 
    WHERE item_id IN (SELECT id FROM standard_items WHERE store_id != owner_store_id);

    -- Deletar standard_items de outras lojas
    DELETE FROM standard_items WHERE store_id != owner_store_id;

    -- Deletar standard_sizes de outras lojas (precisa deletar prices primeiro)
    DELETE FROM pizza_dough_prices 
    WHERE size_id IN (SELECT id FROM pizza_sizes WHERE store_id != owner_store_id);
    
    DELETE FROM pizza_edge_prices 
    WHERE size_id IN (SELECT id FROM pizza_sizes WHERE store_id != owner_store_id);
    
    DELETE FROM pizza_flavor_prices 
    WHERE size_id IN (SELECT id FROM pizza_sizes WHERE store_id != owner_store_id);

    DELETE FROM standard_addon_prices 
    WHERE size_id IN (SELECT id FROM standard_sizes WHERE store_id != owner_store_id);
    
    DELETE FROM standard_item_prices 
    WHERE size_id IN (SELECT id FROM standard_sizes WHERE store_id != owner_store_id);

    DELETE FROM standard_sizes WHERE store_id != owner_store_id;

    -- Deletar pizza_sizes de outras lojas
    DELETE FROM pizza_sizes WHERE store_id != owner_store_id;

    -- Deletar categories de outras lojas
    DELETE FROM categories WHERE store_id != owner_store_id;

    -- Deletar audit_logs de outras lojas
    DELETE FROM audit_logs WHERE store_id != owner_store_id;

    -- Deletar staff_permissions de outras lojas
    DELETE FROM staff_permissions WHERE store_id != owner_store_id;

    -- Deletar access_codes de outras lojas
    DELETE FROM access_codes WHERE store_id != owner_store_id;

    -- Deletar store_staff de outras lojas
    DELETE FROM store_staff WHERE store_id != owner_store_id;

    -- Deletar subscriptions de outras lojas
    DELETE FROM subscriptions WHERE store_id != owner_store_id;

    -- Deletar tables de outras lojas
    DELETE FROM tables WHERE store_id != owner_store_id;

    -- Deletar profiles de outras lojas (exceto o owner)
    DELETE FROM profiles WHERE store_id != owner_store_id AND id != owner_user_id;

    -- Finalmente, deletar as stores que não são a do owner
    DELETE FROM stores WHERE id != owner_store_id;

    RAISE NOTICE 'Limpeza concluída! Mantidos apenas dados da loja %', owner_store_id;
END $$;
