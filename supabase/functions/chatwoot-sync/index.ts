import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHATWOOT_URL = Deno.env.get('CHATWOOT_API_URL') || '';
const CHATWOOT_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN') || '';
const CHATWOOT_ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID') || '1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Varrer todas as abertas leva ~12s. Com TTL de 20s quase todo poll do painel caia
// no caminho lento e encostava no timeout de 15s do frontend. Com 45s, so ~1 em cada
// 3 polls dispara sync; os outros respondem do cache na hora.
const CACHE_TTL_MS = 45_000;
// O painel precisa de TODA conversa aberta, senao ele nao consegue distinguir
// "nao esta no cache" de "ja foi encerrada" (05/08/2026: 65 conversas resolvidas
// apareciam como pendentes de humano porque o frontend as materializava as cegas).
// status=open e paginado ate esgotar; status=all cobre as resolvidas recentes.
const MAX_PAGES_OPEN = 40;
const MAX_PAGES_RECENT = 4;
const PAGE_BATCH = 12;
const PAGE_SIZE = 25;
const FETCH_TIMEOUT_MS = 8_000;
const LOCK_TIMEOUT_MS = 30_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
};

let memResponseCache: { ts: number; body: string } | null = null;

async function fetchChatwootPage(page: number, status = 'all'): Promise<any[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=${status}&page=${page}`;
    const resp = await fetch(url, {
      headers: { 'api_access_token': CHATWOOT_TOKEN, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!resp.ok) {
      console.error(`Chatwoot page ${page} returned ${resp.status}`);
      return null;
    }

    const json = await resp.json();
    const payload = json?.data?.payload ?? json?.payload ?? (Array.isArray(json) ? json : null);
    if (!Array.isArray(payload)) {
      console.error(`Chatwoot page ${page} invalid payload shape`);
      return null;
    }
    return payload;
  } catch (e) {
    console.error(`Failed to fetch page ${page}:`, e.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function trimMessage(msg: any) {
  if (!msg) return null;
  return {
    id: msg.id,
    content: msg.content || '',
    message_type: msg.message_type,
    private: !!msg.private,
    created_at: msg.created_at,
    content_attributes: msg.content_attributes?.sender_name
      ? { sender_name: msg.content_attributes.sender_name }
      : undefined,
    sender: msg.sender ? { id: msg.sender.id, name: msg.sender.name } : undefined,
    attachments: Array.isArray(msg.attachments) && msg.attachments.length > 0
      ? [{ file_type: msg.attachments[0].file_type }]
      : undefined,
  };
}

function trimConversation(conv: any) {
  const sender = conv.meta?.sender;
  const assignee = conv.meta?.assignee || conv.assignee || null;
  const lastMsg = conv.messages?.[0] || null;
  const lastNonActivity = conv.last_non_activity_message || null;

  return {
    id: conv.id,
    status: conv.status,
    labels: conv.labels || [],
    unread_count: conv.unread_count || 0,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    last_activity_at: conv.last_activity_at,
    contact_last_seen_at: conv.contact_last_seen_at,
    meta: {
      sender: sender ? { name: sender.name, phone_number: sender.phone_number, phone: sender.phone } : undefined,
      assignee: assignee ? { id: assignee.id, name: assignee.name } : undefined,
      assignee_id: conv.meta?.assignee_id,
      assignee_name: conv.meta?.assignee_name,
    },
    messages: lastMsg ? [trimMessage(lastMsg)] : [],
    last_non_activity_message: !lastMsg ? trimMessage(lastNonActivity) : undefined,
  };
}

function mapConversation(conv: any) {
  const contact = conv.contact || conv.meta?.sender || {};
  const assignee = conv.meta?.assignee || conv.assignee || null;
  const lastMsg = conv.messages?.[0] || conv.last_non_activity_message || null;

  const getTimestamp = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'number') return new Date(val * 1000).toISOString();
    try { return new Date(val).toISOString(); } catch { return null; }
  };

  return {
    conversation_id: conv.id,
    status: conv.status || 'open',
    contact_name: contact.name || contact.pushName || contact.pushname || null,
    contact_phone: contact.phone_number || contact.phone || null,
    assignee_id: assignee?.id || null,
    assignee_name: assignee?.name || null,
    labels: conv.labels || [],
    unread_count: conv.unread_count || 0,
    last_message_content: lastMsg?.content || null,
    last_message_sender: lastMsg ? (lastMsg.message_type === 0 ? 'user' : 'agent') : null,
    last_message_type: lastMsg?.message_type ?? null,
    has_attachments: !!(lastMsg?.attachments?.length),
    attachment_type: lastMsg?.attachments?.[0]?.file_type || null,
    last_activity_at: getTimestamp(conv.last_activity_at) || getTimestamp(conv.updated_at) || getTimestamp(conv.created_at),
    created_at: getTimestamp(conv.created_at),
    raw_data: trimConversation(conv),
    synced_at: new Date().toISOString(),
  };
}

// Fonte unica da resposta: o conjunto completo do cache, ordenado por atividade.
// Usado nos tres caminhos (cache / fresh / erro) para que a contagem seja sempre
// a mesma. Devolver so o lote recem-buscado fazia a lista oscilar entre ~75 e ~283
// a cada ciclo, com conversas sumindo e reaparecendo na tela.
// 500 cortava a lista: so de conversas abertas o Chatwoot tem ~577 (05/08/2026).
const RESPONSE_LIMIT = 1500;

async function lerCacheCompleto(supabase: any): Promise<any[]> {
  const { data } = await supabase
    .from('conversas_cache')
    .select('raw_data')
    .order('last_activity_at', { ascending: false })
    .limit(RESPONSE_LIMIT);
  return (data || []).map((row: any) => row.raw_data).filter(Boolean);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const nowStart = Date.now();
  if (memResponseCache && (nowStart - memResponseCache.ts) < CACHE_TTL_MS) {
    return new Response(memResponseCache.body, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    let { data: syncControl } = await supabase
      .from('conversas_sync_control')
      .select('*')
      .eq('id', 1)
      .single();

    if (!syncControl) {
      const { data: created } = await supabase
        .from('conversas_sync_control')
        .upsert({ id: 1, last_sync_at: '1970-01-01T00:00:00Z', sync_in_progress: false, total_conversations: 0 }, { onConflict: 'id' })
        .select()
        .single();
      syncControl = created;
    }

    const now = Date.now();
    const lastSync = syncControl?.last_sync_at ? new Date(syncControl.last_sync_at).getTime() : 0;
    const isFresh = (now - lastSync) < CACHE_TTL_MS;
    const lockAge = syncControl?.sync_started_at ? now - new Date(syncControl.sync_started_at).getTime() : Infinity;
    const isLocked = syncControl?.sync_in_progress && lockAge < LOCK_TIMEOUT_MS;

    if (isFresh || isLocked) {
      const conversations = await lerCacheCompleto(supabase);
      const body = JSON.stringify({
        source: isFresh ? 'cache' : 'cache_locked',
        count: conversations.length,
        last_sync: syncControl?.last_sync_at,
        conversations,
      });
      memResponseCache = { ts: Date.now(), body };
      return new Response(body, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('conversas_sync_control')
      .update({ sync_in_progress: true, sync_started_at: new Date().toISOString() })
      .eq('id', 1);

    const cutoff24h = Date.now() - (24 * 60 * 60 * 1000);

    let allConversations: any[] = [];
    const seenIds = new Set<number>();
    let pageFailures = 0;

    // Pagina em lotes e para assim que uma pagina vem incompleta (fim da lista),
    // para nao disparar 40 requisicoes quando existem poucas conversas.
    // devolve true se chegou ao fim da lista (e nao se esbarrou no teto de paginas)
    const coletar = async (status: string, maxPaginas: number) => {
      let fim = false;
      for (let inicio = 1; inicio <= maxPaginas && !fim; inicio += PAGE_BATCH) {
        const lote: Promise<any[] | null>[] = [];
        for (let p = inicio; p < inicio + PAGE_BATCH && p <= maxPaginas; p++) {
          lote.push(fetchChatwootPage(p, status));
        }
        const resultados = await Promise.all(lote);
        for (const pageData of resultados) {
          if (pageData === null) {
            pageFailures += 1;
            continue;
          }
          if (pageData.length < PAGE_SIZE) fim = true;
          for (const conv of pageData) {
            if (!seenIds.has(conv.id)) {
              seenIds.add(conv.id);
              allConversations.push(conv);
            }
          }
        }
      }
      return fim;
    };

    // Abertas primeiro: sao as que o painel precisa ter por completo.
    const abertasCompletas = await coletar('open', MAX_PAGES_OPEN);
    const abertas = allConversations.length;
    // Depois as recentes de qualquer status, para a visao de encerrados.
    await coletar('all', MAX_PAGES_RECENT);

    const syncComplete = pageFailures === 0;
    console.log(`Sync: ${abertas} abertas + ${allConversations.length - abertas} recentes`);
    if (!syncComplete) {
      console.warn(`Sync parcial: ${pageFailures} páginas falharam — prune será ignorado neste ciclo`);
    }

    allConversations = allConversations.filter(conv => {
      if (conv.status === 'open' || conv.status === 'pending') return true;
      const activityAt = conv.last_activity_at || conv.updated_at || conv.created_at;
      if (!activityAt) return true;
      const activityTime = typeof activityAt === 'number' ? activityAt * 1000 : new Date(activityAt).getTime();
      return activityTime >= cutoff24h;
    });

    const mapped = allConversations.map(mapConversation);

    if (mapped.length > 0) {
      for (let i = 0; i < mapped.length; i += 100) {
        const batch = mapped.slice(i, i + 100);
        const { error } = await supabase
          .from('conversas_cache')
          .upsert(batch, { onConflict: 'conversation_id' });
        if (error) console.error('Upsert error:', error.message);
      }

      // Limpeza. Como a varredura de abertas vai ate o fim da lista, ausencia neste
      // ciclo prova que a conversa nao esta mais aberta — inclusive quando o cache
      // ainda a tem como 'open'. A versao anterior filtrava por status do cache, que
      // e justamente o dado desatualizado: conversa encerrada fora do painel ficava
      // presa como pendente para sempre (05/08/2026: 202 conversas, a mais velha de
      // 11/05). So roda quando a varredura chegou ao fim — senao ausencia nao prova nada.
      if (syncComplete && abertasCompletas) {
        const activeIds = mapped.map(c => c.conversation_id);
        const filtro = `(${activeIds.join(',')})`;

        // Freio: uma paginacao que termine cedo por acaso (pagina curta no meio da
        // lista) marcaria varredura completa e apagaria meio cache. Se a limpeza for
        // grande demais, e sinal de sync ruim — melhor deixar dado velho do que sumir
        // com a fila do time.
        const { count: aRemover } = await supabase
          .from('conversas_cache')
          .select('conversation_id', { count: 'exact', head: true })
          .not('conversation_id', 'in', filtro);
        const { count: totalCache } = await supabase
          .from('conversas_cache')
          .select('conversation_id', { count: 'exact', head: true });

        const limite = Math.max(50, Math.floor((totalCache || 0) * 0.25));
        if ((aRemover || 0) > limite) {
          console.warn(`Limpeza ignorada: removeria ${aRemover} de ${totalCache} (limite ${limite})`);
        } else if ((aRemover || 0) > 0) {
          await supabase.from('conversas_cache').delete().not('conversation_id', 'in', filtro);
          console.log(`Limpeza: ${aRemover} conversas removidas do cache`);
        }
      }
    }

    await supabase
      .from('conversas_sync_control')
      .update({
        sync_in_progress: false,
        last_sync_at: new Date().toISOString(),
        total_conversations: mapped.length,
      })
      .eq('id', 1);

    const responseConversations = await lerCacheCompleto(supabase);

    const body = JSON.stringify({
      source: syncComplete ? 'fresh' : 'fresh_partial',
      count: responseConversations.length,
      last_sync: new Date().toISOString(),
      conversations: responseConversations,
    });
    memResponseCache = { ts: Date.now(), body };
    return new Response(body, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);

    try {
      await supabase
        .from('conversas_sync_control')
        .update({ sync_in_progress: false })
        .eq('id', 1);
    } catch (_) { /* ignore */ }

    try {
      const conversations = await lerCacheCompleto(supabase);
      return new Response(JSON.stringify({
        source: 'cache_error_fallback',
        count: conversations.length,
        error: error.message,
        conversations,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Complete failure', conversations: [] }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});
