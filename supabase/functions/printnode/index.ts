import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRINTNODE_API_URL = 'https://api.printnode.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    if (!apiKey) {
      console.error('PRINTNODE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PrintNode API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = 'Basic ' + btoa(apiKey + ':');
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('PrintNode action:', action);

    // GET: List computers
    if (req.method === 'GET' && action === 'computers') {
      const response = await fetch(`${PRINTNODE_API_URL}/computers`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await response.json();
      console.log('Computers response:', data);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET: List printers
    if (req.method === 'GET' && action === 'printers') {
      const response = await fetch(`${PRINTNODE_API_URL}/printers`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await response.json();
      console.log('Printers response:', data);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET: Account info (test connection)
    if (req.method === 'GET' && action === 'whoami') {
      const response = await fetch(`${PRINTNODE_API_URL}/whoami`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await response.json();
      console.log('Whoami response:', data);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET: Job status
    if (req.method === 'GET' && action === 'job-status') {
      const jobId = url.searchParams.get('jobId');
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'jobId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Fetching job status for:', jobId);
      const response = await fetch(`${PRINTNODE_API_URL}/printjobs/${jobId}`, {
        headers: { 'Authorization': authHeader }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Job status error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Job not found or API error' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('Job status response:', data);
      
      // PrintNode returns an array, get first item
      const job = Array.isArray(data) ? data[0] : data;
      return new Response(JSON.stringify(job || null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET: Printer status
    if (req.method === 'GET' && action === 'printer-status') {
      const printerId = url.searchParams.get('printerId');
      if (!printerId) {
        return new Response(
          JSON.stringify({ error: 'printerId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Fetching printer status for:', printerId);
      const response = await fetch(`${PRINTNODE_API_URL}/printers/${printerId}`, {
        headers: { 'Authorization': authHeader }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Printer status error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Printer not found or API error', online: false }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('Printer status response:', data);
      
      // PrintNode returns an array, get first item
      const printer = Array.isArray(data) ? data[0] : data;
      return new Response(JSON.stringify(printer || { error: 'Printer not found', online: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'POST' && action === 'print') {
      const body = await req.json();
      const { printerId, title, content, contentType = 'raw_base64' } = body;

      if (!printerId || !content) {
        return new Response(
          JSON.stringify({ error: 'printerId and content are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Sending print job to printer:', printerId, 'title:', title);

      const response = await fetch(`${PRINTNODE_API_URL}/printjobs`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printerId: Number(printerId),
          title: title || 'Print Job',
          contentType,
          content,
          source: 'Anoto App'
        })
      });

      const data = await response.json();
      console.log('Print job response:', data);

      if (!response.ok) {
        return new Response(JSON.stringify({ error: data }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ jobId: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: computers, printers, whoami, printer-status, or print' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PrintNode error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
