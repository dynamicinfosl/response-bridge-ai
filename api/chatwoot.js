/**
 * Vercel Serverless Function — Proxy para Chatwoot
 *
 * Rota: /api/chatwoot/[...path]
 * Qualquer requisição para /api/chatwoot/* é encaminhada server-side para o Chatwoot real,
 * evitando o erro de CORS que ocorre quando o browser tenta acessar diretamente.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

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
    'api_access_token': apiToken,
  };

  // Preserva Content-Type original (obrigatório para multipart/form-data)
  const incomingContentType = req.headers['content-type'];
  if (incomingContentType) {
    headers['Content-Type'] = incomingContentType;
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Repassa o body raw para POST/PATCH/PUT
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      const bodyBuffer = await readBody(req);
      if (bodyBuffer.length > 0) {
        fetchOptions.body = bodyBuffer;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Determina content-type da resposta
    const contentType = response.headers.get('content-type') || 'application/json';
    const text = await response.text();

    // Configuração de CORS mais segura: permite a origem que fez a requisição
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, api_access_token, Authorization');
    res.setHeader('Content-Type', contentType);
    res.status(response.status).send(text);
  } catch (err) {
    console.error('[chatwoot-proxy] Error:', err);
    res.status(502).json({ error: 'Proxy error: ' + err.message });
  }
}
