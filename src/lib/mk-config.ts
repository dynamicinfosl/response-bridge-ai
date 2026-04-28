/**
 * Configuração MK Solutions (Adaptlink)
 * Tudo em um lugar: uma busca no Supabase (system_settings) traz URL e token.
 * Chaves: mk_base_url, mk_token. Se faltar no banco, usa .env (VITE_MK_BASE_URL, VITE_MK_TOKEN).
 *
 * GESTÃO DE TOKEN:
 * - O token do MK expira a cada 48h.
 * - O n8n renova o token a cada 24h e salva em system_settings (key: mk_token).
 * - Cache local de 1h garante que pegamos o token renovado sem bater no banco em toda requisição.
 * - Se a API retornar 401/403, o cache é invalidado e o token é re-buscado do Supabase automaticamente.
 */

import { supabase } from './supabase';

export interface MKConfig {
  baseUrl: string;
  token: string;
}

const CACHE_KEY = 'mk_config_cache';
const CACHE_EXPIRY_KEY = 'mk_config_cache_expiry';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora (token expira em 48h; n8n renova a cada 24h)
const DB_TIMEOUT = 8000; // 8s

let cached: MKConfig | null = null;

async function fetchMKConfigFromDB(): Promise<MKConfig | null> {
  if (typeof window === 'undefined') return null;

  // Tenta primeiro via cliente Supabase (com timeout)
  try {
    console.log('[MK Config Debug] Iniciando busca no Supabase (system_settings)...');
    const queryPromise = supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['mk_base_url', 'mk_token']);

    const result = await Promise.race([
      queryPromise,
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout: query Supabase demorou mais de ' + DB_TIMEOUT + 'ms' } }), DB_TIMEOUT)
      ),
    ]);

    const { data, error } = result as any;

    if (error) {
      console.warn('[MK Config] Erro/timeout na query Supabase:', error.message || error);
      // Fallback: fetch REST direto
      return await fetchMKConfigREST();
    }

    const parsed = parseSettingsRows(data);
    if (parsed) return parsed;
  } catch (err: any) {
    console.warn('[MK Config] Exceção ao buscar DB:', err?.message || err);
  }

  // Fallback: fetch REST direto
  return await fetchMKConfigREST();
}

/** Fallback: busca system_settings via REST API direto (sem depender do cliente Supabase) */
async function fetchMKConfigREST(): Promise<MKConfig | null> {
  try {
    const sbUrl = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '');
    const sbKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string || '');
    if (!sbUrl || !sbKey) {
      console.warn('[MK Config REST] Sem VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY.');
      return null;
    }

    console.log('[MK Config REST] Tentando fetch direto na REST API do Supabase...');
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), DB_TIMEOUT);

    const res = await fetch(
      `${sbUrl}/rest/v1/system_settings?select=key,value&key=in.(%22mk_base_url%22,%22mk_token%22)`,
      {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
        signal: controller.signal,
      }
    );
    clearTimeout(tid);

    if (!res.ok) {
      console.warn('[MK Config REST] HTTP', res.status);
      return null;
    }

    const rows = await res.json();
    console.log('[MK Config REST] Resposta:', Array.isArray(rows) ? `${rows.length} rows` : typeof rows);
    return parseSettingsRows(rows);
  } catch (err: any) {
    console.warn('[MK Config REST] Falha:', err?.message || err);
    return null;
  }
}

/** Extrai baseUrl e token de um array de {key, value} */
function parseSettingsRows(data: any): MKConfig | null {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('[MK Config] Nenhum dado encontrado em system_settings para as chaves MK.');
    return null;
  }

  const rows = data as { key: string; value: string }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  const baseUrl = (map.mk_base_url ?? '').trim().replace(/\/$/, '');
  const token = (map.mk_token ?? '').trim();

  console.log(`[MK Config Debug] Dados buscados. baseUrl: ${baseUrl ? 'OK' : 'Vazio'}, token: ${token ? 'OK' : 'Vazio'}`);

  const finalBaseUrl = baseUrl || envBaseUrl();
  const finalToken = token || envToken();
  if (finalBaseUrl && finalToken) {
    return { baseUrl: finalBaseUrl, token: finalToken };
  }
  return null;
}

function envBaseUrl(): string {
  return ((import.meta.env.VITE_MK_BASE_URL as string) || '').replace(/\/$/, '');
}

function envToken(): string {
  return ((import.meta.env.VITE_MK_TOKEN as string) || '').trim();
}

/** Em dev, usa o proxy Vite /api/mk. Em prod, usa o proxy Vercel /api/mk. Nunca chama o MK direto do browser. */
function resolveBaseUrl(_baseUrl: string): string {
  // Sempre usa o proxy (Vite em dev, Vercel serverless em prod)
  // Isso evita Mixed Content (HTTPS -> HTTP) em produção
  return '/api/mk';
}

function getCached(): MKConfig | null {
  if (cached?.token?.trim() && cached?.baseUrl?.trim()) return cached;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (!raw || !expiry || Date.now() > parseInt(expiry, 10)) return null;
    const obj = JSON.parse(raw) as { baseUrl?: string; token?: string };
    const baseUrl = (obj?.baseUrl ?? '').trim();
    const token = (obj?.token ?? '').trim();
    if (baseUrl && token) {
      cached = { baseUrl, token };
      return cached;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function setCache(config: MKConfig) {
  cached = config;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ baseUrl: config.baseUrl, token: config.token }));
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
  } catch {
    /* ignore */
  }
}

/**
 * Retorna a configuração MK.
 * Ordem: cache em memória → cache localStorage → Supabase → .env.
 */
export async function getMKConfig(): Promise<MKConfig> {
  console.log('[MK Config Debug] Chamando getMKConfig...');
  const fromCache = getCached();
  if (fromCache?.baseUrl?.trim() && fromCache?.token?.trim()) {
    console.log('[MK Config Debug] Retornando do cache.');
    return {
      baseUrl: resolveBaseUrl(fromCache.baseUrl),
      token: fromCache.token,
    };
  }

  // Se o cache existe mas está incompleto (token ou url vazio), limpa para não travar
  if (fromCache && (!fromCache.baseUrl?.trim() || !fromCache.token?.trim())) {
    console.warn('[MK Config Debug] Cache incompleto detectado. Invalidando...');
    invalidateMKCache();
  }

  console.log('[MK Config Debug] Cache vazio, chamando fetchMKConfigFromDB...');
  const fromDb = await fetchMKConfigFromDB();
  console.log(`[MK Config Debug] fetchMKConfigFromDB retornou: ${fromDb ? 'Sucesso' : 'Falha'}`);
  
  if (fromDb) {
    const resolved = {
      baseUrl: resolveBaseUrl(fromDb.baseUrl),
      token: fromDb.token,
    };
    if (resolved.baseUrl && resolved.token) {
      setCache({ baseUrl: fromDb.baseUrl, token: fromDb.token });
      console.log('[MK Config Debug] Config MK completa salva no cache.');
    } else {
      console.warn('[MK Config Debug] Config MK incompleta do DB. baseUrl:', !!resolved.baseUrl, 'token:', !!resolved.token);
    }
    return resolved;
  }

  console.log('[MK Config Debug] Usando .env como fallback final.');
  const baseUrl = resolveBaseUrl(envBaseUrl());
  const token = envToken();
  const config: MKConfig = { baseUrl, token };
  if (baseUrl && token) {
    setCache({ baseUrl: envBaseUrl(), token });
    console.log('[MK Config Debug] Config MK salva no cache (fallback .env).');
  } else {
    console.warn('[MK Config Debug] Fallback .env também incompleto. baseUrl:', !!baseUrl, 'token:', !!token);
  }
  return config;
}

export async function getMKBaseUrl(): Promise<string> {
  const c = await getMKConfig();
  return c.baseUrl;
}

export async function getMKToken(): Promise<string> {
  const c = await getMKConfig();
  return c.token;
}

/**
 * Invalida o cache do token.
 * Chamada automaticamente pela mk-api.ts quando recebe 401/403,
 * assim a próxima requisição busca o token renovado do Supabase.
 */
export function invalidateMKCache() {
  cached = null;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
  } catch {
    /* ignore */
  }
}
