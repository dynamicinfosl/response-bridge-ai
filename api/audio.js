/**
 * Vercel Serverless Function — Proxy de Áudio para WhatsApp/Gupshup
 *
 * Motivação: o Chatwoot armazena áudios OGG/Opus mas devolve Content-Type
 * "audio/opus", que NÃO é aceito pelo WhatsApp/Meta (erro 131053). Este
 * endpoint baixa o áudio da URL informada e retransmite com o Content-Type
 * correto "audio/ogg; codecs=opus", permitindo que o Gupshup envie como
 * mensagem de voz nativa.
 *
 * Uso:
 *   GET /api/audio?u=<URL encodada do áudio no Chatwoot>
 */
export default async function handler(req, res) {
  const u = req.query.u;
  if (!u || typeof u !== 'string') {
    return res.status(400).json({ error: 'missing url param "u"' });
  }

  // Sanity check: só permitimos proxy para o host do Chatwoot configurado
  // (evita uso indevido como open proxy).
  const allowedHost = (process.env.VITE_CHATWOOT_API_URL || '')
    .replace(/^https?:\/\//, '')
    .split('/')[0];
  try {
    const target = new URL(u);
    if (allowedHost && target.host !== allowedHost) {
      return res.status(403).json({ error: 'host not allowed', host: target.host });
    }
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  try {
    const upstream = await fetch(u, { redirect: 'follow' });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream error', status: upstream.status });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', 'audio/ogg; codecs=opus');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(buf);
  } catch (err) {
    console.error('[audio-proxy] error:', err);
    res.status(502).json({ error: 'proxy error: ' + (err?.message || 'unknown') });
  }
}
