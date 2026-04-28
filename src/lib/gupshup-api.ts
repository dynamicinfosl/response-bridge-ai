import { getGupshupConfig, type GupshupConfig } from './gupshup-config';

export interface GupshupTemplate {
  id: string;
  elementName?: string;
  category?: string;
  languageCode?: string;
  status?: string;
  type?: string;
  quality?: string;
  raw?: Record<string, unknown>;
}

function withRuntimeConfig(base: GupshupConfig, runtime?: GupshupRuntimeConfig): GupshupConfig {
  if (!runtime) return base;

  return {
    apiKey: (runtime.apiKey ?? base.apiKey).trim(),
    appId: (runtime.appId ?? base.appId).trim(),
    source: (runtime.source ?? base.source).trim(),
    baseUrl: (runtime.baseUrl ?? base.baseUrl).trim().replace(/\/$/, ''),
  };
}

export interface ListTemplatesParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  type?: string;
  quality?: string;
  languageCode?: string;
}

export interface SendTemplatePayload {
  destination: string;
  templateId: string;
  params?: string[];
  message?: Record<string, unknown>;
}

export interface GupshupRuntimeConfig {
  apiKey?: string;
  appId?: string;
  source?: string;
  baseUrl?: string;
}

function normalizePhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

function ensureConfig(config: GupshupConfig) {
  if (!config.apiKey) throw new Error('Gupshup API Key não configurada (VITE_GUPSHUP_API_KEY ou system_settings.gupshup_api_key).');
  if (!config.appId) throw new Error('Gupshup App ID não configurado (VITE_GUPSHUP_APP_ID ou system_settings.gupshup_app_id).');
  if (!config.source) throw new Error('Número de origem da Gupshup não configurado (VITE_GUPSHUP_SOURCE ou system_settings.gupshup_source).');
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const text = await response.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`Gupshup API (${response.status}): ${details || response.statusText}`);
  }

  return payload;
}

function extractTemplates(payload: any): GupshupTemplate[] {
  const collection =
    (Array.isArray(payload) && payload) ||
    payload?.templates ||
    payload?.data ||
    payload?.results ||
    payload?.payload ||
    [];

  if (!Array.isArray(collection)) return [];

  return collection.map((item: any) => ({
    id: String(item.id || item.templateId || item.template_id || ''),
    elementName: item.elementName || item.name || item.template_name || item.title || '',
    category: item.category || item.internalCategory || '',
    languageCode: item.languageCode || item.language || '',
    status: item.status || item.templateStatus || '',
    type: item.type || item.internalType || '',
    quality: item.quality || item.qualityRating || '',
    raw: item,
  })).filter((item) => item.id);
}

async function tryFetchTemplates(config: GupshupConfig, params: ListTemplatesParams): Promise<GupshupTemplate[]> {
  const query = new URLSearchParams();
  if (params.page != null) query.set('page', String(params.page));
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.type) query.set('type', params.type);
  if (params.quality) query.set('quality', params.quality);
  if (params.languageCode) query.set('languageCode', params.languageCode);

  const endpoints = [
    `${config.baseUrl}/wa/app/${config.appId}/templates`,
    `${config.baseUrl}/wa/app/${config.appId}/template`,
    `${config.baseUrl}/partner/app/${config.appId}/templates`,
  ];

  const suffix = query.toString() ? `?${query.toString()}` : '';
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}${suffix}`, {
        method: 'GET',
        headers: {
          apikey: config.apiKey,
          Accept: 'application/json',
        },
      });

      const payload = await readJsonOrThrow(response);
      const templates = extractTemplates(payload);
      if (templates.length > 0 || response.ok) return templates;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error('Não foi possível listar templates da Gupshup.');
}

export async function listGupshupTemplates(
  params: ListTemplatesParams = {},
  runtimeConfig?: GupshupRuntimeConfig
): Promise<GupshupTemplate[]> {
  const config = withRuntimeConfig(await getGupshupConfig(), runtimeConfig);
  ensureConfig(config);
  return tryFetchTemplates(config, params);
}

export async function sendGupshupTemplate(payload: SendTemplatePayload, runtimeConfig?: GupshupRuntimeConfig) {
  const config = withRuntimeConfig(await getGupshupConfig(), runtimeConfig);
  ensureConfig(config);

  const destination = normalizePhone(payload.destination);
  if (!destination) throw new Error('Número de destino inválido para envio de template.');

  const template = {
    id: payload.templateId,
    params: Array.isArray(payload.params) ? payload.params : [],
  };

  const body = new URLSearchParams();
  body.set('source', normalizePhone(config.source));
  body.set('destination', destination);
  body.set('template', JSON.stringify(template));
  if (payload.message) {
    body.set('message', JSON.stringify(payload.message));
  }

  const response = await fetch(`${config.baseUrl}/wa/api/v1/template/msg`, {
    method: 'POST',
    headers: {
      apikey: config.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  return readJsonOrThrow(response);
}

export function parseTemplateParams(input: string): string[] {
  return input
    .split('\n')
    .join(',')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeRecipientPhone(input: string): string {
  return normalizePhone(input);
}
