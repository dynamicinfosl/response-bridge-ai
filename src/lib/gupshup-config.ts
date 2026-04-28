import { supabase } from './supabase';

export interface GupshupConfig {
  apiKey: string;
  appId: string;
  source: string;
  baseUrl: string;
}

const CACHE_KEY = 'gupshup_config_cache';
const CACHE_EXPIRY_KEY = 'gupshup_config_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000;
const DB_TIMEOUT = 8000;

let cachedConfig: GupshupConfig | null = null;

function envConfig(): GupshupConfig {
  return {
    apiKey: (import.meta.env.VITE_GUPSHUP_API_KEY as string) || '',
    appId: (import.meta.env.VITE_GUPSHUP_APP_ID as string) || '',
    source: (import.meta.env.VITE_GUPSHUP_SOURCE as string) || '',
    baseUrl: ((import.meta.env.VITE_GUPSHUP_BASE_URL as string) || 'https://api.gupshup.io').replace(/\/$/, ''),
  };
}

function mergeConfig(partial: Partial<GupshupConfig> | null): GupshupConfig {
  const env = envConfig();
  return {
    apiKey: (partial?.apiKey || env.apiKey || '').trim(),
    appId: (partial?.appId || env.appId || '').trim(),
    source: (partial?.source || env.source || '').trim(),
    baseUrl: (partial?.baseUrl || env.baseUrl || 'https://api.gupshup.io').trim().replace(/\/$/, ''),
  };
}

function getLocalCache(): GupshupConfig | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const expiry = Number(localStorage.getItem(CACHE_EXPIRY_KEY) || '0');

    if (!raw || !expiry || Date.now() > expiry) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      return null;
    }

    const parsed = JSON.parse(raw) as GupshupConfig;
    return mergeConfig(parsed);
  } catch {
    return null;
  }
}

function saveLocalCache(config: GupshupConfig) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
  } catch {
    // noop
  }
}

async function fetchFromDb(): Promise<Partial<GupshupConfig> | null> {
  if (typeof window === 'undefined') return null;

  try {
    const queryPromise = supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['gupshup_api_key', 'gupshup_app_id', 'gupshup_source', 'gupshup_base_url']);

    const result = await Promise.race([
      queryPromise,
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: { message: `Timeout ao consultar system_settings (${DB_TIMEOUT}ms)` } }),
          DB_TIMEOUT
        )
      ),
    ]);

    const { data, error } = result as any;
    if (error || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const settings = Object.fromEntries(data.map((row: { key: string; value: string }) => [row.key, row.value || '']));

    return {
      apiKey: settings.gupshup_api_key,
      appId: settings.gupshup_app_id,
      source: settings.gupshup_source,
      baseUrl: settings.gupshup_base_url,
    };
  } catch {
    return null;
  }
}

export async function getGupshupConfig(): Promise<GupshupConfig> {
  if (cachedConfig) return cachedConfig;

  const fromLocal = getLocalCache();
  if (fromLocal) {
    cachedConfig = fromLocal;
    return fromLocal;
  }

  const fromDb = await fetchFromDb();
  const finalConfig = mergeConfig(fromDb);
  cachedConfig = finalConfig;
  saveLocalCache(finalConfig);
  return finalConfig;
}

export function invalidateGupshupConfigCache() {
  cachedConfig = null;
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
  } catch {
    // noop
  }
}
