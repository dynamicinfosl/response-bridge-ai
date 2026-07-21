import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHATWOOT_URL = Deno.env.get('CHATWOOT_API_URL') || '';
const CHATWOOT_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN') || '';
const CHATWOOT_ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID') || '1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CACHE_TTL_MS = 10_000;
const MAX_PAGES = 10;
const FETCH_TIMEOUT_MS = 8_000;
const LOCK_TIMEOUT_MS = 30_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
};

let memResponseCache: { ts: number; body: string } | null = null;

async function fetchChatwootPage(page: number): Promise<any[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=all&page=${page}`;
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

    // Self-healing: create the control row if it was deleted
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
      const { data: cached } = await supabase
        .from('conversas_cache')
        .select('raw_data')
        .order('last_activity_at', { ascending: false })
        .limit(500);

      const conversations = (cached || []).map((row: any) => row.raw_data);
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

    const pagePromises: Promise<any[] | null>[] = [];
    for (let p = 1; p <= MAX_PAGES; p++) {
      pagePromises.push(fetchChatwootPage(p));
    }

    const pageResults = await Promise.all(pagePromises);

    let allConversations: any[] = [];
    const seenIds = new Set<number>();
    let pageFailures = 0;

    for (const pageData of pageResults) {
      if (pageData === null) {
        pageFailures += 1;
        continue;
      }
      for (const conv of pageData) {
        if (!seenIds.has(conv.id)) {
          seenIds.add(conv.id);
          allConversations.push(conv);
        }
      }
    }
    const syncComplete = pageFailures === 0;
    if (!syncComplete) {
      console.warn(`Sync parcial: ${pageFailures}/${MAX_PAGES} páginas falharam — prune será ignorado neste ciclo`);
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

      if (syncComplete) {
        const activeIds = mapped.map(c => c.conversation_id);
        await supabase
          .from('conversas_cache')
          .delete()
          .not('conversation_id', 'in', `(${activeIds.join(',')})`);
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

    let responseConversations: any[] = mapped.map(m => m.raw_data);
    if (!syncComplete) {
      try {
        const { data: cached } = await supabase
          .from('conversas_cache')
          .select('raw_data')
          .order('last_activity_at', { ascending: false })
          .limit(500);
        const seen = new Set(mapped.map((c: any) => c.conversation_id));
        const extras = (cached || [])
          .map((row: any) => row.raw_data)
          .filter((c: any) => c && !seen.has(c.id));
        responseConversations = [...responseConversations, ...extras];
      } catch (_) { /* ignore */ }
    }

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
      const { data: fallback } = await supabase
        .from('conversas_cache')
        .select('raw_data')
        .order('last_activity_at', { ascending: false })
        .limit(500);

      const conversations = (fallback || []).map((row: any) => row.raw_data);
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
