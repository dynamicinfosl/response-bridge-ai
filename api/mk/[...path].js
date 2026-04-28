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

  let mkBase = process.env.VITE_MK_BASE_URL;

  if (!mkBase) {
    // Fallback: busca mk_base_url no Supabase (system_settings)
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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
    return res.status(500).json({ error: 'Variável VITE_MK_BASE_URL não configurada no Vercel e mk_base_url não encontrado no Supabase.' });
  }

  // Remove o prefixo /api/mk do caminho para obter o path real do MK
  const originalPath = req.url.replace(/^\/api\/mk/, '') || '/';
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
    res.status(response.status).send(text);
  } catch (err) {
    console.error('[mk-proxy] Erro ao encaminhar para MK Solutions:', err);
    res.status(502).json({ error: 'Proxy error: ' + (err.message || String(err)) });
  }
}
