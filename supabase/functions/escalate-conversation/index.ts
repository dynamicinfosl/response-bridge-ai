import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
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
      return new Response(JSON.stringify({ success: false, error: 'Bad Request', message: 'Invalid JSON format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      id_conversa_chatwoot,
      id_conversa,
      telefone,
      nome,
      resumo_conversa,
      mini_resumo
    } = payload;

    const conversa_id = id_conversa_chatwoot || id_conversa;

    if (!conversa_id) {
      return new Response(JSON.stringify({ success: false, error: 'Bad Request', message: 'Missing id_conversa_chatwoot' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const summary = mini_resumo || resumo_conversa;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('atendimentos_escalados')
      .upsert({
        id_conversa_chatwoot: String(conversa_id),
        telefone: telefone ? String(telefone) : null,
        nome: nome ? String(nome) : null,
        mini_resumo: summary || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id_conversa_chatwoot'
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conversa escalada recebida com sucesso',
        data
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
