import { createClient } from '@supabase/supabase-js';

/**
 * Vercel Serverless Function — Proxy para MK Solutions
 * Arquivo: api/mk/[...path].js
 *
 * Captura qualquer rota /api/mk/* e encaminha server-side para o MK Solutions.
 * Busca o token e URL base diretamente do Supabase (system_settings).
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Suporte a preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  let mkBase = process.env.VITE_MK_BASE_URL;
  let mkToken = process.env.VITE_MK_TOKEN;

  // Busca do Supabase para garantir que usamos o token atualizado pelo n8n
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['mk_base_url', 'mk_token']);

    if (!error && settings) {
      const dbBase = settings.find(s => s.key === 'mk_base_url')?.value;
      const dbToken = settings.find(s => s.key === 'mk_token')?.value;
      if (dbBase) mkBase = dbBase;
      if (dbToken) mkToken = dbToken;
    }
  } catch (dbErr) {
    console.warn('[mk-proxy] Erro ao buscar config no Supabase, usando .env:', dbErr);
  }

  if (!mkBase) {
    return res.status(500).json({ error: 'Configuração MK (URL) não encontrada no DB nem no Env.' });
  }

  // Remove o prefixo /api/mk do caminho para obter o path real do MK
  const originalPath = req.url.replace(/^\/api\/mk/, '') || '/';
  
  // Garante que o token do banco seja usado, mesmo que o frontend mande outro ou nenhum
  const urlObj = new URL(originalPath, 'http://localhost'); // base ficticia para parsing
  urlObj.searchParams.set('token', mkToken);
  urlObj.searchParams.set('sys', 'MK0');

  const finalPath = urlObj.pathname + urlObj.search;
  const targetUrl = `${mkBase.replace(/\/$/, '')}${finalPath}`;

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
