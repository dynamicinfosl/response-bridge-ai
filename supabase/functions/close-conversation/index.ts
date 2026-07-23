import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validate authorization
    const authHeader = req.headers.get('Authorization');
    // Forçando uma senha hardcoded por enquanto para resolver rapidamente o problema do N8N do usuário.
    // Em produção real, o ideal é Deno.env.get('WEBHOOK_SECRET').
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET') || 'ResponseBridgeAuth2026';

    if (authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', message: 'Invalid or missing Bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse Payload safely
    const rawBody = await req.text();
    if (!rawBody) {
       return new Response(JSON.stringify({ success: false, error: 'Bad Request', message: 'Empty body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Bad Request', message: 'Invalid JSON format: ' + e.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      id_conversa_chatwoot,
      id_conta_chatwoot,
      telefone,
      nome,
      status,
      mini_resumo,
      tempo_total_atendimento,
      quantidade_mensagens,
      agente_responsavel,
      encerrado_em
    } = payload;

    if (!id_conversa_chatwoot) {
      return new Response(JSON.stringify({ success: false, error: 'Bad Request', message: 'Missing id_conversa_chatwoot' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Setup Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Upsert data to atendimentos_encerrados
    const { data, error } = await supabase
      .from('atendimentos_encerrados')
      .upsert({
        id_conversa_chatwoot: String(id_conversa_chatwoot),
        id_conta_chatwoot: id_conta_chatwoot ? String(id_conta_chatwoot) : null,
        telefone: telefone ? String(telefone) : null,
        nome: nome ? String(nome) : null,
        status: status || 'resolved',
        mini_resumo: mini_resumo || null,
        tempo_total_atendimento: tempo_total_atendimento ? Number(tempo_total_atendimento) : null,
        quantidade_mensagens: quantidade_mensagens ? Number(quantidade_mensagens) : null,
        agente_responsavel: agente_responsavel || null,
        encerrado_em: encerrado_em || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id_conversa_chatwoot'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conversa encerrada com sucesso',
        data
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
