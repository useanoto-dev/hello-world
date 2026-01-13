// Teste de envio WhatsApp via Uazapi
// Edge function para testar integração com a API da Uazapi

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TestarEnvioWhatsApp] Iniciando teste de envio...');

    const uazapiUrl = 'https://anoto.uazapi.com/send/text';
    const instanceToken = '1964b3eb-f5c4-42f9-8901-f67952d72bc2';

    const payload = {
      number: '559984389747',
      text: '✅ Teste Anotô — mensagem enviada com sucesso usando token da instância!',
    };

    console.log('[TestarEnvioWhatsApp] URL:', uazapiUrl);
    console.log('[TestarEnvioWhatsApp] Payload:', JSON.stringify(payload));

    const response = await fetch(uazapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    console.log('[TestarEnvioWhatsApp] Status HTTP:', response.status);
    console.log('[TestarEnvioWhatsApp] Resposta:', JSON.stringify(responseBody));

    return new Response(
      JSON.stringify({
        success: response.ok,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        uazapiResponse: responseBody,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[TestarEnvioWhatsApp] Erro:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
