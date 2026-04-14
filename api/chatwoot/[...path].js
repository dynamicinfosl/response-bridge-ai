/**
 * Vercel Serverless Function — Proxy para Chatwoot
 * Arquivo: api/chatwoot/[...path].js
 *
 * Captura qualquer rota /api/chatwoot/* e encaminha server-side para o Chatwoot real.
 * Isso resolve o erro de CORS: o browser chama o Vercel (mesma origem), e o Vercel
 * encaminha para o Chatwoot com o token de API — tudo server-side.
 */
export default async function handler(req, res) {
  // Suporte a preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, api_access_token, Authorization');
    return res.status(200).end();
  }

  const chatwootBase = process.env.VITE_CHATWOOT_API_URL;
  const apiToken = process.env.VITE_CHATWOOT_API_TOKEN;

  if (!chatwootBase || !apiToken) {
    return res.status(500).json({ error: 'Variáveis VITE_CHATWOOT_API_URL e VITE_CHATWOOT_API_TOKEN não configuradas no Vercel.' });
  }

  // Remove o prefixo /api/chatwoot do caminho para obter o path real do Chatwoot
  const originalPath = req.url.replace(/^\/api\/chatwoot/, '') || '/';
  const targetUrl = `${chatwootBase}${originalPath}`;

  const headers = {
    'Content-Type': 'application/json',
    'api_access_token': apiToken,
  };

  // Para multipart/form-data (envio de anexos), repassa o content-type original
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    headers['Content-Type'] = req.headers['content-type'];
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Repassa o body para métodos que o possuem
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    const contentType = response.headers.get('content-type') || 'application/json';
    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, api_access_token, Authorization');
    res.setHeader('Content-Type', contentType);
    res.status(response.status).send(text);
  } catch (err) {
    console.error('[chatwoot-proxy] Erro ao encaminhar para Chatwoot:', err);
    res.status(502).json({ error: 'Proxy error: ' + (err.message || String(err)) });
  }
}
