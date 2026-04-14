/**
 * Vercel Serverless Function — Proxy para Chatwoot
 * 
 * Rota: /api/chatwoot/[...path]
 * Qualquer requisição para /api/chatwoot/* é encaminhada server-side para o Chatwoot real,
 * evitando o erro de CORS que ocorre quando o browser tenta acessar diretamente.
 */
export default async function handler(req, res) {
  const chatwootBase = process.env.VITE_CHATWOOT_API_URL;
  const apiToken = process.env.VITE_CHATWOOT_API_TOKEN;

  if (!chatwootBase || !apiToken) {
    return res.status(500).json({ error: 'Chatwoot env vars not configured on Vercel.' });
  }

  // Remove o prefixo /api/chatwoot do path
  const originalPath = req.url.replace(/^\/api\/chatwoot/, '') || '/';

  const targetUrl = `${chatwootBase}${originalPath}`;

  // Monta os headers repassando o token
  const headers = {
    'Content-Type': 'application/json',
    'api_access_token': apiToken,
  };

  // Remove content-type se for multipart (uploads)
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    headers['Content-Type'] = req.headers['content-type'];
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Repassa o body para POST/PATCH/PUT
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      // O body já vem parseado pelo Vercel como objeto; re-serializa
      if (req.body) {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Determina content-type da resposta
    const contentType = response.headers.get('content-type') || 'application/json';
    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, api_access_token, Authorization');
    res.setHeader('Content-Type', contentType);
    res.status(response.status).send(text);
  } catch (err) {
    console.error('[chatwoot-proxy] Error:', err);
    res.status(502).json({ error: 'Proxy error: ' + err.message });
  }
}
