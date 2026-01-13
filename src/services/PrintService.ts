// Unified Print Service
// Consolidates thermal printing (USB), PrintNode (cloud), and A4 (browser) printing

import { 
  getPrinter, 
  generateESCPOSComanda, 
  generateHTMLComanda, 
  generateHTMLTableBill,
  generateTableBillReceipt,
  printHTML,
  ComandaData, 
  TableBillData,
  PrinterWidth,
  StoreFooterData
} from '@/lib/thermalPrinter';
import { printJob as printNodeJob } from '@/lib/printnode';
import { toast } from 'sonner';

export type PrintMethod = 'usb' | 'printnode' | 'a4';

export interface PrintConfig {
  printerWidth: PrinterWidth;
  printNodePrinterId?: string | number;
  storeId?: string;
  orderId?: string;
  orderNumber?: number;
  printerName?: string;
  maxRetries?: number;
  logoUrl?: string;
  storeInfo?: StoreFooterData;
}

export interface PrintResult {
  success: boolean;
  method: PrintMethod;
  error?: string;
  jobId?: number;
}

/**
 * Check if Web Serial API is supported in current environment
 */
export function isUSBPrintingSupported(): boolean {
  // Check if running in iframe (blocked by permissions policy)
  const isInIframe = window !== window.top;
  
  // Check if Web Serial API exists
  const hasWebSerial = 'serial' in navigator;
  
  // USB printing only works outside iframes with Web Serial support
  return hasWebSerial && !isInIframe;
}

/**
 * Get available print methods based on configuration and environment
 */
export function getAvailablePrintMethods(config: {
  hasUSBPrinter?: boolean;
  hasPrintNode?: boolean;
  printerWidth?: PrinterWidth;
}): PrintMethod[] {
  const methods: PrintMethod[] = [];
  
  // A4 is always available (browser print)
  if (config.printerWidth === 'a4') {
    methods.push('a4');
  }
  
  // PrintNode (cloud printing) - always available if configured
  if (config.hasPrintNode) {
    methods.push('printnode');
  }
  
  // USB only if supported and connected
  if (config.hasUSBPrinter && isUSBPrintingSupported()) {
    methods.push('usb');
  }
  
  // Fallback to A4 if no thermal methods available
  if (methods.length === 0) {
    methods.push('a4');
  }
  
  return methods;
}

/**
 * Print a comanda using the best available method
 */
export async function printComanda(
  data: ComandaData,
  config: PrintConfig
): Promise<PrintResult> {
  const { printerWidth } = config;
  
  // A4 browser printing
  if (printerWidth === 'a4') {
    const html = generateHTMLComanda(data, config.logoUrl, config.storeInfo);
    printHTML(html);
    return { success: true, method: 'a4' };
  }
  
  // Generate ESC/POS data for thermal printers
  const escposData = generateESCPOSComanda(data, printerWidth);
  
  // Try PrintNode first if configured
  if (config.printNodePrinterId) {
    const result = await printNodeJob(
      Number(config.printNodePrinterId),
      escposData,
      `Comanda #${data.order_number}`,
      {
        storeId: config.storeId,
        orderId: config.orderId,
        orderNumber: config.orderNumber,
        printerName: config.printerName,
        maxRetries: config.maxRetries ?? 2
      }
    );
    
    if (result.success) {
      return { success: true, method: 'printnode', jobId: result.jobId };
    }
    
    // PrintNode failed, return error (don't fallback to USB as user chose cloud)
    return { 
      success: false, 
      method: 'printnode', 
      error: result.error || 'Falha ao enviar para PrintNode' 
    };
  }
  
  // Try USB printing
  if (!isUSBPrintingSupported()) {
    return {
      success: false,
      method: 'usb',
      error: 'Impressão USB não suportada neste navegador/ambiente. Use PrintNode ou impressão A4.'
    };
  }
  
  const printer = getPrinter();
  if (!printer.isConnected()) {
    return {
      success: false,
      method: 'usb',
      error: 'Impressora USB não conectada'
    };
  }
  
  const success = await printer.print(escposData);
  return { 
    success, 
    method: 'usb',
    error: success ? undefined : 'Erro ao enviar dados para a impressora'
  };
}

/**
 * Print a table bill using the best available method
 */
export async function printTableBill(
  data: TableBillData,
  config: PrintConfig
): Promise<PrintResult> {
  const { printerWidth } = config;
  
  // A4 browser printing
  if (printerWidth === 'a4') {
    const html = generateHTMLTableBill(data, config.logoUrl, config.storeInfo);
    printHTML(html);
    return { success: true, method: 'a4' };
  }
  
  // Generate ESC/POS data for thermal printers
  const escposData = generateTableBillReceipt(data, printerWidth);
  
  // Try PrintNode first if configured
  if (config.printNodePrinterId) {
    const result = await printNodeJob(
      Number(config.printNodePrinterId),
      escposData,
      `Conta Mesa ${data.mesa}`,
      {
        storeId: config.storeId,
        printerName: config.printerName,
        maxRetries: config.maxRetries ?? 2
      }
    );
    
    if (result.success) {
      return { success: true, method: 'printnode', jobId: result.jobId };
    }
    
    return { 
      success: false, 
      method: 'printnode', 
      error: result.error || 'Falha ao enviar para PrintNode' 
    };
  }
  
  // Try USB printing
  if (!isUSBPrintingSupported()) {
    return {
      success: false,
      method: 'usb',
      error: 'Impressão USB não suportada neste navegador/ambiente'
    };
  }
  
  const printer = getPrinter();
  if (!printer.isConnected()) {
    return {
      success: false,
      method: 'usb',
      error: 'Impressora USB não conectada'
    };
  }
  
  const success = await printer.print(escposData);
  return { 
    success, 
    method: 'usb',
    error: success ? undefined : 'Erro ao enviar dados para a impressora'
  };
}

/**
 * Show toast notification for print result
 */
export function showPrintResultToast(
  result: PrintResult,
  orderNumber?: number,
  tableName?: string
): void {
  const identifier = orderNumber ? `#${orderNumber}` : (tableName ? `Mesa ${tableName}` : '');
  
  if (result.success) {
    const icon = result.method === 'printnode' ? '☁️' : '🖨️';
    toast.success(`${icon} ${identifier} enviado para impressão`, { duration: 3000 });
  } else {
    toast.error(`❌ Falha na impressão ${identifier}`, {
      description: result.error,
      duration: 10000,
    });
  }
}

/**
 * Connect to USB printer with proper error handling
 */
export async function connectUSBPrinter(): Promise<{ success: boolean; error?: string }> {
  if (!isUSBPrintingSupported()) {
    const isInIframe = window !== window.top;
    return {
      success: false,
      error: isInIframe 
        ? 'Impressão USB bloqueada em iframe. Abra em uma nova aba ou use PrintNode.'
        : 'Navegador não suporta Web Serial API. Use Chrome, Edge ou Opera.'
    };
  }
  
  const printer = getPrinter();
  const connected = await printer.connect();
  
  return {
    success: connected,
    error: connected ? undefined : 'Não foi possível conectar à impressora'
  };
}

/**
 * Disconnect USB printer
 */
export async function disconnectUSBPrinter(): Promise<void> {
  const printer = getPrinter();
  await printer.disconnect();
}

/**
 * Check if USB printer is connected
 */
export function isUSBPrinterConnected(): boolean {
  const printer = getPrinter();
  return printer.isConnected();
}
