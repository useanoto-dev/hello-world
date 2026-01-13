import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw, Usb, Unplug, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  ComandaData,
  generateESCPOSComanda,
  saveLastComanda,
  getLastComanda,
  getPrinter,
} from '@/lib/thermalPrinter';
import { formatPhone } from '@/lib/formatters';

interface ComandaPanelProps {
  order?: ComandaData | null;
  onClose?: () => void;
}

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  cartao_credito: 'CARTAO CREDITO',
  cartao_debito: 'CARTAO DEBITO',
  dinheiro: 'DINHEIRO',
};

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

export default function ComandaPanel({ order: externalOrder }: ComandaPanelProps) {
  const [order, setOrder] = useState<ComandaData | null>(externalOrder || null);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Load last order from IndexedDB on mount
  useEffect(() => {
    if (!externalOrder) {
      getLastComanda().then((lastOrder) => {
        if (lastOrder) {
          setOrder(lastOrder);
        }
      });
    }
  }, [externalOrder]);

  // Update order when external order changes
  useEffect(() => {
    if (externalOrder) {
      setOrder(externalOrder);
      saveLastComanda(externalOrder);
    }
  }, [externalOrder]);

  const handleConnectPrinter = async () => {
    const printer = getPrinter();
    
    if (printer.isConnected()) {
      await printer.disconnect();
      setIsPrinterConnected(false);
      toast.info('Impressora desconectada');
    } else {
      const connected = await printer.connect();
      setIsPrinterConnected(connected);
      
      if (connected) {
        toast.success('Impressora conectada');
      } else {
        toast.error('Falha ao conectar impressora');
      }
    }
  };

  const handlePrint = async () => {
    if (!order) {
      toast.error('Nenhuma comanda para imprimir');
      return;
    }

    const printer = getPrinter();
    
    if (!printer.isConnected()) {
      toast.error('Conecte a impressora primeiro');
      return;
    }

    setIsPrinting(true);
    
    try {
      const escposData = generateESCPOSComanda(order);
      const success = await printer.print(escposData);
      
      if (success) {
        toast.success('Comanda impressa');
      } else {
        toast.error('Falha ao imprimir');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Erro ao imprimir');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleReprint = async () => {
    const lastOrder = await getLastComanda();
    
    if (lastOrder) {
      setOrder(lastOrder);
      toast.info('Última comanda carregada');
    } else {
      toast.error('Nenhuma comanda anterior');
    }
  };

  const serviceLabel = order?.tipo_servico === 'delivery' ? 'ENTREGAR' : 
                       order?.tipo_servico === 'pickup' ? 'RETIRAR' : 'MESA';

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex gap-2 p-3 border-b border-[#333]">
        <Button
          size="sm"
          variant={isPrinterConnected ? 'default' : 'outline'}
          onClick={handleConnectPrinter}
          className={isPrinterConnected ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isPrinterConnected ? (
            <>
              <Usb className="w-4 h-4 mr-1" />
              Conectada
            </>
          ) : (
            <>
              <Unplug className="w-4 h-4 mr-1" />
              Conectar
            </>
          )}
        </Button>
        
        <Button
          size="sm"
          onClick={handlePrint}
          disabled={!order || isPrinting}
          className="bg-[#00ff88] text-[#111] hover:bg-[#00cc6a]"
        >
          {isPrinting ? (
            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Printer className="w-4 h-4 mr-1" />
          )}
          Imprimir
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleReprint}
          className="border-[#333] text-[#888] hover:text-white"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reimprimir última
        </Button>
      </div>

      {/* Comanda Preview */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="mx-auto"
          style={{
            width: '280px',
            background: '#111',
            color: '#00ff88',
            fontSize: '11px',
            fontFamily: 'monospace',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 20px rgba(0,255,136,0.2)',
          }}
        >
          {order ? (
            <>
              {/* Header */}
              <div className="text-center mb-4">
                <div style={{ color: '#888', fontSize: '10px' }}>COMANDA</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', lineHeight: 1.1 }}>
                  #{order.order_number}
                </div>
                <div style={{ color: '#888' }}>{order.hora}</div>
              </div>

              <div style={{ borderTop: '1px dashed #333', margin: '12px 0' }} />

              {/* Fields */}
              <div className="space-y-2">
                <div>
                  <span style={{ color: '#888' }}>CLIENTE: </span>
                  <span style={{ color: '#fff' }}>{order.cliente}</span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>WHATSAPP: </span>
                  <span style={{ color: '#fff' }}>{formatPhone(order.whatsapp)}</span>
                </div>
                {order.endereco && (
                  <div>
                    <span style={{ color: '#888' }}>ENDEREÇO: </span>
                    <span style={{ color: '#fff' }}>{order.endereco}</span>
                  </div>
                )}
                {order.referencia && (
                  <div>
                    <span style={{ color: '#888' }}>REFERÊNCIA: </span>
                    <span style={{ color: '#fff' }}>{order.referencia}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: '#888' }}>FORMA DE PAGAMENTO: </span>
                  <span style={{ color: '#fff' }}>
                    {paymentLabels[order.forma_pagamento] || order.forma_pagamento}
                  </span>
                </div>
                {order.troco && (
                  <div>
                    <span style={{ color: '#888' }}>TROCO: </span>
                    <span style={{ color: '#fff' }}>{order.troco}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #333', margin: '12px 0' }} />

              {/* Items */}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ color: '#fff' }}>
                      {item.qty}x {item.nome}
                    </div>
                    {item.observacao && (
                      <div style={{ color: '#888', paddingLeft: '12px', fontSize: '10px' }}>
                        – {item.observacao}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #333', margin: '12px 0' }} />

              {/* Footer */}
              <div className="space-y-1">
                {order.taxa_entrega > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: '#888' }}>TAXA ENTREGA:</span>
                    <span style={{ color: '#fff' }}>{formatCurrency(order.taxa_entrega)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  <span>TOTAL:</span>
                  <span style={{ color: '#fff' }}>{formatCurrency(order.total)}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #333', margin: '12px 0' }} />

              {/* Service Type */}
              <div
                className="text-center py-2"
                style={{
                  background: order.tipo_servico === 'delivery' ? '#ff4444' : '#00ff88',
                  color: order.tipo_servico === 'delivery' ? '#fff' : '#111',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                {serviceLabel}
              </div>
            </>
          ) : (
            <div className="text-center py-8" style={{ color: '#666' }}>
              Aguardando pedido...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
