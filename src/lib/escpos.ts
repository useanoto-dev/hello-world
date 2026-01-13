// ESC/POS Commands for thermal printers
export const ESC = '\x1B';
export const GS = '\x1D';
export const LF = '\x0A';

export const ESCPOS = {
  // Initialize printer
  INIT: ESC + '@',
  
  // Text alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  
  // Text size
  SIZE_NORMAL: GS + '!' + '\x00',
  SIZE_DOUBLE_WIDTH: GS + '!' + '\x10',
  SIZE_DOUBLE_HEIGHT: GS + '!' + '\x01',
  SIZE_DOUBLE: GS + '!' + '\x11',
  SIZE_TRIPLE: GS + '!' + '\x22',
  
  // Text style
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  INVERTED_ON: GS + 'B' + '\x01',
  INVERTED_OFF: GS + 'B' + '\x00',
  
  // Paper cut
  PAPER_CUT_FULL: GS + 'V' + '\x00',
  PAPER_CUT_PARTIAL: GS + 'V' + '\x01',
  
  // Line spacing
  LINE_SPACING_DEFAULT: ESC + '2',
  LINE_SPACING_SET: (n: number) => ESC + '3' + String.fromCharCode(n),
  
  // Feed
  FEED_LINES: (n: number) => ESC + 'd' + String.fromCharCode(n),
  
  // Beep
  BEEP: ESC + 'B' + '\x02' + '\x02',
  
  // Cash drawer
  OPEN_DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA',
};

// Character widths for different paper sizes
export const PAPER_WIDTHS = {
  '58mm': 32,
  '70mm': 42,
  '80mm': 48,
};

export interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size?: string;
  flavors?: Array<{ name: string }>;
  extras?: {
    border?: { name: string };
    toppings?: Array<{ name: string }>;
  };
}

export interface OrderData {
  order_number: number;
  customer_name: string;
  customer_phone: string;
  service_type: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    reference?: string;
  };
  table_number?: string;
  payment_method: string;
  change_amount?: number;
  subtotal: number;
  delivery_fee?: number;
  total_amount: number;
  observations?: string;
  created_at: string;
  items: OrderItem[];
}

export function generateOrderReceipt(order: OrderData, printerModel: '70mm' | '80mm' = '80mm'): string {
  const width = PAPER_WIDTHS[printerModel];
  const divider = '─'.repeat(width);
  const doubleDivider = '═'.repeat(width);
  
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  const padLine = (left: string, right: string) => {
    const space = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
  };
  const centerText = (text: string) => {
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
  };
  const truncate = (text: string, maxLen: number) => 
    text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;

  const serviceLabels: Record<string, string> = {
    delivery: 'DELIVERY',
    pickup: 'RETIRAR NO LOCAL',
    dine_in: 'CONSUMIR NO LOCAL',
  };

  const paymentLabels: Record<string, string> = {
    pix: 'PIX',
    cartao_credito: 'Cartão Crédito',
    cartao_debito: 'Cartão Débito',
    dinheiro: 'Dinheiro',
  };

  let receipt = '';
  
  // Initialize printer
  receipt += ESCPOS.INIT;
  receipt += ESCPOS.ALIGN_CENTER;
  
  // Header
  receipt += ESCPOS.SIZE_DOUBLE;
  receipt += ESCPOS.BOLD_ON;
  receipt += 'PIZZARIA PORTUGUESA' + LF;
  receipt += ESCPOS.BOLD_OFF;
  receipt += ESCPOS.SIZE_NORMAL;
  receipt += 'O sabor incomparavel' + LF;
  receipt += LF;
  
  // Order number
  receipt += ESCPOS.SIZE_TRIPLE;
  receipt += ESCPOS.BOLD_ON;
  receipt += `PEDIDO #${order.order_number}` + LF;
  receipt += ESCPOS.BOLD_OFF;
  receipt += ESCPOS.SIZE_NORMAL;
  
  receipt += ESCPOS.ALIGN_LEFT;
  receipt += doubleDivider + LF;
  
  // Service type
  receipt += ESCPOS.BOLD_ON;
  receipt += ESCPOS.SIZE_DOUBLE_HEIGHT;
  receipt += centerText(serviceLabels[order.service_type] || order.service_type) + LF;
  receipt += ESCPOS.SIZE_NORMAL;
  receipt += ESCPOS.BOLD_OFF;
  
  receipt += divider + LF;
  
  // Date/Time
  const orderDate = new Date(order.created_at);
  receipt += `Data: ${orderDate.toLocaleDateString('pt-BR')} ${orderDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` + LF;
  
  receipt += divider + LF;
  
  // Customer info
  receipt += ESCPOS.BOLD_ON;
  receipt += 'CLIENTE' + LF;
  receipt += ESCPOS.BOLD_OFF;
  receipt += `Nome: ${order.customer_name}` + LF;
  receipt += `Tel: ${order.customer_phone}` + LF;
  
  // Address for delivery
  if (order.service_type === 'delivery' && order.address) {
    receipt += LF;
    receipt += ESCPOS.BOLD_ON;
    receipt += 'ENDERECO' + LF;
    receipt += ESCPOS.BOLD_OFF;
    receipt += `${order.address.street || ''}, ${order.address.number || ''}` + LF;
    if (order.address.complement) receipt += `Complemento: ${order.address.complement}` + LF;
    receipt += `Bairro: ${order.address.neighborhood || ''}` + LF;
    if (order.address.reference) receipt += `Ref: ${order.address.reference}` + LF;
  }
  
  // Table number
  if (order.table_number) {
    receipt += ESCPOS.SIZE_DOUBLE;
    receipt += `Mesa: ${order.table_number}` + LF;
    receipt += ESCPOS.SIZE_NORMAL;
  }
  
  receipt += divider + LF;
  
  // Items
  receipt += ESCPOS.BOLD_ON;
  receipt += 'ITENS DO PEDIDO' + LF;
  receipt += ESCPOS.BOLD_OFF;
  receipt += LF;
  
  order.items.forEach((item) => {
    const itemName = truncate(item.product_name, width - 15);
    const itemTotal = formatCurrency(item.total_price);
    
    receipt += ESCPOS.BOLD_ON;
    receipt += `${item.quantity}x ${itemName}` + LF;
    receipt += ESCPOS.BOLD_OFF;
    
    if (item.size) {
      receipt += `   Tamanho: ${item.size}` + LF;
    }
    
    if (item.flavors && item.flavors.length > 0) {
      const flavorsText = item.flavors.map(f => f.name).join(', ');
      receipt += `   Sabores: ${truncate(flavorsText, width - 12)}` + LF;
    }
    
    if (item.extras?.border) {
      receipt += `   Borda: ${item.extras.border.name}` + LF;
    }
    
    receipt += padLine('   Valor:', itemTotal) + LF;
    receipt += LF;
  });
  
  receipt += divider + LF;
  
  // Payment
  receipt += ESCPOS.BOLD_ON;
  receipt += 'PAGAMENTO' + LF;
  receipt += ESCPOS.BOLD_OFF;
  receipt += `Forma: ${paymentLabels[order.payment_method] || order.payment_method}` + LF;
  if (order.change_amount) {
    receipt += `Troco para: ${formatCurrency(order.change_amount)}` + LF;
  }
  
  receipt += divider + LF;
  
  // Totals
  receipt += padLine('Subtotal:', formatCurrency(order.subtotal)) + LF;
  if (order.delivery_fee && order.delivery_fee > 0) {
    receipt += padLine('Entrega:', formatCurrency(order.delivery_fee)) + LF;
  }
  
  receipt += LF;
  receipt += ESCPOS.SIZE_DOUBLE;
  receipt += ESCPOS.BOLD_ON;
  receipt += padLine('TOTAL:', formatCurrency(order.total_amount)) + LF;
  receipt += ESCPOS.BOLD_OFF;
  receipt += ESCPOS.SIZE_NORMAL;
  
  // Observations
  if (order.observations) {
    receipt += LF;
    receipt += divider + LF;
    receipt += ESCPOS.BOLD_ON;
    receipt += 'OBSERVACOES' + LF;
    receipt += ESCPOS.BOLD_OFF;
    receipt += order.observations + LF;
  }
  
  // Footer
  receipt += LF;
  receipt += doubleDivider + LF;
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += 'Obrigado pela preferencia!' + LF;
  receipt += '@pizzariaportuguesaofc' + LF;
  receipt += LF;
  receipt += LF;
  receipt += LF;
  
  // Paper cut
  receipt += ESCPOS.PAPER_CUT_PARTIAL;
  
  return receipt;
}

// Convert string to bytes for printing
export function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Generate HTML preview of receipt
export function generateReceiptHTML(order: OrderData, printerModel: '70mm' | '80mm' = '80mm'): string {
  const width = printerModel === '80mm' ? '80mm' : '70mm';
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  
  const serviceLabels: Record<string, string> = {
    delivery: '🛵 DELIVERY',
    pickup: '🏪 RETIRAR NO LOCAL',
    dine_in: '🍽️ CONSUMIR NO LOCAL',
  };

  const paymentLabels: Record<string, string> = {
    pix: 'PIX',
    cartao_credito: 'Cartão Crédito',
    cartao_debito: 'Cartão Débito',
    dinheiro: 'Dinheiro',
  };

  const orderDate = new Date(order.created_at);

  return `
    <div style="width: ${width}; font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; background: white; color: black;">
      <div style="text-align: center; margin-bottom: 10px;">
        <strong style="font-size: 16px;">PIZZARIA PORTUGUESA</strong><br/>
        <span style="font-size: 10px;">O sabor incomparável</span>
      </div>
      
      <div style="text-align: center; margin: 15px 0; padding: 10px; background: #f0f0f0; border-radius: 4px;">
        <strong style="font-size: 24px;">PEDIDO #${order.order_number}</strong>
      </div>
      
      <div style="text-align: center; margin: 10px 0;">
        <strong style="font-size: 14px;">${serviceLabels[order.service_type] || order.service_type}</strong>
      </div>
      
      <hr style="border: 1px dashed #ccc;"/>
      
      <div style="font-size: 10px; margin: 5px 0;">
        ${orderDate.toLocaleDateString('pt-BR')} ${orderDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      
      <hr style="border: 1px dashed #ccc;"/>
      
      <div style="margin: 10px 0;">
        <strong>CLIENTE</strong><br/>
        Nome: ${order.customer_name}<br/>
        Tel: ${order.customer_phone}
      </div>
      
      ${order.service_type === 'delivery' && order.address ? `
        <div style="margin: 10px 0;">
          <strong>ENDEREÇO</strong><br/>
          ${order.address.street || ''}, ${order.address.number || ''}<br/>
          ${order.address.complement ? `Complemento: ${order.address.complement}<br/>` : ''}
          Bairro: ${order.address.neighborhood || ''}<br/>
          ${order.address.reference ? `Ref: ${order.address.reference}` : ''}
        </div>
      ` : ''}
      
      ${order.table_number ? `<div style="font-size: 16px; margin: 10px 0;"><strong>Mesa: ${order.table_number}</strong></div>` : ''}
      
      <hr style="border: 1px dashed #ccc;"/>
      
      <div style="margin: 10px 0;">
        <strong>ITENS DO PEDIDO</strong><br/><br/>
        ${order.items.map(item => `
          <div style="margin-bottom: 10px;">
            <strong>${item.quantity}x ${item.product_name}</strong><br/>
            ${item.size ? `<span style="font-size: 10px;">Tamanho: ${item.size}</span><br/>` : ''}
            ${item.flavors?.length ? `<span style="font-size: 10px;">Sabores: ${item.flavors.map(f => f.name).join(', ')}</span><br/>` : ''}
            ${item.extras?.border ? `<span style="font-size: 10px;">Borda: ${item.extras.border.name}</span><br/>` : ''}
            <span style="float: right;">${formatCurrency(item.total_price)}</span>
          </div>
        `).join('')}
      </div>
      
      <hr style="border: 1px dashed #ccc;"/>
      
      <div style="margin: 10px 0;">
        <strong>PAGAMENTO</strong><br/>
        Forma: ${paymentLabels[order.payment_method] || order.payment_method}<br/>
        ${order.change_amount ? `Troco para: ${formatCurrency(order.change_amount)}` : ''}
      </div>
      
      <hr style="border: 1px dashed #ccc;"/>
      
      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${order.delivery_fee && order.delivery_fee > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Entrega:</span>
            <span>${formatCurrency(order.delivery_fee)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 10px;">
          <span>TOTAL:</span>
          <span>${formatCurrency(order.total_amount)}</span>
        </div>
      </div>
      
      ${order.observations ? `
        <hr style="border: 1px dashed #ccc;"/>
        <div style="margin: 10px 0;">
          <strong>OBSERVAÇÕES</strong><br/>
          ${order.observations}
        </div>
      ` : ''}
      
      <hr style="border: 1px solid #333;"/>
      
      <div style="text-align: center; margin-top: 15px; font-size: 10px;">
        Obrigado pela preferência!<br/>
        @pizzariaportuguesaofc
      </div>
    </div>
  `;
}
