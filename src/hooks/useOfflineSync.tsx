// Offline sync hook for PWA
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

const PENDING_OPS_KEY = 'anoto_pending_operations';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending operations count
  useEffect(() => {
    const pending = getPendingOperations();
    setPendingCount(pending.length);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada!');
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Você está offline. As alterações serão sincronizadas quando a conexão for restaurada.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get pending operations from localStorage
  const getPendingOperations = useCallback((): PendingOperation[] => {
    try {
      const stored = localStorage.getItem(PENDING_OPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save pending operations to localStorage
  const savePendingOperations = useCallback((operations: PendingOperation[]) => {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(operations));
    setPendingCount(operations.length);
  }, []);

  // Add a pending operation
  const addPendingOperation = useCallback((
    type: PendingOperation['type'],
    table: string,
    data: any
  ) => {
    const operation: PendingOperation = {
      id: crypto.randomUUID(),
      type,
      table,
      data,
      timestamp: Date.now(),
    };

    const pending = getPendingOperations();
    pending.push(operation);
    savePendingOperations(pending);

    return operation.id;
  }, [getPendingOperations, savePendingOperations]);

  // Remove a pending operation
  const removePendingOperation = useCallback((id: string) => {
    const pending = getPendingOperations();
    const filtered = pending.filter(op => op.id !== id);
    savePendingOperations(filtered);
  }, [getPendingOperations, savePendingOperations]);

  // Sync all pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const pending = getPendingOperations();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const operation of pending) {
      try {
        switch (operation.type) {
          case 'insert':
            await supabase.from(operation.table as any).insert(operation.data);
            break;
          case 'update':
            await supabase
              .from(operation.table as any)
              .update(operation.data.updates)
              .eq('id', operation.data.id);
            break;
          case 'delete':
            await supabase
              .from(operation.table as any)
              .delete()
              .eq('id', operation.data.id);
            break;
        }
        removePendingOperation(operation.id);
        successCount++;
      } catch (error) {
        console.error('Sync error:', error);
        errorCount++;
      }
    }

    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} operação(ões) sincronizada(s)!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} operação(ões) falharam. Tentaremos novamente.`);
    }
  }, [getPendingOperations, removePendingOperation, isSyncing]);

  // Wrapper for database operations with offline support
  const executeWithOfflineSupport = useCallback(async <T,>(
    operation: () => Promise<T>,
    fallback: {
      type: PendingOperation['type'];
      table: string;
      data: any;
    }
  ): Promise<{ success: boolean; data?: T; pendingId?: string }> => {
    if (!navigator.onLine) {
      const pendingId = addPendingOperation(fallback.type, fallback.table, fallback.data);
      return { success: true, pendingId };
    }

    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      // If network error, save for later
      if (!navigator.onLine) {
        const pendingId = addPendingOperation(fallback.type, fallback.table, fallback.data);
        return { success: true, pendingId };
      }
      throw error;
    }
  }, [addPendingOperation]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addPendingOperation,
    syncPendingOperations,
    executeWithOfflineSupport,
  };
}

// Offline indicator component
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OfflineSyncIndicator() {
  const { isOnline, isSyncing, pendingCount, syncPendingOperations } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="w-3 h-3" />
          Offline
        </Badge>
      )}
      
      {pendingCount > 0 && (
        <Badge variant="secondary" className="gap-1">
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {pendingCount} pendente(s)
          {isOnline && !isSyncing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 px-1 ml-1"
              onClick={syncPendingOperations}
            >
              Sincronizar
            </Button>
          )}
        </Badge>
      )}
    </div>
  );
}
