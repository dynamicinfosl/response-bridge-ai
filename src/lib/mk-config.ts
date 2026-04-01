/**
 * Configuração MK Solutions (Adaptlink)
 * Tudo em um lugar: uma busca no Supabase (system_settings) traz URL e token.
 * Chaves: mk_base_url, mk_token. Se faltar no banco, usa .env (VITE_MK_BASE_URL, VITE_MK_TOKEN).
 */

export interface MKConfig {
  baseUrl: string;
  token: string;
}

const CACHE_KEY = 'mk_config_cache';
const CACHE_EXPIRY_KEY = 'mk_config_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 min
const DB_TIMEOUT = 8000; // 8s

let cached: MKConfig | null = null;

/** Uma única query: busca URL e token do Supabase. */
async function fetchMKConfigFromDB(): Promise<MKConfig | null> {
  if (typeof window === 'undefined') return null;
  const { supabase } = await import('./supabase');

  console.log('🔍 [MK Config] Buscando config no Supabase...');

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn('⏱️ [MK Config] Timeout após 8s - usando fallback .env');
      resolve(null);
    }, DB_TIMEOUT);

    supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['mk_base_url', 'mk_token'])
      .then(({ data, error }) => {
        clearTimeout(timer);
        if (error) {
          console.error('❌ [MK Config] Erro ao buscar do Supabase:', error);
          resolve(null);
          return;
        }
        const rows = (data ?? []) as { key: string; value: string }[];
        console.log('📊 [MK Config] Linhas retornadas:', rows.length);
        console.log('   Dados:', rows);
        
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
        const baseUrl = (map.mk_base_url ?? '').trim().replace(/\/$/, '');
        const token = (map.mk_token ?? '').trim();
        
        console.log('🔧 [MK Config] Valores parseados:');
        console.log(`   • mk_base_url: ${baseUrl || '(vazio)'}`);
        console.log(`   • mk_token: ${token ? token.substring(0, 20) + '...' : '(vazio)'}`);
        
        if (baseUrl || token) {
          const result = {
            baseUrl: baseUrl || envBaseUrl(),
            token: token || envToken(),
          };
          console.log('✅ [MK Config] Config montada:', {
            baseUrl: result.baseUrl,
            token: result.token ? result.token.substring(0, 20) + '...' : '(vazio)',
          });
          resolve(result);
        } else {
          console.warn('⚠️ [MK Config] Nenhum valor encontrado no Supabase - usando .env');
          resolve(null);
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        console.error('❌ [MK Config] Erro na promise:', err);
        resolve(null);
      });
  });
}

function envBaseUrl(): string {
  return ((import.meta.env.VITE_MK_BASE_URL as string) || '').replace(/\/$/, '');
}

function envToken(): string {
  return ((import.meta.env.VITE_MK_TOKEN as string) || '').trim();
}

/** Em dev, a base precisa ser /api/mk para o proxy do Vite. */
function resolveBaseUrl(baseUrl: string): string {
  if (typeof window !== 'undefined' && import.meta.env.DEV && envBaseUrl()) {
    return '/api/mk';
  }
  return baseUrl;
}

function getCached(): MKConfig | null {
  // Só considera cache válido se tiver URL e token preenchidos.
  // Importante: não "completar" com .env aqui, senão um cache antigo (ex.: token vazio)
  // impede buscar o token novo no Supabase.
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
 * Retorna a configuração MK: uma única fonte.
 * Ordem: cache em memória → cache localStorage → Supabase (uma query) → .env.
 */
export async function getMKConfig(): Promise<MKConfig> {
  console.log('🚀 [MK Config] getMKConfig() chamado');
  const fromCache = getCached();
  if (fromCache?.baseUrl?.trim() && fromCache?.token?.trim()) {
    return {
      baseUrl: resolveBaseUrl(fromCache.baseUrl),
      token: fromCache.token,
    };
  }

  const fromDb = await fetchMKConfigFromDB();
  if (fromDb) {
    const resolved = {
      baseUrl: resolveBaseUrl(fromDb.baseUrl || envBaseUrl()),
      token: fromDb.token || envToken(),
    };
    // Cacheia somente os valores “crus” (URL real, não /api/mk) + token.
    if (resolved.baseUrl || resolved.token) {
      setCache({ baseUrl: fromDb.baseUrl || envBaseUrl(), token: fromDb.token || envToken() });
    }
    return resolved;
  }

  const baseUrl = resolveBaseUrl(envBaseUrl());
  const token = envToken();
  const config: MKConfig = { baseUrl, token };
  if (baseUrl || token) setCache({ baseUrl: envBaseUrl(), token });
  return config;
}

/** Atualiza apenas a base na resposta (para compat). */
export async function getMKBaseUrl(): Promise<string> {
  const c = await getMKConfig();
  return c.baseUrl;
}

/** Atualiza apenas o token na resposta (para compat). */
export async function getMKToken(): Promise<string> {
  const c = await getMKConfig();
  return c.token;
}

export function invalidateMKCache() {
  cached = null;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
  } catch {
    /* ignore */
  }
}
