import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Printer, RefreshCw, CheckCircle2, XCircle, Loader2, ExternalLink, TestTube, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { listPrinters, testConnection, printJob, PrintNodePrinter } from '@/lib/printnode';
import { generateESCPOSComanda, generateHTMLComanda, printHTML, ComandaData, PrinterWidth, PRINTER_WIDTHS, StoreFooterData } from '@/lib/thermalPrinter';

interface PrintNodeSettingsProps {
  storeId: string;
  printerId: string | null;
  autoPrint: boolean;
  maxRetries: number;
  printerWidth: PrinterWidth;
  logoUrl?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
  storeWhatsapp?: string | null;
  printFooterMessage?: string | null;
  onPrinterChange: (printerId: string | null) => void;
  onAutoPrintChange: (enabled: boolean) => void;
  onMaxRetriesChange: (maxRetries: number) => void;
  onPrinterWidthChange: (width: PrinterWidth) => void;
  onPrintFooterMessageChange?: (message: string) => void;
}

export function PrintNodeSettings({
  storeId,
  printerId,
  autoPrint,
  maxRetries,
  printerWidth,
  logoUrl,
  storeName,
  storeAddress,
  storePhone,
  storeWhatsapp,
  printFooterMessage,
  onPrinterChange,
  onAutoPrintChange,
  onMaxRetriesChange,
  onPrinterWidthChange,
  onPrintFooterMessageChange
}: PrintNodeSettingsProps) {
  const [printers, setPrinters] = useState<PrintNodePrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [accountInfo, setAccountInfo] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    const result = await testConnection();
    
    if (result.success && result.account) {
      setConnectionStatus('connected');
      setAccountInfo(`${result.account.firstname} ${result.account.lastname}`);
      // Load printers after successful connection
      loadPrinters();
    } else {
      setConnectionStatus('error');
      setAccountInfo(null);
    }
    setLoading(false);
  };

  const loadPrinters = async () => {
    setLoading(true);
    try {
      const printerList = await listPrinters();
      setPrinters(printerList);
      
      if (printerList.length === 0) {
        toast.info('Nenhuma impressora encontrada. Verifique se o PrintNode Client está instalado e conectado.');
      }
    } catch (error) {
      console.error('Error loading printers:', error);
      toast.error('Erro ao carregar impressoras');
    }
    setLoading(false);
  };

  const handleTestPrint = async () => {
    if (!printerId) {
      toast.error('Selecione uma impressora primeiro');
      return;
    }

    setTesting(true);
    try {
      // Generate test comanda
      const testComanda: ComandaData = {
        order_number: 9999,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        cliente: 'TESTE IMPRESSÃO',
        whatsapp: '(00) 00000-0000',
        forma_pagamento: 'Teste',
        items: [
          { qty: 1, nome: 'Pizza Teste', observacao: 'Impressão de teste' },
          { qty: 2, nome: 'Refrigerante Teste' }
        ],
        total: 99.99,
        taxa_entrega: 5.00,
        tipo_servico: 'delivery'
      };

      const escposData = generateESCPOSComanda(testComanda, printerWidth);
      const selectedPrinter = printers.find(p => String(p.id) === printerId);
      const result = await printJob(Number(printerId), escposData, 'Teste de Impressão', {
        storeId,
        orderNumber: 9999,
        printerName: selectedPrinter?.name
      });

      if (result.success) {
        toast.success(`✅ Impressão de teste enviada!`, {
          description: `Job ID: ${result.jobId}`,
          duration: 5000,
        });
      } else {
        toast.error(`❌ Falha na impressão de teste`, {
          description: result.error || 'Erro desconhecido',
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('Test print error:', error);
      toast.error('Erro ao enviar impressão de teste');
    }
    setTesting(false);
  };

  const handleBrowserTestPrint = () => {
    const testComanda: ComandaData = {
      order_number: 9999,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      cliente: 'TESTE IMPRESSÃO A4',
      whatsapp: '(00) 00000-0000',
      forma_pagamento: 'Teste',
      items: [
        { qty: 1, nome: 'Pizza Teste', observacao: 'Impressão de teste via navegador' },
        { qty: 2, nome: 'Refrigerante Teste' }
      ],
      total: 99.99,
      taxa_entrega: 5.00,
      tipo_servico: 'delivery'
    };

    const storeInfo: StoreFooterData = {
      nome: storeName || undefined,
      endereco: storeAddress || undefined,
      telefone: storePhone || undefined,
      whatsapp: storeWhatsapp || undefined,
      mensagemPersonalizada: printFooterMessage || undefined
    };

    const html = generateHTMLComanda(testComanda, logoUrl || undefined, storeInfo);
    printHTML(html);
    toast.success('Janela de impressão aberta');
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
          <Printer className="w-3 h-3" />
          Configuração de Impressão
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Configure impressão para térmicas (58mm/80mm) ou impressoras A4
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {/* Printer Width Selection - Always visible */}
        <div className="space-y-1">
          <Label className="text-[9px]">Tipo/Largura da Impressora</Label>
          <Select 
            value={printerWidth} 
            onValueChange={(value) => onPrinterWidthChange(value as PrinterWidth)}
          >
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRINTER_WIDTHS).map(([key, { label }]) => (
                <SelectItem key={key} value={key} className="text-[10px]">
                  <div className="flex items-center gap-2">
                    {key === 'a4' ? <FileText className="w-3 h-3" /> : <Printer className="w-3 h-3" />}
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {printerWidth === 'a4' 
              ? 'Impressão via navegador (qualquer impressora)' 
              : 'Impressora térmica via PrintNode ou Web Serial'}
          </p>
        </div>

        {/* Logo preview for A4 */}
        {printerWidth === 'a4' && logoUrl && (
          <div className="p-2 rounded-lg border bg-muted/30">
            <p className="text-[9px] font-medium mb-1.5">Logotipo na impressão:</p>
            <div className="flex items-center gap-2">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="max-h-8 max-w-[80px] object-contain rounded border bg-white p-0.5"
              />
              <span className="text-[9px] text-muted-foreground">
                Configure o logo nas configurações gerais
              </span>
            </div>
          </div>
        )}

        {printerWidth === 'a4' && !logoUrl && (
          <div className="p-2 rounded-lg border border-warning/30 bg-warning/10">
            <p className="text-[9px] text-warning">
              Nenhum logotipo configurado. Adicione nas configurações gerais para exibir na impressão.
            </p>
          </div>
        )}

        {/* Custom footer message for A4 */}
        {printerWidth === 'a4' && (
          <div className="space-y-1.5">
            <Label className="text-[10px]">Mensagem do rodapé</Label>
            <Textarea
              placeholder="Obrigado pela preferência! 😊"
              value={printFooterMessage || ''}
              onChange={(e) => onPrintFooterMessageChange?.(e.target.value)}
              className="text-[10px] min-h-[60px] resize-none"
              maxLength={200}
            />
            <p className="text-[9px] text-muted-foreground">
              Mensagem exibida no rodapé das impressões A4. Deixe em branco para usar a mensagem padrão.
            </p>
          </div>
        )}

        {/* A4 Browser Print Test */}
        {printerWidth === 'a4' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-[10px]"
            onClick={handleBrowserTestPrint}
          >
            <FileText className="w-3 h-3 mr-1" />
            Testar Impressão A4 (Navegador)
          </Button>
        )}

        {/* PrintNode section - only for thermal printers */}
        {printerWidth !== 'a4' && (
          <>
            <div className="border-t pt-3">
              <p className="text-[9px] font-medium text-muted-foreground mb-2">PrintNode (Impressão em Nuvem)</p>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : connectionStatus === 'connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : connectionStatus === 'error' ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-muted" />
                )}
                <div>
                  <p className="text-[10px] font-medium">
                    {loading ? 'Verificando...' : 
                     connectionStatus === 'connected' ? 'Conectado' : 
                     connectionStatus === 'error' ? 'Não conectado' : 'Status desconhecido'}
                  </p>
                  {accountInfo && (
                    <p className="text-[9px] text-muted-foreground">{accountInfo}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[9px]"
                onClick={checkConnection}
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            {/* PrintNode Setup Link */}
            {connectionStatus !== 'connected' && (
              <div className="p-2 rounded-lg border border-warning/30 bg-warning/10">
                <p className="text-[10px] text-warning font-medium mb-1">Configuração necessária:</p>
                <ol className="text-[9px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Crie uma conta em <a href="https://app.printnode.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">app.printnode.com</a></li>
                  <li>Gere uma API Key no painel</li>
                  <li>Instale o PrintNode Client no computador</li>
                  <li>Configure a API Key nas configurações do projeto</li>
                </ol>
                <Button
                  variant="link"
                  size="sm"
                  className="h-5 p-0 text-[9px] mt-1"
                  onClick={() => window.open('https://app.printnode.com/login/register', '_blank')}
                >
                  <ExternalLink className="w-2.5 h-2.5 mr-0.5" />
                  Criar conta PrintNode
                </Button>
              </div>
            )}

            {/* Printer Selection */}
            {connectionStatus === 'connected' && (
              <>
                <div className="space-y-1">
                  <Label className="text-[9px]">Impressora</Label>
                  <Select 
                    value={printerId || ''} 
                    onValueChange={(value) => onPrinterChange(value || null)}
                  >
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue placeholder="Selecione uma impressora" />
                    </SelectTrigger>
                    <SelectContent>
                      {printers.map((printer) => (
                        <SelectItem key={printer.id} value={String(printer.id)} className="text-[10px]">
                          <div className="flex items-center gap-2">
                            <Printer className="w-3 h-3" />
                            <span>{printer.name}</span>
                            {printer.state === 'online' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {printers.length === 0 && !loading && (
                    <p className="text-[9px] text-muted-foreground">
                      Nenhuma impressora encontrada. Verifique o PrintNode Client.
                    </p>
                  )}
                </div>

                {/* Auto Print Toggle */}
                <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium">Impressão Automática</Label>
                    <p className="text-[9px] text-muted-foreground">
                      Imprimir comandas automaticamente ao receber pedidos
                    </p>
                  </div>
                  <Switch
                    checked={autoPrint}
                    onCheckedChange={onAutoPrintChange}
                    disabled={!printerId}
                  />
                </div>

                {/* Max Retries Setting */}
                <div className="space-y-1">
                  <Label className="text-[9px]">Tentativas automáticas em caso de falha</Label>
                  <Select 
                    value={String(maxRetries)} 
                    onValueChange={(value) => onMaxRetriesChange(Number(value))}
                  >
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5].map((num) => (
                        <SelectItem key={num} value={String(num)} className="text-[10px]">
                          {num === 0 ? 'Desativado' : `${num} tentativa${num > 1 ? 's' : ''}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground">
                    Se a impressão falhar, o sistema tentará novamente automaticamente
                  </p>
                </div>

                {/* Test Print Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-[10px]"
                  onClick={handleTestPrint}
                  disabled={!printerId || testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Imprimindo...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-3 h-3 mr-1" />
                      Testar Impressão Térmica
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
