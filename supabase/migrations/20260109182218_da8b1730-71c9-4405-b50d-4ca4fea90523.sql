-- Criar trigger para baixa de estoque quando pedido entra em "preparing"
-- Esta função já existe e trata produtos 'inv-' e produtos normais com has_stock_control
CREATE TRIGGER trigger_deduct_inventory_on_order_accepted
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_order_accepted();