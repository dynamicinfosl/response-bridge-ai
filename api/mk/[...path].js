/**
 * Vercel Serverless Function — Proxy para MK Solutions
 * Arquivo: api/mk/[...path].js
 *
 * Captura qualquer rota /api/mk/* e encaminha server-side para o MK Solutions.
 * Isso resolve o erro de Mixed Content: o browser chama o Vercel (HTTPS),
 * e o Vercel encaminha para o MK Solutions (HTTP) — tudo server-side.
 */
export default async function handler(req, res) {
  // Suporte a preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const defaultMkBase = 'http://186.219.120.50:8080';
  const defaultSupabaseUrl = 'https://vwecyrjfcqdcdaooizcx.supabase.co';
  const defaultSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZWN5cmpmY3FkY2Rhb29pemN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1OTMzMTEsImV4cCI6MjEwMDE2OTMxMX0.TZpa9G3qBW5BDJoRHqd0pXru4TTjulVkei3Fo2Wj9EQ';

  let mkBase = process.env.VITE_MK_BASE_URL;

  if (!mkBase) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseKey;
      if (supabaseUrl && supabaseKey) {
        const settingsRes = await fetch(
          `${supabaseUrl}/rest/v1/system_settings?select=value&key=eq.mk_base_url`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        if (settingsRes.ok) {
          const rows = await settingsRes.json();
          if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
            mkBase = rows[0].value;
          }
        }
      }
    } catch (e) {
      console.error('[mk-proxy] Falha ao buscar mk_base_url no Supabase:', e);
    }
  }

  if (!mkBase) {
    mkBase = defaultMkBase;
  }

  // Obtém o caminho correto considerando o roteamento catch-all [...path] do Vercel
  let originalPath = '';
  if (req.query && Array.isArray(req.query.path)) {
    originalPath = '/' + req.query.path.join('/');
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      urlObj.searchParams.delete('path');
      const queryString = urlObj.searchParams.toString();
      if (queryString) {
        originalPath += `?${queryString}`;
      }
    } catch (e) {
      /* ignore */
    }
  } else if (req.query && typeof req.query.path === 'string') {
    originalPath = '/' + req.query.path;
  } else {
    originalPath = (req.url || '').replace(/^\/api\/mk/, '').replace(/^\/\[\.\.\.path\]/, '') || '/';
  }

  // Normaliza o caminho para garantir que não haja duplicação /mk/mk/ e que haja o /mk/ no destino
  originalPath = originalPath.replace(/^\/mk\/mk\//, '/mk/');
  if (!originalPath.startsWith('/mk/') && originalPath !== '/mk') {
    originalPath = '/mk' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);
  }
  const targetUrl = `${mkBase.replace(/\/$/, '')}${originalPath}`;

  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    const contentType = response.headers.get('content-type') || 'application/json';
    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', contentType);

    // Se o MK retornou mensagem de token inválido/expirado, responde com status 401 para o cliente invalidar cache local
    if (text && (text.includes('Token não localizado') || text.includes('Token expirado') || text.includes('"CodToken": 0'))) {
      return res.status(401).send(text);
    }

    res.status(response.status).send(text);
  } catch (err) {
    console.error('[mk-proxy] Erro ao encaminhar para MK Solutions:', err);
    res.status(502).json({ error: 'Proxy error: ' + (err.message || String(err)) });
  }
}
