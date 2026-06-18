/**
 * Wrapper interno para a API de ligações por IA.
 * Este módulo é de uso técnico interno; a UI não deve expor nomes de serviços externos.
 */

const SETTINGS_KEY = 'vapi_api_key';
const LS_CACHE_KEY = 'voice_api_key_cache';
const LS_CACHE_EXPIRY_KEY = 'voice_api_key_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface VoiceCall {
  id: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  endedReason?: string;
  assistantId?: string;
  phoneNumberId?: string;
  type?: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  customer?: {
    number?: string;
    name?: string;
  };
}

export interface VoiceCallDetail extends VoiceCall {
  transcript?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  summary?: string;
  analysis?: {
    summary?: string;
    successEvaluation?: string;
    structuredData?: Record<string, unknown>;
  };
  messages?: Array<{
    role: 'assistant' | 'user' | 'system' | 'tool';
    message?: string;
    time?: number;
    endTime?: number;
    secondsFromStart?: number;
  }>;
  cost?: number;
}

export interface ListCallsParams {
  limit?: number;
  createdAtGt?: string;
  createdAtLt?: string;
  phoneNumberId?: string;
}

// ─── Cache da API Key ─────────────────────────────────────────────────────────

let memCachedKey: string | null = null;
let memCacheExpiry = 0;

export function invalidateVoiceApiCache() {
  memCachedKey = null;
  memCacheExpiry = 0;
  try {
    localStorage.removeItem(LS_CACHE_KEY);
    localStorage.removeItem(LS_CACHE_EXPIRY_KEY);
  } catch (_) { /* ignore */ }
}

async function getApiKey(): Promise<string> {
  // 1. Cache em memória
  if (memCachedKey && Date.now() < memCacheExpiry) return memCachedKey;

  // 2. Cache no localStorage
  try {
    const stored = localStorage.getItem(LS_CACHE_KEY);
    const expiry = localStorage.getItem(LS_CACHE_EXPIRY_KEY);
    if (stored && expiry && Date.now() < parseInt(expiry, 10)) {
      memCachedKey = stored;
      memCacheExpiry = parseInt(expiry, 10);
      return stored;
    }
  } catch (_) { /* ignore */ }

  // 3. Supabase system_settings
  try {
    const { supabase } = await import('./supabase');
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();
    if (data?.value) {
      const exp = Date.now() + CACHE_DURATION;
      memCachedKey = data.value;
      memCacheExpiry = exp;
      try {
        localStorage.setItem(LS_CACHE_KEY, data.value);
        localStorage.setItem(LS_CACHE_EXPIRY_KEY, String(exp));
      } catch (_) { /* ignore */ }
      return data.value;
    }
  } catch (_) { /* ignore */ }

  // 4. Fallback .env
  return (import.meta.env.VITE_VAPI_API_KEY as string) || '';
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (import.meta.env.DEV) return '/api/vapi';
  return 'https://api.vapi.ai';
}

async function voiceRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(
      'Chave de API de voz não configurada. Configure em Configurações Avançadas.',
    );
  }

  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Erro na API de voz: ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const voiceCallsApi = {
  list(params?: ListCallsParams): Promise<VoiceCall[]> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.createdAtGt) qs.set('createdAtGt', params.createdAtGt);
    if (params?.createdAtLt) qs.set('createdAtLt', params.createdAtLt);
    if (params?.phoneNumberId) qs.set('phoneNumberId', params.phoneNumberId);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return voiceRequest<VoiceCall[]>(`/call${query}`);
  },

  get(id: string): Promise<VoiceCallDetail> {
    return voiceRequest<VoiceCallDetail>(`/call/${id}`);
  },
};
