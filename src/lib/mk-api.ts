/**
 * Cliente das APIs MK Solutions (Adaptlink)
 * Documentação: https://mkloud.atlassian.net/wiki/spaces/MK30/pages/48699908/APIs+gerais
 *
 * GESTÃO DE TOKEN:
 * - Se a API retornar 401 ou 403, o cache local é invalidado e a requisição é refeita
 *   automaticamente com o token mais recente do Supabase (renovado pelo n8n a cada 24h).
 */

import { getMKConfig, invalidateMKCache } from './mk-config';

const MK_FETCH_TIMEOUT = 8000; // 8s

async function mkFetch<T>(
  path: string,
  params: Record<string, string> = {},
  retry = true // na primeira falha de autenticação, tenta uma vez com token fresco
): Promise<T> {
  console.log(`[MK Fetch Debug] Iniciando mkFetch para ${path}. Buscando getMKConfig...`);
  const { baseUrl: base, token } = await getMKConfig();
  console.log(`[MK Fetch Debug] getMKConfig retornou. baseUrl: ${base ? 'SIM' : 'NAO'}, token: ${token ? 'SIM' : 'NAO'}`);
  
  if (!base) throw new Error('URL do MK não configurada. Configure VITE_MK_BASE_URL no .env ou mk_base_url no Supabase.');
  if (!token) throw new Error('Token do MK não configurado. O n8n deve salvar o token em system_settings (key: mk_token) no Supabase.');

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
    const res: any = await Promise.race([
      fetch(url.toString(), { cache: 'no-store', signal: controller.signal }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout_MK_API')), MK_FETCH_TIMEOUT + 500)
      )
    ]);
    clearTimeout(timeoutId);

    // Se o token expirou, invalida o cache e tenta de novo com token fresco do Supabase
    if ((res.status === 401 || res.status === 403) && retry) {
      invalidateMKCache();
      return mkFetch<T>(path, params, false); // retry = false evita loop infinito
    }

    if (!res.ok) throw new Error(`MK API: ${res.status} ${res.statusText} — ${path}`);
    const text = await res.text();
    if (!text?.trim()) return {} as T;
    try {
      const parsed = JSON.parse(text);
      
      // Detecção de token expirado via payload (o MK as vezes retorna 200 OK com erro de token)
      if (parsed && typeof parsed === 'object' && parsed.status === 'ERRO') {
        const msg = String(parsed.Mensagem || parsed.message || parsed.msg || '').toLowerCase();
        if ((msg.includes('token') && (msg.includes('expirado') || msg.includes('inválido'))) && retry) {
          console.warn('[MK Fetch] Token expirado detectado no payload. Invalidando cache e tentando novamente...');
          invalidateMKCache();
          return mkFetch<T>(path, params, false);
        }
      }
      
      return parsed as T;
    } catch (e) {
      // Ignora erro de JSON parse aqui, lança erro genérico abaixo
      throw new Error(`Resposta do MK não é JSON válido. Endpoint: ${path}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') throw new Error('A requisição ao MK demorou demais (15s). Verifique a conectividade com o servidor MK.');
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
  cliente_desde?: string;
  contato_tipo_1?: string;
  contato_1?: string;
  endereco_completo?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  [key: string]: unknown;
}

/** Interface para Faturas (Financeiro) */
export interface MKInvoice {
  cd_fatura: string | number;
  data_vencimento?: string;
  data_pagamento?: string; // Para faturas pagas
  valor_fatura?: string | number;
  valor_pago?: string | number; // Para faturas pagas
  situacao?: string; // Vencida, Em Aberto, Paga
  nosso_numero?: string;
  linha_digitavel?: string;
  codigo_barra?: string;
  link_fatura?: string;
  [key: string]: unknown;
}

/** Interface para Contratos */
export interface MKContract {
  cd_contrato: string | number;
  plano_acesso?: string;
  status?: string;
  valor_contrato?: string | number;
  data_contratacao?: string;
  dia_vencimento?: string | number;
  [key: string]: unknown;
}

/** Interface para Conexões e Histórico de Conexão */
export interface MKConnection {
  cd_conexao: string | number;
  username_conexao?: string;
  mac_address?: string; // Novo
  status_conexao?: string;
  bloqueada?: string; // 'Sim' ou 'Não'
  motivo_bloqueio?: string;
  // Histórico
  data_hora_inicio?: string;
  data_hora_fim?: string;
  motivo_desconexao?: string;
  [key: string]: unknown;
}

/** Interface para Chamados/Processos */
export interface MKProcess {
  cd_processo?: string | number;
  cd_atendimento?: string | number;
  assunto?: string;
  status?: string;
  data_abertura?: string;
  data_previsao?: string;
  departamento?: string;
  tecnico?: string;
  operador?: string;
  [key: string]: unknown;
}

/* --------------------------------------------------------------------------
   FUNÇÕES DE MAPEAR DADOS CRUS PARA O PADRÃO (SE NECESSÁRIO)
   -------------------------------------------------------------------------- */

/** Função auxiliar para normalizar chaves imprevisíveis da API do MK (Clientes) */
export function mapClienteMK(raw: any): MKClienteDoc {
  if (!raw || typeof raw !== 'object') return raw;
  const cd = String(raw.cd_cliente ?? raw.cdcliente ?? raw.CodigoPessoa ?? raw.CodPessoa ?? raw.idPessoa ?? raw.id ?? '');
  const nome = String(raw.nome ?? raw.NomePessoa ?? raw.nome_cliente ?? raw.Nome ?? raw.RazaoSocial ?? raw.RazaoPessoa ?? raw.Email ?? '');
  return {
    ...raw,
    cd_cliente: cd,
    nome: nome
  };
}

/** Normaliza chaves de conexão (Muitas variações entre versões do MK) */
export function mapConnectionMK(raw: any): MKConnection {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    cd_conexao: raw.cd_conexao ?? raw.cdconexao ?? raw.id ?? '',
    username_conexao: raw.username_conexao ?? raw.login ?? raw.username ?? raw.conexao_login ?? raw.usuario ?? '',
    status_conexao: raw.status_conexao ?? raw.status ?? raw.situacao ?? raw.conexao_status ?? '',
    mac_address: raw.mac_address ?? raw.mac ?? raw.macaddress ?? raw.mac_atribuido ?? '',
    bloqueada: raw.bloqueada ?? raw.is_bloqueada ?? (raw.bloqueado === true ? 'Sim' : 'Não')
  };
}

/** Normaliza chaves de faturas */
export function mapInvoiceMK(raw: any): MKInvoice {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    cd_fatura: raw.cd_fatura ?? raw.cdfatura ?? raw.id ?? '',
    situacao: raw.situacao ?? raw.status ?? raw.status_fatura ?? '',
    valor_fatura: raw.valor_fatura ?? raw.valor ?? raw.valor_total ?? 0,
    link_fatura: raw.link_fatura ?? raw.url_fatura ?? raw.boleto_url ?? ''
  };
}

/** Consulta cliente por CPF ou CNPJ (WSMKConsultaDoc) */
export async function consultaDoc(doc: string): Promise<MKClienteDoc | MKClienteDoc[]> {
  const raw = await mkFetch<any>(
    '/mk/WSMKConsultaDoc.rule',
    { doc: doc.replace(/\D/g, '') }
  );
  if (Array.isArray(raw)) return raw.map(mapClienteMK);
  if (raw && typeof raw === 'object') {
    if ('cd_cliente' in raw || 'nome' in raw || 'CodigoPessoa' in raw) {
      return mapClienteMK(raw);
    }
    // Explora o primeiro array encontado (geralmente .clientes ou .data)
    for (const key of Object.keys(raw)) {
      if (Array.isArray(raw[key])) {
        return raw[key].map(mapClienteMK);
      }
    }
    return [mapClienteMK(raw)];
  }
  return {};
}

/** Consulta pessoa pelo nome (WSMKConsultaNome) */
export async function consultaNome(nome: string): Promise<MKClienteDoc | MKClienteDoc[]> {
  const raw = await mkFetch<any>(
    '/mk/WSMKConsultaNome.rule',
    { nome }
  );
  if (Array.isArray(raw)) return raw.map(mapClienteMK);
  if (raw && typeof raw === 'object') {
    if ('cd_cliente' in raw || 'nome' in raw || 'CodigoPessoa' in raw) {
      return mapClienteMK(raw);
    }
    // Explora o primeiro array encontado
    for (const key of Object.keys(raw)) {
      if (Array.isArray(raw[key])) {
        return raw[key].map(mapClienteMK);
      }
    }
    return [mapClienteMK(raw)];
  }
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
  if (params.doc) q.doc = params.doc;
  if (params.codigo_bairro) q.codigo_bairro = params.codigo_bairro;
  if (params.nome_cliente) q.nome_cliente = params.nome_cliente;
  if (params.data_alteracao_inicio) q.data_alteracao_inicio = params.data_alteracao_inicio;
  if (params.data_alteracao_fim) q.data_alteracao_fim = params.data_alteracao_fim;
  if (params.cd_cliente_inicio) q.cd_cliente_inicio = params.cd_cliente_inicio;
  if (params.cd_cliente_fim) q.cd_cliente_fim = params.cd_cliente_fim;
  if (params.cd_cliente) q.cd_cliente = params.cd_cliente;

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

/** Extrai silenciosamente o primeiro array encontrado no objeto, independente do nome da chave ('faturas', 'Faturas', 'lista', etc) */
function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      const val = (raw as Record<string, unknown>)[key];
      if (Array.isArray(val)) return val as T[];
    }
  }
  return [];
}

/** Gerar segunda via de fatura / boleto (WSMKSegundaViaCobranca) */
export async function segundaViaFatura(cd_fatura: string | number): Promise<any> {
  try {
    const raw = await mkFetch<any>('/mk/WSMKSegundaViaCobranca.rule', { cd_fatura: String(cd_fatura) });
    return raw;
  } catch(err) {
    console.error('Erro ao gerar segunda via:', err);
    throw err;
  }
}

/** Faturas pendentes do cliente (WSMKFaturasPendentes) */
export async function faturasPendentes(cd_cliente: string): Promise<MKInvoice[]> {
  // A API as vezes exige cd_pessoa ou cd_cliente dependendo da versão
  const raw = await mkFetch<unknown>('/mk/WSMKFaturasPendentes.rule', { cd_cliente, cd_pessoa: cd_cliente, CodigoPessoa: cd_cliente });
  return extractArray<any>(raw).map(mapInvoiceMK);
}

/** Faturas Pagas do cliente */
export async function faturasPagas(cd_cliente: string): Promise<MKInvoice[]> {
  try {
    const raw = await mkFetch<unknown>('/mk/WSMKFaturasPagas.rule', { cd_cliente, cd_pessoa: cd_cliente, CodigoPessoa: cd_cliente });
    return extractArray<any>(raw).map(mapInvoiceMK);
  } catch (err) {
    console.warn('API de Faturas Pagas não disponível ou erro:', err);
    return [];
  }
}

/** Contratos por cliente (WSMKContratosPorCliente) */
export async function contratosPorCliente(cd_cliente: string): Promise<MKContract[]> {
  const raw = await mkFetch<unknown>('/mk/WSMKContratosPorCliente.rule', { cd_cliente, cd_pessoa: cd_cliente, CodigoPessoa: cd_cliente });
  return extractArray<MKContract>(raw);
}

/** Conexões por cliente (WSMKConexoesPorCliente) */
export async function conexoesPorCliente(cd_cliente: string): Promise<MKConnection[]> {
  const raw = await mkFetch<unknown>('/mk/WSMKConexoesPorCliente.rule', { cd_cliente, cd_pessoa: cd_cliente, CodigoPessoa: cd_cliente });
  return extractArray<any>(raw).map(mapConnectionMK);
}

/** Histórico de Conexão */
export async function historicoConexao(cd_cliente: string): Promise<MKConnection[]> {
  try {
    const raw = await mkFetch<unknown>('/mk/WSMKHistoricoConexao.rule', { cd_cliente, cd_pessoa: cd_cliente, CodigoPessoa: cd_cliente });
    return extractArray<MKConnection>(raw);
  } catch(err) {
    console.warn('API de Histórico de Conexão não disponível ou erro:', err);
    return [];
  }
}

/** Processos/Chamados de Atendimento (WSMKListaProcessos) */
export async function processosAtendimento(cd_cliente: string): Promise<MKProcess[]> {
  try {
    // Tenta primeiro WSMKListaProcessos, se falhar ou não retornar, pode não suportar filtro por cliente direto, mas tentamos.
    const raw = await mkFetch<unknown>('/mk/WSMKListaProcessos.rule', { cd_cliente, cd_pessoa: cd_cliente, CodigoPessoa: cd_cliente });
    return extractArray<MKProcess>(raw);
  } catch(err) {
     console.warn('API de Processos não disponível ou erro:', err);
     return [];
  }
}
