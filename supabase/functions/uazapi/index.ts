// Uazapi Integration - Base HTTP Client
// Edge function for WhatsApp integration via Uazapi API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Uazapi HTTP Client Configuration
interface UazapiConfig {
  baseUrl: string;
  adminToken: string;
}

// Get configuration from environment
function getUazapiConfig(): UazapiConfig {
  const baseUrl = Deno.env.get('UAZAPI_BASE_URL');
  const adminToken = Deno.env.get('UAZAPI_API_KEY');

  if (!baseUrl) {
    throw new Error('UAZAPI_BASE_URL not configured');
  }

  if (!adminToken) {
    throw new Error('UAZAPI_API_KEY not configured');
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash if present
    adminToken,
  };
}

// Generic HTTP request to Uazapi API
async function uazapiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const config = getUazapiConfig();
  
  const url = `${config.baseUrl}${endpoint}`;
  
  console.log(`[Uazapi] ${method} ${url}`);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'admintoken': config.adminToken, // Auth via admintoken header
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[Uazapi] Error ${response.status}:`, data);
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}`,
      };
    }

    console.log(`[Uazapi] Success:`, JSON.stringify(data).substring(0, 200));
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`[Uazapi] Request failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Main handler - ready for future actions
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    console.log(`[Uazapi] Action: ${action}`);

    // Validate configuration is available
    const config = getUazapiConfig();
    console.log(`[Uazapi] Config OK - Base URL: ${config.baseUrl}`);

    // Action router - to be expanded
    switch (action) {
      case 'health':
        // Simple health check to validate configuration
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Uazapi integration configured',
            baseUrl: config.baseUrl,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'test': {
        // Test API connection - try to get instance info or any endpoint
        // Using a simple endpoint to verify authentication works
        const testResult = await uazapiRequest('/status', 'GET');
        
        // If we get any response (even error), auth is working
        // Only fail if there's a network/auth error
        if (testResult.error && testResult.error.includes('401')) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Authentication failed - check your admin token',
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Uazapi API responded successfully',
            response: testResult,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[Uazapi] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Export helper for use in other edge functions if needed
export { uazapiRequest, getUazapiConfig, type UazapiConfig };
