/**
 * Vercel Serverless Function — Proxy para Chatwoot
 * Arquivo: api/chatwoot/[...path].js
 *
 * Captura qualquer rota /api/chatwoot/* e encaminha server-side para o Chatwoot real.
 * Isso resolve o erro de CORS: o browser chama o Vercel (mesma origem), e o Vercel
 * encaminha para o Chatwoot com o token de API — tudo server-side.
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
  // Suporte a preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, api_access_token, Authorization');
    return res.status(200).end();
  }

  const chatwootBase = (process.env.VITE_CHATWOOT_API_URL || 'https://chatwoot-chatwoot.euftcp.easypanel.host').replace(/\/$/, '');
  const apiToken = process.env.VITE_CHATWOOT_API_TOKEN || 'Ki9bmrbonCbL6wUhZRoFxs7u';

  if (!chatwootBase || !apiToken) {
    return res.status(500).json({ error: 'Variáveis VITE_CHATWOOT_API_URL e VITE_CHATWOOT_API_TOKEN não configuradas no Vercel.' });
  }

  // Obtém o caminho correto considerando o roteamento catch-all [...path] do Vercel
  let originalPath = '';
  if (req.query && Array.isArray(req.query.path)) {
    originalPath = '/' + req.query.path.join('/');
  } else if (req.query && typeof req.query.path === 'string') {
    originalPath = '/' + req.query.path;
  } else {
    originalPath = (req.url || '').split('?')[0].replace(/^\/api\/chatwoot/, '').replace(/^\/\[\.\.\.path\]/, '') || '/';
  }

  // Query params via req.query (before, t, after…). No Vercel, req.url costuma vir sem search string —
  // o mesmo bug que quebrava o proxy MK e fazia o load-older repetir a 1ª página.
  const queryParams = new URLSearchParams();
  if (req.query && typeof req.query === 'object') {
    Object.entries(req.query).forEach(([k, v]) => {
      if (k === 'path') return;
      if (Array.isArray(v)) {
        v.forEach((val) => queryParams.append(k, String(val)));
      } else if (v != null) {
        queryParams.append(k, String(v));
      }
    });
  }
  const queryString = queryParams.toString();
  if (queryString) {
    originalPath += `?${queryString}`;
  }

  const targetUrl = `${chatwootBase}${originalPath}`;

  const headers = {
    'api_access_token': apiToken,
  };

  // Preserva Content-Type apenas para requisições com corpo (POST, PATCH, PUT)
  const incomingContentType = req.headers['content-type'];
  if (incomingContentType && ['POST', 'PATCH', 'PUT'].includes(req.method)) {
    headers['Content-Type'] = incomingContentType;
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Repassa o body raw para métodos que o possuem
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      const bodyBuffer = await readBody(req);
      if (bodyBuffer.length > 0) {
        fetchOptions.body = bodyBuffer;
      }
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
