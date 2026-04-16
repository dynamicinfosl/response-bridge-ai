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

  try {
    console.log('[MK Config] Buscando dados de mk_base_url e mk_token no Supabase...');
    const data: any = await Promise.race([
      supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['mk_base_url', 'mk_token']),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout_MK_DB')), 8000)
      )
    ]);

    if (!data || data.error || !data.data) {
      console.warn('[MK Config] Falha ao buscar no DB. Motivo:', data?.error?.message || 'Dados vazios');
      return null;
    }

    const rows = data.data as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
    const baseUrl = (map.mk_base_url ?? '').trim().replace(/\/$/, '');
    const token = (map.mk_token ?? '').trim();

    console.log(`[MK Config] Dados recuperados do Supabase. URL: ${baseUrl ? 'SIM' : 'NÃO'}, Token: ${token ? 'SIM' : 'NÃO'}`);

    if (baseUrl || token) {
      return {
        baseUrl: baseUrl || envBaseUrl(),
        token: token || envToken(),
      };
    }
  } catch (err: any) {
    console.error('[MK Config] Exceção ao buscar DB:', err?.message || err);
    return null;
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
  const fromCache = getCached();
  
  // Se temos cache válido e recente, usamos ele.
  if (fromCache?.baseUrl?.trim() && fromCache?.token?.trim()) {
    console.log('[MK Config] Usando configuração do cache (localStorage/RAM).');
    return {
      baseUrl: resolveBaseUrl(fromCache.baseUrl),
      token: fromCache.token,
    };
  }

  console.log('[MK Config] Buscando nova configuração no Supabase (system_settings)...');
  const fromDb = await fetchMKConfigFromDB();
  
  if (fromDb) {
    console.log(`[MK Config] Configuração recuperada do Supabase. Token (parcial): ${fromDb.token.substring(0, 4)}...`);
    const resolved = {
      baseUrl: resolveBaseUrl(fromDb.baseUrl || envBaseUrl()),
      token: fromDb.token || envToken(),
    };
    
    // Salva no cache os valores ORIGINAIS (sem o prefixo de proxy)
    setCache({ 
      baseUrl: fromDb.baseUrl || envBaseUrl(), 
      token: fromDb.token || envToken() 
    });
    
    return resolved;
  }

  // Fallback final: Variáveis de ambiente
  console.warn('[MK Config] Falha ao buscar no Supabase. Usando fallback do .env (VITE_MK_TOKEN).');
  const baseUrl = resolveBaseUrl(envBaseUrl());
  const token = envToken();
  const config: MKConfig = { baseUrl, token };
  
  if (baseUrl || token) {
    setCache({ baseUrl: envBaseUrl(), token });
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
