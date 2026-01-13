import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RefreshCw, CheckCircle2, XCircle, Clock, Send, Loader2, RotateCw, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPrintJobHistory, getJobStatus, updatePrintJobStatus, retryPrintJob, PrintJobRecord } from '@/lib/printnode';
import { toast } from 'sonner';

interface PrintJobHistoryProps {
  storeId: string;
  printerId?: string | null;
  printerName?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500' },
  sent: { label: 'Enviado', icon: Send, color: 'bg-blue-500' },
  success: { label: 'Impresso', icon: CheckCircle2, color: 'bg-green-500' },
  error: { label: 'Erro', icon: XCircle, color: 'bg-red-500' }
};

// Map PrintNode states to our status
const mapPrintNodeState = (state: string): 'pending' | 'sent' | 'success' | 'error' => {
  switch (state?.toLowerCase()) {
    case 'done':
      return 'success';
    case 'error':
    case 'expired':
    case 'deleted':
      return 'error';
    case 'queued':
    case 'in_progress':
      return 'sent';
    default:
      return 'pending';
  }
};

export function PrintJobHistory({ storeId, printerId, printerName }: PrintJobHistoryProps) {
  const [jobs, setJobs] = useState<PrintJobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [retryingJob, setRetryingJob] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, [storeId]);

  const loadJobs = async () => {
    setLoading(true);
    const data = await getPrintJobHistory(storeId, 50);
    setJobs(data);
    setLoading(false);
  };

  const checkJobStatus = async (job: PrintJobRecord) => {
    if (!job.printnode_job_id) {
      toast.error('Este job não tem ID do PrintNode');
      return;
    }

    setCheckingStatus(job.id);
    
    try {
      const result = await getJobStatus(job.printnode_job_id);
      
      if (result?.error) {
        toast.error('Erro ao consultar status: ' + result.error);
        return;
      }

      if (result?.state) {
        const newStatus = mapPrintNodeState(result.state);
        const success = await updatePrintJobStatus(job.id, newStatus);
        
        if (success) {
          // Update local state
          setJobs(prev => prev.map(j => 
            j.id === job.id ? { ...j, status: newStatus } : j
          ));
          toast.success(`Status atualizado: ${statusConfig[newStatus].label}`);
        }
      } else {
        toast.info('Job não encontrado no PrintNode (pode ter expirado)');
      }
    } catch (error) {
      toast.error('Erro ao consultar status');
    } finally {
      setCheckingStatus(null);
    }
  };

  const handleRetryJob = async (job: PrintJobRecord) => {
    if (!printerId) {
      toast.error('Nenhuma impressora configurada para reenvio');
      return;
    }

    setRetryingJob(job.id);
    
    try {
      const result = await retryPrintJob(
        job.id,
        Number(printerId),
        job.title,
        printerName
      );

      if (result.success) {
        toast.success(`✅ Job reenviado com sucesso!`, {
          description: `Novo Job ID: ${result.newJobId}`,
          duration: 5000,
        });
        // Reload jobs to get updated status
        await loadJobs();
      } else {
        toast.error(`❌ Falha ao reenviar`, {
          description: result.error || 'Erro desconhecido',
          duration: 10000,
        });
      }
    } catch (error) {
      toast.error('Erro ao reenviar job');
    } finally {
      setRetryingJob(null);
    }
  };

  const refreshAllStatuses = async () => {
    const pendingJobs = jobs.filter(j => j.status === 'sent' && j.printnode_job_id);
    
    if (pendingJobs.length === 0) {
      toast.info('Nenhum job pendente para atualizar');
      return;
    }

    setLoading(true);
    let updated = 0;

    for (const job of pendingJobs) {
      try {
        const result = await getJobStatus(job.printnode_job_id!);
        if (result?.state) {
          const newStatus = mapPrintNodeState(result.state);
          if (newStatus !== job.status) {
            await updatePrintJobStatus(job.id, newStatus);
            updated++;
          }
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    }

    await loadJobs();
    toast.success(`${updated} job(s) atualizado(s)`);
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <History className="w-3 h-3" />
            Histórico de Impressões
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={refreshAllStatuses}
              disabled={loading}
            >
              <RotateCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Status
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={loadJobs}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-6">
            <History className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-[10px] text-muted-foreground">Nenhuma impressão registrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {jobs.map((job) => {
                const config = statusConfig[job.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                const isChecking = checkingStatus === job.id;
                const isRetrying = retryingJob === job.id;
                const canRetry = job.status === 'error' && printerId;
                
                return (
                  <div
                    key={job.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
                      job.status === 'error' 
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                      <StatusIcon className="w-3 h-3 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-medium truncate">{job.title}</p>
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant={job.status === 'error' ? 'destructive' : 'outline'} 
                            className="text-[8px] h-4 px-1"
                          >
                            {config.label}
                          </Badge>
                          {job.printnode_job_id && job.status === 'sent' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => checkJobStatus(job)}
                              disabled={isChecking}
                              title="Verificar status no PrintNode"
                            >
                              {isChecking ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RotateCw className="w-2.5 h-2.5" />
                              )}
                            </Button>
                          )}
                          {canRetry && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 px-1 text-[8px] text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                              onClick={() => handleRetryJob(job)}
                              disabled={isRetrying}
                              title="Reenviar impressão"
                            >
                              {isRetrying ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <>
                                  <Repeat className="w-2.5 h-2.5 mr-0.5" />
                                  Reenviar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        {job.order_number && (
                          <span className="font-medium">#{job.order_number}</span>
                        )}
                        <span>•</span>
                        <span>{format(new Date(job.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                        {job.printer_name && (
                          <>
                            <span>•</span>
                            <span className="truncate">{job.printer_name}</span>
                          </>
                        )}
                      </div>
                      
                      {job.error_message && (
                        <p className="text-[9px] text-destructive truncate">
                          ⚠️ {job.error_message}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                        {job.printnode_job_id && (
                          <span>Job ID: {job.printnode_job_id}</span>
                        )}
                        {job.retry_count !== undefined && job.retry_count > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            🔄 {job.retry_count}/{job.max_retries || 2} tentativas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
