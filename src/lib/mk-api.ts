/**
 * Cliente das APIs MK Solutions (Adaptlink)
 * Documentação: https://mkloud.atlassian.net/wiki/spaces/MK30/pages/48699908/APIs+gerais
 */

import { getMKConfig } from './mk-config';

const MK_FETCH_TIMEOUT = 15000; // 15s — evita loading infinito se o MK não responder

async function mkFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const { baseUrl: base, token } = await getMKConfig();
  if (!base) throw new Error('URL do MK não configurada. Supabase: system_settings key "mk_base_url" ou .env VITE_MK_BASE_URL.');
  if (!token) throw new Error('Token do MK não configurado. Supabase: system_settings key "mk_token" ou .env VITE_MK_TOKEN.');

  // Em dev, base é '/api/mk' (proxy). new URL('/mk/...', base) vira /mk/... e não acerta o proxy; montamos manualmente.
  const pathNorm = path.startsWith('/') ? path : `/${path}`;
  const fullUrlStr =
    base.startsWith('http')
      ? new URL(path, base).toString()
      : `${base}${pathNorm}`;

  const url = new URL(fullUrlStr, typeof window !== 'undefined' ? window.location.origin : undefined);
  url.searchParams.set('sys', 'MK0');
  url.searchParams.set('token', token);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MK_FETCH_TIMEOUT);
  try {
    const res = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`MK API: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (!text?.trim()) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Resposta do MK não é JSON válido');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') throw new Error('A requisição ao MK demorou demais. Tente de novo.');
      throw err;
    }
    throw err;
  }
}

/** Resposta típica da consulta por documento (CPF/CNPJ) */
export interface MKClienteDoc {
  cd_cliente?: string | number;
  nome?: string;
  doc?: string;
  [key: string]: unknown;
}

/** Consulta cliente por CPF ou CNPJ (WSMKConsultaDoc) */
export async function consultaDoc(doc: string): Promise<MKClienteDoc | MKClienteDoc[]> {
  const raw = await mkFetch<MKClienteDoc | MKClienteDoc[] | { [key: string]: unknown }>(
    '/mk/WSMKConsultaDoc.rule',
    { doc: doc.replace(/\D/g, '') }
  );
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && ('cd_cliente' in raw || 'nome' in raw)) return raw as MKClienteDoc;
  if (raw && typeof raw === 'object') return [raw as MKClienteDoc];
  return {};
}

/** Consulta pessoa pelo nome (WSMKConsultaNome) */
export async function consultaNome(nome: string): Promise<MKClienteDoc | MKClienteDoc[]> {
  const raw = await mkFetch<MKClienteDoc | MKClienteDoc[] | { [key: string]: unknown }>(
    '/mk/WSMKConsultaNome.rule',
    { nome }
  );
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Array.isArray((raw as any).clientes) ? (raw as any).clientes : [raw as MKClienteDoc];
  return [];
}

/** Parâmetros para listar clientes (WSMKConsultaClientes) */
export interface MKConsultaClientesParams {
  doc?: string;
  codigo_bairro?: string;
  nome_cliente?: string;
  data_alteracao_inicio?: string;
  data_alteracao_fim?: string;
  cd_cliente_inicio?: string;
  cd_cliente_fim?: string;
  cd_cliente?: string;
}

/** Lista clientes (WSMKConsultaClientes). A API exige pelo menos um parâmetro. */
export async function consultaClientes(params: MKConsultaClientesParams = {}): Promise<MKClienteDoc[]> {
  const q: Record<string, string> = {};
  if (params.doc != null && params.doc !== '') q.doc = params.doc;
  if (params.codigo_bairro != null && params.codigo_bairro !== '') q.codigo_bairro = params.codigo_bairro;
  if (params.nome_cliente != null && params.nome_cliente !== '') q.nome_cliente = params.nome_cliente;
  if (params.data_alteracao_inicio != null && params.data_alteracao_inicio !== '') q.data_alteracao_inicio = params.data_alteracao_inicio;
  if (params.data_alteracao_fim != null && params.data_alteracao_fim !== '') q.data_alteracao_fim = params.data_alteracao_fim;
  if (params.cd_cliente_inicio != null && params.cd_cliente_inicio !== '') q.cd_cliente_inicio = params.cd_cliente_inicio;
  if (params.cd_cliente_fim != null && params.cd_cliente_fim !== '') q.cd_cliente_fim = params.cd_cliente_fim;
  if (params.cd_cliente != null && params.cd_cliente !== '') q.cd_cliente = params.cd_cliente;

  if (Object.keys(q).length === 0) {
    throw new Error('A API WSMKConsultaClientes exige pelo menos um parâmetro (ex.: nome_cliente ou doc).');
  }

  const raw = await mkFetch<MKClienteDoc[] | { clientes?: MKClienteDoc[]; data?: MKClienteDoc[]; status?: string; CODIGO_ERRO?: string; Mensagem?: string; [key: string]: unknown }>(
    '/mk/WSMKConsultaClientes.rule',
    q
  );
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (o && (o.status === 'ERRO' || o.CODIGO_ERRO)) {
    const msg = (o.Mensagem || o.message || o.msg || o.CODIGO_ERRO) as string;
    throw new Error(msg || 'Erro retornado pela API MK.');
  }
  if (Array.isArray(raw)) return raw;
  if (!o) return [];
  if (Array.isArray(o.clientes)) return o.clientes as MKClienteDoc[];
  if (Array.isArray(o.data)) return o.data as MKClienteDoc[];
  if (Array.isArray(o.resultado)) return o.resultado as MKClienteDoc[];
  if (Array.isArray(o.lista)) return o.lista as MKClienteDoc[];
  for (const key of Object.keys(o)) {
    const val = o[key];
    if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0] === 'object') {
      return val as MKClienteDoc[];
    }
  }
  if (o.cd_cliente != null || o.nome != null) return [raw as MKClienteDoc];
  return [];
}

/** Faturas pendentes do cliente (WSMKFaturasPendentes) */
export async function faturasPendentes(cd_cliente: string): Promise<{ cd_fatura?: string; [key: string]: unknown }[]> {
  const raw = await mkFetch<unknown>('/mk/WSMKFaturasPendentes.rule', { cd_cliente });
  if (Array.isArray(raw)) return raw as { cd_fatura?: string; [key: string]: unknown }[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).faturas)) return (raw as any).faturas;
  return [];
}

/** Contratos por cliente (WSMKContratosPorCliente) */
export async function contratosPorCliente(cd_cliente: string): Promise<{ [key: string]: unknown }[]> {
  const raw = await mkFetch<unknown>('/mk/WSMKContratosPorCliente.rule', { cd_cliente });
  if (Array.isArray(raw)) return raw as { [key: string]: unknown }[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).contratos)) return (raw as any).contratos;
  return [];
}

/** Conexões por cliente (WSMKConexoesPorCliente) */
export async function conexoesPorCliente(cd_cliente: string): Promise<{ [key: string]: unknown }[]> {
  const raw = await mkFetch<unknown>('/mk/WSMKConexoesPorCliente.rule', { cd_cliente });
  if (Array.isArray(raw)) return raw as { [key: string]: unknown }[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).conexoes)) return (raw as any).conexoes;
  return [];
}
