/**
 * Gerenciamento de configurações do n8n
 * Busca do banco de dados com fallback para .env.local
 */

// Cache em memória
let cachedSettings: {
  n8n_api_url: string;
  n8n_api_key: string;
} | null = null;

// Chave do localStorage para cache
const CACHE_KEY = 'n8n_settings_cache';
const CACHE_EXPIRY_KEY = 'n8n_settings_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const DB_FETCH_TIMEOUT = 4000; // 4s - evita travar a página se o Supabase demorar

/**
 * Busca configurações do Supabase (com timeout para não travar o carregamento)
 */
async function fetchSettingsFromDB(): Promise<{ n8n_api_url: string; n8n_api_key: string } | null> {
  const doFetch = async (): Promise<{ n8n_api_url: string; n8n_api_key: string } | null> => {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['n8n_api_url', 'n8n_api_key']);

    if (error) {
      console.warn('⚠️ Erro ao buscar configurações do banco:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const settings: { n8n_api_url: string; n8n_api_key: string } = {
      n8n_api_url: '',
      n8n_api_key: '',
    };

    data.forEach(item => {
      if (item.key === 'n8n_api_url') {
        settings.n8n_api_url = item.value || '';
      } else if (item.key === 'n8n_api_key') {
        settings.n8n_api_key = item.value || '';
      }
    });

    if (!settings.n8n_api_url) {
      return null;
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
      localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
    } catch (e) {
      /* ignore */
    }

    return settings;
  };

  try {
    const timeout = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), DB_FETCH_TIMEOUT)
    );
    const result = await Promise.race([doFetch(), timeout]);
    return result;
  } catch (error) {
    if (String(error) === 'Error: timeout') {
      console.warn('⚠️ Busca de configurações do banco expirou, usando .env');
    } else {
      console.warn('⚠️ Erro ao buscar configurações do banco:', error);
    }
    return null;
  }
}

/**
 * Busca configurações do cache (localStorage)
 */
function getCachedSettings(): { n8n_api_url: string; n8n_api_key: string } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);

    if (!cached || !expiry) {
      return null;
    }

    // Verificar se o cache expirou
    if (Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      return null;
    }

    return JSON.parse(cached);
  } catch (e) {
    return null;
  }
}

/**
 * Obtém a URL base da API do n8n
 * Em desenvolvimento usa /api/n8n (proxy do Vite) para evitar CORS.
 * Prioridade: Em dev -> /api/n8n; Senão: Cache > Banco > .env.local
 */
export async function getN8NApiUrl(): Promise<string> {
  // Em dev: usar proxy do Vite para evitar CORS (n8n não envia Access-Control-Allow-Origin)
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return '/api/n8n';
  }

  // 1. Verificar cache em memória
  if (cachedSettings?.n8n_api_url) {
    return cachedSettings.n8n_api_url;
  }

  // 2. Verificar cache no localStorage
  const cached = getCachedSettings();
  if (cached?.n8n_api_url) {
    cachedSettings = cached;
    return cached.n8n_api_url;
  }

  // 3. Tentar buscar do banco (apenas se estiver no navegador)
  if (typeof window !== 'undefined') {
    const dbSettings = await fetchSettingsFromDB();
    if (dbSettings?.n8n_api_url) {
      cachedSettings = dbSettings;
      return dbSettings.n8n_api_url;
    }
  }

  // 4. Fallback para .env.local
  const envUrl = import.meta.env.VITE_N8N_API_URL || '';
  if (envUrl) {
    return envUrl;
  }

  console.warn('⚠️ N8N API URL não configurada!');
  return '';
}

/**
 * Obtém a API Key do n8n
 * Prioridade: Cache > Banco de dados > .env.local
 */
export async function getN8NApiKey(): Promise<string> {
  // 1. Verificar cache em memória
  if (cachedSettings?.n8n_api_key !== undefined) {
    return cachedSettings.n8n_api_key;
  }

  // 2. Verificar cache no localStorage
  const cached = getCachedSettings();
  if (cached) {
    cachedSettings = cached;
    return cached.n8n_api_key || '';
  }

  // 3. Tentar buscar do banco (apenas se estiver no navegador)
  if (typeof window !== 'undefined') {
    const dbSettings = await fetchSettingsFromDB();
    if (dbSettings) {
      cachedSettings = dbSettings;
      return dbSettings.n8n_api_key || '';
    }
  }

  // 4. Fallback para .env.local
  return import.meta.env.VITE_N8N_API_KEY || '';
}

/**
 * Invalida o cache (chamar quando as configurações forem atualizadas)
 */
export function invalidateN8NCache() {
  cachedSettings = null;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
  } catch (e) {
    // Ignorar erros
  }
}

/**
 * Síncrono: Obtém a URL do cache (para uso em componentes React)
 * Em dev retorna /api/n8n (proxy). Retorna vazio se não estiver em cache.
 */
export function getN8NApiUrlSync(): string {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return '/api/n8n';
  }
  if (cachedSettings?.n8n_api_url) {
    return cachedSettings.n8n_api_url;
  }
  const cached = getCachedSettings();
  if (cached?.n8n_api_url) {
    cachedSettings = cached;
    return cached.n8n_api_url;
  }
  return import.meta.env.VITE_N8N_API_URL || '';
}



