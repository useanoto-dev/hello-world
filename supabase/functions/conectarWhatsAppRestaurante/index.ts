// Conectar WhatsApp Restaurante - Anotô
// Fluxo simples:
// 1. Identificar restaurante
// 2. Se não tem instância → criar
// 3. Buscar status
// 4. Se não connected → chamar /instance/connect
// 5. Buscar status novamente
// 6. Retornar status + qrcode

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUazapiConfig() {
  const baseUrl = Deno.env.get('UAZAPI_BASE_URL');
  const adminToken = Deno.env.get('UAZAPI_API_KEY');
  if (!baseUrl || !adminToken) {
    throw new Error('Uazapi configuration not found');
  }
  return { baseUrl, adminToken };
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Função auxiliar para buscar status da instância
async function fetchInstanceStatus(baseUrl: string, instanceToken: string) {
  console.log('[conectarWhatsApp] Buscando status da instância...');
  
  const response = await fetch(`${baseUrl}/instance/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'token': instanceToken,
    },
  });

  if (!response.ok) {
    console.log('[conectarWhatsApp] Falha ao buscar status:', response.status);
    return { status: 'disconnected', qrcode: null };
  }

  const data = await response.json();
  console.log('[conectarWhatsApp] Status response:', JSON.stringify(data));

  // A Uazapi retorna dados em data.instance e data.status
  const instance = data?.instance || data;
  const statusInfo = data?.status || {};

  // Mapear status da Uazapi - verificar múltiplos lugares
  const rawStatus = instance?.status || statusInfo?.status || data?.state || 'disconnected';
  
  // QR Code pode estar em instance.qrcode ou na raiz
  const qrcode = instance?.qrcode || data?.qrcode || data?.qr || data?.qr_code || null;
  
  // Número e nome do WhatsApp
  const whatsappNumber = statusInfo?.jid?.split('@')?.[0] || instance?.owner || data?.jid?.split('@')?.[0] || data?.number || null;
  const whatsappName = instance?.profileName || instance?.name || data?.pushname || data?.name || null;

  let status = 'disconnected';
  // connected = true E loggedIn = true significa conectado
  if (statusInfo?.connected && statusInfo?.loggedIn) {
    status = 'connected';
  } else if (rawStatus === 'open' || rawStatus === 'connected') {
    status = 'connected';
  } else if (rawStatus === 'connecting' || rawStatus === 'qr' || qrcode) {
    // Se tem QR code, está em processo de conexão
    status = 'connecting';
  }

  console.log(`[conectarWhatsApp] Parsed: status=${status}, qrcode=${qrcode ? 'presente' : 'null'}, rawStatus=${rawStatus}`);

  return { status, qrcode, whatsappNumber, whatsappName, rawStatus };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantId } = await req.json();

    // Validação obrigatória: restaurant_id deve existir
    if (!restaurantId || typeof restaurantId !== 'string' || restaurantId.trim() === '') {
      console.error('[conectarWhatsApp] Erro: restaurantId não informado ou inválido');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Restaurante ativo não informado' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[conectarWhatsApp] Iniciando para restaurante: ${restaurantId}`);

    const supabase = getSupabaseClient();
    const { baseUrl, adminToken } = getUazapiConfig();

    // ========== PASSO 1: Buscar restaurante ==========
    const { data: restaurant, error: fetchError } = await supabase
      .from('stores')
      .select('id, uazapi_instance_name, uazapi_instance_token')
      .eq('id', restaurantId)
      .maybeSingle();

    if (fetchError || !restaurant) {
      console.error('[conectarWhatsApp] Restaurante não encontrado:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurante não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let instanceName = restaurant.uazapi_instance_name;
    let instanceToken = restaurant.uazapi_instance_token;

    // ========== PASSO 2: Se NÃO tem instância, criar ==========
    if (!instanceName || !instanceToken) {
      instanceName = `restaurant-${restaurantId}`;
      console.log(`[conectarWhatsApp] Criando instância: ${instanceName}`);

      const createResponse = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admintoken': adminToken,
        },
        body: JSON.stringify({ name: instanceName }),
      });

      const createResult = await createResponse.json();
      console.log(`[conectarWhatsApp] Resposta create:`, JSON.stringify(createResult));

      // Tentar pegar o token
      instanceToken = createResult?.token || createResult?.instance?.token || createResult?.data?.token;

      // Se falhou mas instância já existe, buscar token
      if (!instanceToken) {
        console.log(`[conectarWhatsApp] Token não retornado, buscando instâncias...`);
        
        const fetchInstanceResponse = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: { 'admintoken': adminToken },
        });

        if (fetchInstanceResponse.ok) {
          const instances = await fetchInstanceResponse.json();
          const existingInstance = instances?.find((inst: any) => inst.name === instanceName);
          if (existingInstance?.token) {
            instanceToken = existingInstance.token;
            console.log(`[conectarWhatsApp] Token encontrado: ${instanceToken}`);
          }
        }
      }

      if (!instanceToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não foi possível obter token da instância' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Salvar no banco
      await supabase
        .from('stores')
        .update({
          uazapi_instance_name: instanceName,
          uazapi_instance_token: instanceToken,
        })
        .eq('id', restaurantId);

      console.log(`[conectarWhatsApp] Instância salva: ${instanceName}`);
    }

    // ========== PASSO 3: Buscar status atual ==========
    let statusData = await fetchInstanceStatus(baseUrl, instanceToken);
    console.log(`[conectarWhatsApp] Status atual: ${statusData.status}`);

    // ========== PASSO 4: Se NÃO connected, chamar /instance/connect ==========
    if (statusData.status !== 'connected') {
      console.log(`[conectarWhatsApp] Chamando POST /instance/connect...`);
      
      const connectResponse = await fetch(`${baseUrl}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instanceToken,
        },
      });

      const connectResult = await connectResponse.json();
      console.log('[conectarWhatsApp] Resposta connect:', JSON.stringify(connectResult));

      // ========== PASSO 5: Buscar status novamente ==========
      statusData = await fetchInstanceStatus(baseUrl, instanceToken);
      console.log(`[conectarWhatsApp] Status após connect: ${statusData.status}`);
    }

    // ========== PASSO 6: Atualizar banco e retornar ==========
    const updateData: Record<string, unknown> = {
      whatsapp_status: statusData.status,
    };
    
    if (statusData.status === 'connected') {
      if (statusData.whatsappNumber) updateData.whatsapp_number = statusData.whatsappNumber;
      if (statusData.whatsappName) updateData.whatsapp_name = statusData.whatsappName;
    }

    await supabase
      .from('stores')
      .update(updateData)
      .eq('id', restaurantId);

    console.log(`[conectarWhatsApp] Finalizado. Status: ${statusData.status}, QR: ${statusData.qrcode ? 'sim' : 'não'}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          instance_name: instanceName,
          whatsapp_status: statusData.status,
          qrcode: statusData.qrcode,
          whatsapp_number: statusData.whatsappNumber,
          whatsapp_name: statusData.whatsappName,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[conectarWhatsApp] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
