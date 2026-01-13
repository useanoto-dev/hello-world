import { supabase } from '@/integrations/supabase/client';

export interface PrintNodePrinter {
  id: number;
  name: string;
  description: string;
  computer: {
    id: number;
    name: string;
    state: string;
  };
  state: string;
  default: boolean;
}

export interface PrintNodeAccount {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  credits: number;
}

export interface PrintJobRecord {
  id: string;
  store_id: string;
  order_id?: string;
  order_number?: number;
  printnode_job_id?: number;
  printer_id: string;
  printer_name?: string;
  title: string;
  status: 'pending' | 'sent' | 'success' | 'error';
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
  created_at: string;
}

/**
 * Test PrintNode connection and get account info
 */
export async function testConnection(): Promise<{ success: boolean; account?: PrintNodeAccount; error?: string }> {
  try {
    const response = await fetch(
      `https://wxiyjvtqgvbvcscbxxnq.supabase.co/functions/v1/printnode?action=whoami`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, account: result };
  } catch (error) {
    console.error('PrintNode connection test error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * List all available printers from PrintNode
 */
export async function listPrinters(): Promise<PrintNodePrinter[]> {
  try {
    const response = await fetch(
      `https://wxiyjvtqgvbvcscbxxnq.supabase.co/functions/v1/printnode?action=printers`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.error) {
      console.error('PrintNode list printers error:', result.error);
      return [];
    }

    return result || [];
  } catch (error) {
    console.error('PrintNode list printers error:', error);
    return [];
  }
}

/**
 * Send a print job to PrintNode and save to history
 */
export async function printJob(
  printerId: number,
  content: string,
  title: string = 'Comanda',
  options?: {
    storeId?: string;
    orderId?: string;
    orderNumber?: number;
    printerName?: string;
    maxRetries?: number;
    retryCount?: number;
  }
): Promise<{ success: boolean; jobId?: number; error?: string; recordId?: string }> {
  const maxRetries = options?.maxRetries ?? 2;
  const currentRetry = options?.retryCount ?? 0;
  
  try {
    // Convert ESC/POS string to base64
    const base64Content = btoa(content);

    const response = await fetch(
      `https://wxiyjvtqgvbvcscbxxnq.supabase.co/functions/v1/printnode?action=print`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printerId,
          title,
          content: base64Content,
          contentType: 'raw_base64'
        })
      }
    );

    const result = await response.json();

    // Save to print_jobs history if storeId is provided
    let recordId: string | undefined;
    if (options?.storeId) {
      const jobRecord = {
        store_id: options.storeId,
        order_id: options.orderId || null,
        order_number: options.orderNumber || null,
        printnode_job_id: result.jobId || null,
        printer_id: String(printerId),
        printer_name: options.printerName || null,
        title,
        status: result.error ? 'error' : 'sent',
        error_message: result.error ? JSON.stringify(result.error) : null,
        retry_count: currentRetry,
        max_retries: maxRetries
      };

      const { data: insertedRecord } = await supabase.from('print_jobs').insert(jobRecord as any).select('id').single();
      recordId = insertedRecord?.id;
    }

    if (result.error) {
      // Auto-retry on failure
      if (currentRetry < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        return printJob(printerId, content, title, {
          ...options,
          retryCount: currentRetry + 1
        });
      }
      return { success: false, error: JSON.stringify(result.error), recordId };
    }

    return { success: true, jobId: result.jobId, recordId };
  } catch (error) {
    console.error('PrintNode print job error:', error);
    
    // Auto-retry on network errors
    if (currentRetry < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return printJob(printerId, content, title, {
        ...options,
        retryCount: currentRetry + 1
      });
    }
    
    return { success: false, error: String(error) };
  }
}

/**
 * Retry a failed print job by ID
 */
export async function retryPrintJob(
  jobId: string,
  printerId: number,
  title: string,
  printerName?: string
): Promise<{ success: boolean; newJobId?: number; error?: string }> {
  try {
    // Get the original job to find order details
    const { data: job } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) {
      return { success: false, error: 'Job não encontrado' };
    }

    // For retry, we need the original content - but we don't store it
    // So we'll just send a test/retry notification
    const response = await fetch(
      `https://wxiyjvtqgvbvcscbxxnq.supabase.co/functions/v1/printnode?action=print`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printerId,
          title: `[RETRY] ${title}`,
          content: btoa(`\n\n--- REENVIO ---\n${title}\nJob original: ${jobId}\n\n`),
          contentType: 'raw_base64'
        })
      }
    );

    const result = await response.json();

    if (result.error) {
      // Update job status to error
      await supabase
        .from('print_jobs')
        .update({ 
          status: 'error', 
          error_message: JSON.stringify(result.error),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return { success: false, error: JSON.stringify(result.error) };
    }

    // Update job status to sent with new job ID
    await supabase
      .from('print_jobs')
      .update({ 
        status: 'sent', 
        printnode_job_id: result.jobId,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return { success: true, newJobId: result.jobId };
  } catch (error) {
    console.error('PrintNode retry job error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get print job history for a store
 */
export async function getPrintJobHistory(storeId: string, limit: number = 50): Promise<PrintJobRecord[]> {
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching print jobs:', error);
      return [];
    }

    return (data || []) as unknown as PrintJobRecord[];
  } catch (error) {
    console.error('Error fetching print jobs:', error);
    return [];
  }
}

/**
 * Get job status from PrintNode API
 */
export async function getJobStatus(jobId: number): Promise<{ state?: string; error?: string } | null> {
  try {
    const response = await fetch(
      `https://wxiyjvtqgvbvcscbxxnq.supabase.co/functions/v1/printnode?action=job-status&jobId=${jobId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.error) {
      return { error: result.error };
    }

    return result;
  } catch (error) {
    console.error('PrintNode job status error:', error);
    return { error: String(error) };
  }
}

/**
 * Get printer status from PrintNode API
 */
export async function getPrinterStatus(printerId: number): Promise<{ online: boolean; state?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://wxiyjvtqgvbvcscbxxnq.supabase.co/functions/v1/printnode?action=printer-status&printerId=${printerId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.error) {
      return { online: false, error: result.error };
    }

    const isOnline = result.state === 'online' || result.computer?.state === 'connected';
    return { online: isOnline, state: result.state };
  } catch (error) {
    console.error('PrintNode printer status error:', error);
    return { online: false, error: String(error) };
  }
}

/**
 * Update print job status in database
 */
export async function updatePrintJobStatus(
  jobId: string,
  status: 'pending' | 'sent' | 'success' | 'error',
  errorMessage?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('print_jobs')
      .update({ 
        status, 
        error_message: errorMessage || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating print job status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating print job status:', error);
    return false;
  }
}

/**
 * Convert ESC/POS data to base64 (for raw printing)
 */
export function escposToBase64(escposData: string): string {
  return btoa(escposData);
}
