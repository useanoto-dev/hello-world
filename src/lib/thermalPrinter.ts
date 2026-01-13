// Web Serial API for thermal printer communication
// Supports 58mm, 80mm thermal printers and A4 browser printing

const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

export const ESCPOS_RAW = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  SIZE_NORMAL: GS + '!' + '\x00',
  SIZE_DOUBLE: GS + '!' + '\x11',
  SIZE_LARGE: GS + '!' + '\x22',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  CUT_FULL: GS + 'V' + '\x00',
  CUT_PARTIAL: GS + 'V' + '\x01',
  FEED: (n: number) => ESC + 'd' + String.fromCharCode(n),
};

// Printer width configurations
export type PrinterWidth = '58mm' | '80mm' | 'a4';

export const PRINTER_WIDTHS: Record<PrinterWidth, { chars: number; label: string }> = {
  '58mm': { chars: 32, label: '58mm (32 caracteres)' },
  '80mm': { chars: 48, label: '80mm (48 caracteres)' },
  'a4': { chars: 80, label: 'A4 (Impressora comum)' },
};

const getCharsPerLine = (width: PrinterWidth = '80mm') => PRINTER_WIDTHS[width].chars;

export interface ComandaData {
  order_number: number;
  hora: string;
  cliente: string;
  whatsapp: string;
  endereco?: string;
  referencia?: string;
  forma_pagamento: string;
  troco?: string;
  items: Array<{
    qty: number;
    nome: string;
    observacao?: string;
  }>;
  total: number;
  taxa_entrega: number;
  tipo_servico: 'delivery' | 'pickup' | 'dine_in';
  mesa?: string; // Table number for dine_in PDV orders
}

export interface TableBillData {
  mesa: string;
  hora: string;
  tempo_permanencia: string;
  items: Array<{
    qty: number;
    nome: string;
    preco_unitario: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  pagamentos: Array<{
    metodo: string;
    valor: number;
  }>;
  troco?: number;
}

// Format currency
const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

// Pad line with spaces
const padLine = (left: string, right: string, width: number) => {
  const space = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, space)) + right;
};

// Generate ESC/POS raw commands for thermal printers (58mm/80mm)
export function generateESCPOSComanda(data: ComandaData, printerWidth: PrinterWidth = '80mm'): string {
  const CHARS_PER_LINE = getCharsPerLine(printerWidth);
  let cmd = '';
  const divider = '-'.repeat(CHARS_PER_LINE);
  
  // Initialize printer
  cmd += ESCPOS_RAW.INIT;
  
  // Header - COMANDA centered + large order number
  cmd += ESCPOS_RAW.ALIGN_CENTER;
  cmd += ESCPOS_RAW.BOLD_ON;
  cmd += ESCPOS_RAW.SIZE_NORMAL;
  cmd += 'COMANDA' + LF;
  cmd += ESCPOS_RAW.SIZE_LARGE;
  cmd += `#${data.order_number}` + LF;
  cmd += ESCPOS_RAW.SIZE_NORMAL;
  cmd += ESCPOS_RAW.BOLD_OFF;
  cmd += data.hora + LF;
  cmd += LF;
  
  // Switch to left align for fields
  cmd += ESCPOS_RAW.ALIGN_LEFT;
  cmd += divider + LF;
  
  // Customer info fields
  cmd += 'CLIENTE: ' + data.cliente + LF;
  cmd += 'WHATSAPP: ' + data.whatsapp + LF;
  
  if (data.endereco) {
    cmd += 'ENDERECO: ' + data.endereco + LF;
  }
  
  if (data.referencia) {
    cmd += 'REFERENCIA: ' + data.referencia + LF;
  }
  
  cmd += 'PAGAMENTO: ' + data.forma_pagamento + LF;
  
  if (data.troco) {
    cmd += 'TROCO PARA: ' + data.troco + LF;
  }
  
  cmd += divider + LF;
  cmd += ESCPOS_RAW.BOLD_ON;
  cmd += 'ITENS' + LF;
  cmd += ESCPOS_RAW.BOLD_OFF;
  cmd += LF;
  
  // Items list
  data.items.forEach(item => {
    cmd += `${item.qty}x ${item.nome}` + LF;
    if (item.observacao) {
      cmd += `   - ${item.observacao}` + LF;
    }
  });
  
  cmd += LF;
  cmd += divider + LF;
  
  // Totals
  if (data.taxa_entrega > 0) {
    cmd += padLine('TAXA ENTREGA:', formatCurrency(data.taxa_entrega), CHARS_PER_LINE) + LF;
  }
  
  cmd += ESCPOS_RAW.BOLD_ON;
  cmd += ESCPOS_RAW.SIZE_DOUBLE;
  cmd += padLine('TOTAL:', formatCurrency(data.total), CHARS_PER_LINE) + LF;
  cmd += ESCPOS_RAW.SIZE_NORMAL;
  cmd += ESCPOS_RAW.BOLD_OFF;
  
  cmd += LF;
  
  // Service type and table number
  cmd += ESCPOS_RAW.ALIGN_CENTER;
  cmd += ESCPOS_RAW.BOLD_ON;
  
  if (data.mesa) {
    // Show table number prominently for dine_in orders
    cmd += ESCPOS_RAW.SIZE_DOUBLE;
    cmd += `MESA ${data.mesa}` + LF;
    cmd += ESCPOS_RAW.SIZE_NORMAL;
  } else {
    const serviceLabel = data.tipo_servico === 'delivery' ? 'ENTREGAR' : 
                          data.tipo_servico === 'pickup' ? 'RETIRAR' : 'MESA';
    cmd += `*** ${serviceLabel} ***` + LF;
  }
  cmd += ESCPOS_RAW.BOLD_OFF;
  
  // Feed and cut
  cmd += ESCPOS_RAW.FEED(4);
  cmd += ESCPOS_RAW.CUT_FULL;
  
  return cmd;
}

// Store footer data for A4 prints
export interface StoreFooterData {
  nome?: string;
  endereco?: string;
  telefone?: string;
  whatsapp?: string;
  mensagemPersonalizada?: string;
}

// Generate HTML for A4/browser printing
export function generateHTMLComanda(data: ComandaData, logoUrl?: string, storeInfo?: StoreFooterData): string {
  const serviceLabel = data.tipo_servico === 'delivery' ? '🛵 ENTREGAR' : 
                       data.tipo_servico === 'pickup' ? '🏪 RETIRAR' : '🍽️ MESA';
  
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding: 8px 4px; border-bottom: 1px solid #eee;">
        <strong>${item.qty}x</strong> ${item.nome}
        ${item.observacao ? `<br><small style="color: #666; font-style: italic;">📝 ${item.observacao}</small>` : ''}
      </td>
    </tr>
  `).join('');

  const logoHTML = logoUrl ? `
    <div style="text-align: center; margin-bottom: 15px;">
      <img src="${logoUrl}" alt="Logo" style="max-width: 120px; max-height: 80px; object-fit: contain;" />
    </div>
  ` : '';

  const defaultMessage = 'Obrigado pela preferência! 😊';
  const footerMessage = storeInfo?.mensagemPersonalizada || defaultMessage;

  const footerHTML = storeInfo ? `
    <div class="footer">
      ${storeInfo.nome ? `<p style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${storeInfo.nome}</p>` : ''}
      ${storeInfo.endereco ? `<p>📍 ${storeInfo.endereco}</p>` : ''}
      ${storeInfo.telefone ? `<p>📞 ${storeInfo.telefone}</p>` : ''}
      ${storeInfo.whatsapp ? `<p>💬 WhatsApp: ${storeInfo.whatsapp}</p>` : ''}
      <p style="margin-top: 12px;">${footerMessage}</p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Comanda #${data.order_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 20px;
          max-width: 400px;
          margin: 0 auto;
        }
        .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed #333; }
        .order-number { font-size: 48px; font-weight: bold; color: #333; }
        .datetime { color: #666; margin-top: 5px; }
        .section { margin: 15px 0; }
        .section-title { font-weight: bold; font-size: 14px; color: #333; margin-bottom: 8px; text-transform: uppercase; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .info-label { color: #666; }
        .info-value { font-weight: 500; }
        table { width: 100%; border-collapse: collapse; }
        .totals { border-top: 2px dashed #333; margin-top: 15px; padding-top: 15px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .grand-total { font-size: 24px; font-weight: bold; background: #f5f5f5; padding: 12px; border-radius: 8px; margin-top: 10px; }
        .service-type { text-align: center; font-size: 20px; font-weight: bold; background: #333; color: white; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .table-number { font-size: 28px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc; color: #666; font-size: 12px; line-height: 1.6; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${logoHTML}
      <div class="header">
        <div style="font-size: 18px; font-weight: bold;">COMANDA</div>
        <div class="order-number">#${data.order_number}</div>
        <div class="datetime">${data.hora}</div>
      </div>

      <div class="section">
        <div class="info-row">
          <span class="info-label">Cliente:</span>
          <span class="info-value">${data.cliente}</span>
        </div>
        <div class="info-row">
          <span class="info-label">WhatsApp:</span>
          <span class="info-value">${data.whatsapp}</span>
        </div>
        ${data.endereco ? `
          <div class="info-row">
            <span class="info-label">Endereço:</span>
            <span class="info-value" style="text-align: right; max-width: 60%;">${data.endereco}</span>
          </div>
        ` : ''}
        ${data.referencia ? `
          <div class="info-row">
            <span class="info-label">Referência:</span>
            <span class="info-value">${data.referencia}</span>
          </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Pagamento:</span>
          <span class="info-value">${data.forma_pagamento}</span>
        </div>
        ${data.troco ? `
          <div class="info-row">
            <span class="info-label">Troco para:</span>
            <span class="info-value">${data.troco}</span>
          </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Itens</div>
        <table>${itemsHTML}</table>
      </div>

      <div class="totals">
        ${data.taxa_entrega > 0 ? `
          <div class="total-row">
            <span>Taxa de entrega:</span>
            <span>${formatCurrency(data.taxa_entrega)}</span>
          </div>
        ` : ''}
        <div class="grand-total">
          <div class="total-row">
            <span>TOTAL:</span>
            <span>${formatCurrency(data.total)}</span>
          </div>
        </div>
      </div>

      <div class="service-type ${data.mesa ? 'table-number' : ''}">
        ${data.mesa ? `MESA ${data.mesa}` : serviceLabel}
      </div>

      ${footerHTML}

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;
}

// Generate HTML for A4 table bill
export function generateHTMLTableBill(data: TableBillData, logoUrl?: string, storeInfo?: StoreFooterData): string {
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding: 8px 4px; border-bottom: 1px solid #eee;">${item.qty}x</td>
      <td style="padding: 8px 4px; border-bottom: 1px solid #eee;">${item.nome}</td>
      <td style="padding: 8px 4px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.preco_unitario)}</td>
      <td style="padding: 8px 4px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  const pagamentosHTML = data.pagamentos.map(pag => `
    <div class="total-row">
      <span>${pag.metodo}:</span>
      <span>${formatCurrency(pag.valor)}</span>
    </div>
  `).join('');

  const logoHTML = logoUrl ? `
    <div style="text-align: center; margin-bottom: 15px;">
      <img src="${logoUrl}" alt="Logo" style="max-width: 150px; max-height: 100px; object-fit: contain;" />
    </div>
  ` : '';

  const defaultMessage = 'Obrigado pela preferência! Volte sempre! 😊';
  const footerMessage = storeInfo?.mensagemPersonalizada || defaultMessage;

  const footerHTML = storeInfo ? `
    <div class="footer">
      ${storeInfo.nome ? `<p style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${storeInfo.nome}</p>` : ''}
      ${storeInfo.endereco ? `<p>📍 ${storeInfo.endereco}</p>` : ''}
      ${storeInfo.telefone ? `<p>📞 ${storeInfo.telefone}</p>` : ''}
      ${storeInfo.whatsapp ? `<p>💬 WhatsApp: ${storeInfo.whatsapp}</p>` : ''}
      <p style="margin-top: 12px;">${footerMessage}</p>
    </div>
  ` : `
    <div class="footer">
      <p>${defaultMessage}</p>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Conta - Mesa ${data.mesa}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 20px;
          max-width: 500px;
          margin: 0 auto;
        }
        .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px double #333; }
        .table-number { font-size: 36px; font-weight: bold; color: #333; }
        .datetime { color: #666; margin-top: 5px; }
        .section { margin: 15px 0; }
        .section-title { font-weight: bold; font-size: 14px; color: #333; margin-bottom: 8px; text-transform: uppercase; background: #f5f5f5; padding: 8px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 8px 4px; border-bottom: 2px solid #333; font-size: 12px; text-transform: uppercase; }
        th:last-child, th:nth-child(3) { text-align: right; }
        .totals { border-top: 3px double #333; margin-top: 15px; padding-top: 15px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .grand-total { font-size: 24px; font-weight: bold; background: #333; color: white; padding: 15px; border-radius: 8px; margin-top: 10px; }
        .payments { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 15px; }
        .change { background: #e8f5e9; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc; color: #666; font-size: 12px; line-height: 1.6; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${logoHTML}
      <div class="header">
        <div style="font-size: 20px; font-weight: bold;">CONTA</div>
        <div class="table-number">MESA ${data.mesa}</div>
        <div class="datetime">${data.hora}</div>
        <div style="color: #666; font-size: 12px; margin-top: 5px;">Permanência: ${data.tempo_permanencia}</div>
      </div>

      <div class="section">
        <div class="section-title">Itens Consumidos</div>
        <table>
          <thead>
            <tr>
              <th>Qtd</th>
              <th>Item</th>
              <th>Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        <div class="grand-total">
          <div class="total-row">
            <span>TOTAL:</span>
            <span>${formatCurrency(data.total)}</span>
          </div>
        </div>
      </div>

      <div class="payments">
        <div class="section-title" style="margin: 0 0 10px 0;">Formas de Pagamento</div>
        ${pagamentosHTML}
        ${data.troco && data.troco > 0 ? `
          <div class="change">
            <div class="total-row">
              <span><strong>Troco:</strong></span>
              <span><strong>${formatCurrency(data.troco)}</strong></span>
            </div>
          </div>
        ` : ''}
      </div>

      ${footerHTML}

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;
}

// Open HTML in new window for printing (A4/browser print)
export function printHTML(html: string): void {
  const printWindow = window.open('', '_blank', 'width=500,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// Generate consolidated table bill receipt for thermal printers
export function generateTableBillReceipt(data: TableBillData, printerWidth: PrinterWidth = '80mm'): string {
  const CHARS_PER_LINE = getCharsPerLine(printerWidth);
  let cmd = '';
  const divider = '-'.repeat(CHARS_PER_LINE);
  const doubleDivider = '='.repeat(CHARS_PER_LINE);
  
  // Initialize printer
  cmd += ESCPOS_RAW.INIT;
  
  // Header
  cmd += ESCPOS_RAW.ALIGN_CENTER;
  cmd += ESCPOS_RAW.BOLD_ON;
  cmd += ESCPOS_RAW.SIZE_DOUBLE;
  cmd += 'CONTA' + LF;
  cmd += `MESA ${data.mesa}` + LF;
  cmd += ESCPOS_RAW.SIZE_NORMAL;
  cmd += ESCPOS_RAW.BOLD_OFF;
  cmd += data.hora + LF;
  cmd += LF;
  
  // Occupancy time
  cmd += ESCPOS_RAW.ALIGN_LEFT;
  cmd += `Tempo de permanencia: ${data.tempo_permanencia}` + LF;
  cmd += doubleDivider + LF;
  
  // Items header
  cmd += ESCPOS_RAW.BOLD_ON;
  cmd += 'ITENS CONSUMIDOS' + LF;
  cmd += ESCPOS_RAW.BOLD_OFF;
  cmd += divider + LF;
  
  // Items with prices
  data.items.forEach(item => {
    cmd += `${item.qty}x ${item.nome}` + LF;
    cmd += padLine(`   ${formatCurrency(item.preco_unitario)} un`, formatCurrency(item.total), CHARS_PER_LINE) + LF;
  });
  
  cmd += divider + LF;
  
  // Subtotal
  cmd += padLine('Subtotal:', formatCurrency(data.subtotal), CHARS_PER_LINE) + LF;
  
  // Total
  cmd += ESCPOS_RAW.BOLD_ON;
  cmd += ESCPOS_RAW.SIZE_DOUBLE;
  cmd += padLine('TOTAL:', formatCurrency(data.total), CHARS_PER_LINE) + LF;
  cmd += ESCPOS_RAW.SIZE_NORMAL;
  cmd += ESCPOS_RAW.BOLD_OFF;
  
  cmd += doubleDivider + LF;
  
  // Payment methods
  cmd += ESCPOS_RAW.BOLD_ON;
  cmd += 'FORMAS DE PAGAMENTO' + LF;
  cmd += ESCPOS_RAW.BOLD_OFF;
  cmd += divider + LF;
  
  data.pagamentos.forEach(pag => {
    cmd += padLine(pag.metodo + ':', formatCurrency(pag.valor), CHARS_PER_LINE) + LF;
  });
  
  // Change if any
  if (data.troco && data.troco > 0) {
    cmd += divider + LF;
    cmd += ESCPOS_RAW.BOLD_ON;
    cmd += padLine('TROCO:', formatCurrency(data.troco), CHARS_PER_LINE) + LF;
    cmd += ESCPOS_RAW.BOLD_OFF;
  }
  
  cmd += LF;
  cmd += ESCPOS_RAW.ALIGN_CENTER;
  cmd += 'Obrigado pela preferencia!' + LF;
  cmd += 'Volte sempre!' + LF;
  
  // Feed and cut
  cmd += ESCPOS_RAW.FEED(4);
  cmd += ESCPOS_RAW.CUT_FULL;
  
  return cmd;
}

// Convert string to bytes
export function stringToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

// IndexedDB for storing last comanda
const DB_NAME = 'ComandaDB';
const STORE_NAME = 'comandas';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveLastComanda(data: ComandaData): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put({ id: 'last', ...data, savedAt: new Date().toISOString() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  db.close();
}

export async function getLastComanda(): Promise<ComandaData | null> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  const result = await new Promise<ComandaData | null>((resolve, reject) => {
    const request = store.get('last');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  return result;
}

// Web Serial API types (for browsers that support it)
interface WebSerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  readable: ReadableStream<Uint8Array> | null;
}

interface WebSerial {
  requestPort(): Promise<WebSerialPort>;
  getPorts(): Promise<WebSerialPort[]>;
}

// Web Serial API printer class
export class ThermalPrinter {
  private port: WebSerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  
  async connect(): Promise<boolean> {
    try {
      // Check if Web Serial API is supported
      const serial = (navigator as unknown as { serial?: WebSerial }).serial;
      if (!serial) {
        console.error('Web Serial API not supported');
        return false;
      }
      
      // Request port access
      this.port = await serial.requestPort();
      
      // Open port with 9600 baud
      await this.port.open({ baudRate: 9600 });
      
      // Get writer
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }
      
      console.log('Printer connected');
      return true;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      return false;
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      
      console.log('Printer disconnected');
    } catch (error) {
      console.error('Error disconnecting printer:', error);
    }
  }
  
  async print(data: string): Promise<boolean> {
    try {
      if (!this.writer) {
        console.error('Printer not connected');
        return false;
      }
      
      const bytes = stringToBytes(data);
      await this.writer.write(bytes);
      
      console.log('Print job sent');
      return true;
    } catch (error) {
      console.error('Error printing:', error);
      return false;
    }
  }
  
  isConnected(): boolean {
    return this.port !== null && this.writer !== null;
  }
}

// Singleton printer instance
let printerInstance: ThermalPrinter | null = null;

export function getPrinter(): ThermalPrinter {
  if (!printerInstance) {
    printerInstance = new ThermalPrinter();
  }
  return printerInstance;
}
