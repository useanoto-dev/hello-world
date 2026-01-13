import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
  isUSBPrintingSupported,
  getAvailablePrintMethods,
  printComanda,
  printTableBill,
  showPrintResultToast,
  PrintMethod,
  PrintConfig,
  PrintResult,
} from './PrintService';
import * as thermalPrinter from '@/lib/thermalPrinter';
import * as printnode from '@/lib/printnode';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/thermalPrinter', () => ({
  getPrinter: vi.fn(),
  generateESCPOSComanda: vi.fn().mockReturnValue('ESC/POS data'),
  generateHTMLComanda: vi.fn().mockReturnValue('<html>comanda</html>'),
  generateHTMLTableBill: vi.fn().mockReturnValue('<html>bill</html>'),
  generateTableBillReceipt: vi.fn().mockReturnValue('ESC/POS bill'),
  printHTML: vi.fn(),
}));

vi.mock('@/lib/printnode', () => ({
  printJob: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PrintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isUSBPrintingSupported', () => {
    it('should return true when Web Serial API is available and not in iframe', () => {
      Object.defineProperty(navigator, 'serial', {
        value: { requestPort: vi.fn() },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'top', {
        value: window,
        writable: true,
        configurable: true,
      });

      expect(isUSBPrintingSupported()).toBe(true);
    });

    it('should return false when Web Serial API is not available', () => {
      Object.defineProperty(navigator, 'serial', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isUSBPrintingSupported()).toBe(false);
    });

    it('should return false when running in iframe', () => {
      Object.defineProperty(navigator, 'serial', {
        value: { requestPort: vi.fn() },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'top', {
        value: {} as Window,
        writable: true,
        configurable: true,
      });

      expect(isUSBPrintingSupported()).toBe(false);
    });
  });

  describe('getAvailablePrintMethods', () => {
    beforeEach(() => {
      // Default: no USB support
      Object.defineProperty(navigator, 'serial', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    it('should return only a4 when printerWidth is a4', () => {
      const methods = getAvailablePrintMethods({
        printerWidth: 'a4',
        hasUSBPrinter: false,
        hasPrintNode: false,
      });

      expect(methods).toContain('a4');
      expect(methods).toHaveLength(1);
    });

    it('should return printnode when configured', () => {
      const methods = getAvailablePrintMethods({
        printerWidth: '80mm',
        hasUSBPrinter: false,
        hasPrintNode: true,
      });

      expect(methods).toContain('printnode');
    });

    it('should fallback to a4 when no methods available', () => {
      const methods = getAvailablePrintMethods({
        printerWidth: '80mm',
        hasUSBPrinter: false,
        hasPrintNode: false,
      });

      expect(methods).toContain('a4');
      expect(methods).toHaveLength(1);
    });
  });

  describe('printComanda', () => {
    const mockComandaData: thermalPrinter.ComandaData = {
      order_number: 1234,
      hora: '08/01 14:30',
      cliente: 'João Silva',
      whatsapp: '11999999999',
      items: [
        { qty: 2, nome: 'Pizza Margherita' },
        { qty: 1, nome: 'Coca-Cola 2L' },
      ],
      total: 89.90,
      taxa_entrega: 5.00,
      tipo_servico: 'delivery',
      forma_pagamento: 'PIX',
    };

    it('should use A4 browser printing when printerWidth is a4', async () => {
      const config: PrintConfig = {
        printerWidth: 'a4',
        logoUrl: 'https://example.com/logo.png',
        storeInfo: { nome: 'Pizzaria Test' },
      };

      const result = await printComanda(mockComandaData, config);

      expect(thermalPrinter.generateHTMLComanda).toHaveBeenCalledWith(
        mockComandaData,
        config.logoUrl,
        config.storeInfo
      );
      expect(thermalPrinter.printHTML).toHaveBeenCalled();
      expect(result).toEqual({ success: true, method: 'a4' });
    });

    it('should use PrintNode when configured', async () => {
      (printnode.printJob as Mock).mockResolvedValue({
        success: true,
        jobId: 12345,
      });

      const config: PrintConfig = {
        printerWidth: '80mm',
        printNodePrinterId: '999',
        storeId: 'store-123',
        orderId: 'order-456',
        orderNumber: 1234,
        printerName: 'Cozinha',
        maxRetries: 2,
      };

      const result = await printComanda(mockComandaData, config);

      expect(thermalPrinter.generateESCPOSComanda).toHaveBeenCalledWith(
        mockComandaData,
        '80mm'
      );
      expect(printnode.printJob).toHaveBeenCalledWith(
        999,
        'ESC/POS data',
        'Comanda #1234',
        expect.objectContaining({
          storeId: 'store-123',
          orderId: 'order-456',
          orderNumber: 1234,
          printerName: 'Cozinha',
          maxRetries: 2,
        })
      );
      expect(result).toEqual({ success: true, method: 'printnode', jobId: 12345 });
    });

    it('should return error when PrintNode fails', async () => {
      (printnode.printJob as Mock).mockResolvedValue({
        success: false,
        error: 'Printer offline',
      });

      const config: PrintConfig = {
        printerWidth: '80mm',
        printNodePrinterId: '999',
      };

      const result = await printComanda(mockComandaData, config);

      expect(result).toEqual({
        success: false,
        method: 'printnode',
        error: 'Printer offline',
      });
    });

    it('should return error when USB is not supported and no PrintNode', async () => {
      Object.defineProperty(navigator, 'serial', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const config: PrintConfig = {
        printerWidth: '80mm',
      };

      const result = await printComanda(mockComandaData, config);

      expect(result.success).toBe(false);
      expect(result.method).toBe('usb');
      expect(result.error).toContain('USB não suportada');
    });

    it('should return error when USB printer is not connected', async () => {
      Object.defineProperty(navigator, 'serial', {
        value: { requestPort: vi.fn() },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'top', {
        value: window,
        writable: true,
        configurable: true,
      });

      const mockPrinter = {
        isConnected: vi.fn().mockReturnValue(false),
        print: vi.fn(),
      };
      (thermalPrinter.getPrinter as Mock).mockReturnValue(mockPrinter);

      const config: PrintConfig = {
        printerWidth: '80mm',
      };

      const result = await printComanda(mockComandaData, config);

      expect(result).toEqual({
        success: false,
        method: 'usb',
        error: 'Impressora USB não conectada',
      });
    });

    it('should print via USB when connected', async () => {
      Object.defineProperty(navigator, 'serial', {
        value: { requestPort: vi.fn() },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'top', {
        value: window,
        writable: true,
        configurable: true,
      });

      const mockPrinter = {
        isConnected: vi.fn().mockReturnValue(true),
        print: vi.fn().mockResolvedValue(true),
      };
      (thermalPrinter.getPrinter as Mock).mockReturnValue(mockPrinter);

      const config: PrintConfig = {
        printerWidth: '58mm',
      };

      const result = await printComanda(mockComandaData, config);

      expect(thermalPrinter.generateESCPOSComanda).toHaveBeenCalledWith(
        mockComandaData,
        '58mm'
      );
      expect(mockPrinter.print).toHaveBeenCalledWith('ESC/POS data');
      expect(result).toEqual({ success: true, method: 'usb' });
    });
  });

  describe('printTableBill', () => {
    const mockTableBillData: thermalPrinter.TableBillData = {
      mesa: '05',
      hora: '14:30',
      tempo_permanencia: '1h 45min',
      items: [
        { qty: 2, nome: 'Pizza Grande', preco_unitario: 59.90, total: 119.80 },
        { qty: 3, nome: 'Cerveja 600ml', preco_unitario: 12.00, total: 36.00 },
      ],
      subtotal: 155.80,
      total: 145.80,
      pagamentos: [
        { metodo: 'PIX', valor: 100.00 },
        { metodo: 'Dinheiro', valor: 45.80 },
      ],
    };

    it('should use A4 browser printing when printerWidth is a4', async () => {
      const config: PrintConfig = {
        printerWidth: 'a4',
        logoUrl: 'https://example.com/logo.png',
        storeInfo: { nome: 'Pizzaria Test' },
      };

      const result = await printTableBill(mockTableBillData, config);

      expect(thermalPrinter.generateHTMLTableBill).toHaveBeenCalledWith(
        mockTableBillData,
        config.logoUrl,
        config.storeInfo
      );
      expect(thermalPrinter.printHTML).toHaveBeenCalled();
      expect(result).toEqual({ success: true, method: 'a4' });
    });

    it('should use PrintNode when configured', async () => {
      (printnode.printJob as Mock).mockResolvedValue({
        success: true,
        jobId: 67890,
      });

      const config: PrintConfig = {
        printerWidth: '80mm',
        printNodePrinterId: '888',
        storeId: 'store-123',
        printerName: 'Caixa',
        maxRetries: 3,
      };

      const result = await printTableBill(mockTableBillData, config);

      expect(thermalPrinter.generateTableBillReceipt).toHaveBeenCalledWith(
        mockTableBillData,
        '80mm'
      );
      expect(printnode.printJob).toHaveBeenCalledWith(
        888,
        'ESC/POS bill',
        'Conta Mesa 05',
        expect.objectContaining({
          storeId: 'store-123',
          printerName: 'Caixa',
          maxRetries: 3,
        })
      );
      expect(result).toEqual({ success: true, method: 'printnode', jobId: 67890 });
    });

    it('should return error when PrintNode fails', async () => {
      (printnode.printJob as Mock).mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      const config: PrintConfig = {
        printerWidth: '80mm',
        printNodePrinterId: '888',
      };

      const result = await printTableBill(mockTableBillData, config);

      expect(result).toEqual({
        success: false,
        method: 'printnode',
        error: 'Connection timeout',
      });
    });

    it('should print via USB when connected', async () => {
      Object.defineProperty(navigator, 'serial', {
        value: { requestPort: vi.fn() },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'top', {
        value: window,
        writable: true,
        configurable: true,
      });

      const mockPrinter = {
        isConnected: vi.fn().mockReturnValue(true),
        print: vi.fn().mockResolvedValue(true),
      };
      (thermalPrinter.getPrinter as Mock).mockReturnValue(mockPrinter);

      const config: PrintConfig = {
        printerWidth: '80mm',
      };

      const result = await printTableBill(mockTableBillData, config);

      expect(thermalPrinter.generateTableBillReceipt).toHaveBeenCalledWith(
        mockTableBillData,
        '80mm'
      );
      expect(mockPrinter.print).toHaveBeenCalledWith('ESC/POS bill');
      expect(result).toEqual({ success: true, method: 'usb' });
    });
  });

  describe('showPrintResultToast', () => {
    it('should show success toast with order number', () => {
      const result: PrintResult = { success: true, method: 'printnode' };
      
      showPrintResultToast(result, 1234);

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('#1234'),
        expect.any(Object)
      );
    });

    it('should show success toast with table name', () => {
      const result: PrintResult = { success: true, method: 'usb' };
      
      showPrintResultToast(result, undefined, '05');

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Mesa 05'),
        expect.any(Object)
      );
    });

    it('should show cloud icon for PrintNode success', () => {
      const result: PrintResult = { success: true, method: 'printnode' };
      
      showPrintResultToast(result, 1234);

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('☁️'),
        expect.any(Object)
      );
    });

    it('should show printer icon for USB success', () => {
      const result: PrintResult = { success: true, method: 'usb' };
      
      showPrintResultToast(result, 1234);

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('🖨️'),
        expect.any(Object)
      );
    });

    it('should show error toast on failure', () => {
      const result: PrintResult = {
        success: false,
        method: 'printnode',
        error: 'Printer offline',
      };
      
      showPrintResultToast(result, 1234);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('#1234'),
        expect.objectContaining({
          description: 'Printer offline',
        })
      );
    });
  });

  describe('PrintConfig type', () => {
    it('should accept valid PrintConfig object', () => {
      const config: PrintConfig = {
        printerWidth: '80mm',
        printNodePrinterId: '12345',
        storeId: 'store-uuid',
        orderId: 'order-uuid',
        orderNumber: 1234,
        printerName: 'Cozinha',
        maxRetries: 3,
        logoUrl: 'https://example.com/logo.png',
        storeInfo: {
          nome: 'Pizzaria Test',
          endereco: 'Rua Teste, 123',
          telefone: '11999999999',
        },
      };

      expect(config.printerWidth).toBe('80mm');
      expect(config.maxRetries).toBe(3);
    });

    it('should accept minimal PrintConfig', () => {
      const config: PrintConfig = {
        printerWidth: '58mm',
      };

      expect(config.printerWidth).toBe('58mm');
      expect(config.printNodePrinterId).toBeUndefined();
    });
  });

  describe('PrintMethod type', () => {
    it('should allow valid print methods', () => {
      const methods: PrintMethod[] = ['usb', 'printnode', 'a4'];
      
      expect(methods).toHaveLength(3);
      expect(methods).toContain('usb');
      expect(methods).toContain('printnode');
      expect(methods).toContain('a4');
    });
  });
});
