import { useQuery } from '@tanstack/react-query';

const AUDITORIA_URL =
  import.meta.env.VITE_AUDITORIA_API_URL ||
  'https://n8n-n8n-webhook.euftcp.easypanel.host/webhook/auditoria-ia-admin';

const AUDITORIA_KEY =
  import.meta.env.VITE_AUDITORIA_API_KEY || 'AdaptAuditoriaAdmin2026';

export type AchadosPorTipo = Record<string, number>;

export interface RelatorioAuditoria {
  id: number;
  gerado_em: string;
  resumo: string;
  total_conversas: number;
  total_financeiras: number;
  total_achados: number;
  achados_por_tipo: AchadosPorTipo;
  diagnostico_ia?: string | null;
  diagnostico_preview?: string | null;
}

export interface AchadoAuditoria {
  id: number;
  auditado_em: string;
  id_conversa: string;
  cliente: string;
  tipo_achado: string;
  gravidade: string;
  detalhe: string;
  trecho: string;
  ocorrido_em: string;
}

export interface TurnoConversa {
  quem: 'cliente' | 'bot' | 'tools';
  conteudo: string;
  created_at: string;
  session_id?: string;
}

export interface SupervisorIntervencao {
  id: number;
  id_conversa: string;
  telefone: string;
  setor: string;
  acao: 'corrigir' | 'bloquear_escalar' | string;
  aprovado: boolean;
  violacoes: string[];
  motivo: string;
  resposta_proposta?: string;
  resposta_final?: string;
  created_at: string;
}

export interface AuditoriaResponse {
  ok: boolean;
  gerado_em: string;
  modo: 'lista' | 'detalhe' | 'conversa';
  relatorios: RelatorioAuditoria[];
  achados: AchadoAuditoria[];
  supervisor?: SupervisorIntervencao[];
  supervisor_page?: number;
  supervisor_limite?: number;
  turnos?: TurnoConversa[];
  id_conversa?: string;
  telefone?: string;
  totais: { relatorios: number; achados: number; turnos?: number; supervisor?: number };
  error?: string;
}

async function fetchAuditoria(params: Record<string, string | number>): Promise<AuditoriaResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${AUDITORIA_URL}?${qs.toString()}`, {
      headers: {
        'x-auditoria-key': AUDITORIA_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Falha ao carregar auditoria (${res.status})`);
    }

    const data = (await res.json()) as AuditoriaResponse;
    if (!data.ok) {
      throw new Error(data.error || 'Resposta inválida da API de auditoria');
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export const SUPERVISOR_PAGE_SIZE = 20;

export function useAuditoriaLista(supervisorPage = 1) {
  return useQuery({
    queryKey: ['auditoria-ia', 'lista', supervisorPage],
    queryFn: () =>
      fetchAuditoria({
        limite_relatorios: 50,
        limite_achados: 80,
        supervisor_page: supervisorPage,
        supervisor_limite: SUPERVISOR_PAGE_SIZE,
      }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAuditoriaDetalhe(relatorioId: number | null) {
  return useQuery({
    queryKey: ['auditoria-ia', 'detalhe', relatorioId],
    queryFn: () =>
      fetchAuditoria({
        relatorio_id: relatorioId!,
        limite_achados: 300,
      }),
    enabled: !!relatorioId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAuditoriaConversa(idConversa: string | null) {
  return useQuery({
    queryKey: ['auditoria-ia', 'conversa', idConversa],
    queryFn: () =>
      fetchAuditoria({
        id_conversa: idConversa!,
      }),
    enabled: !!idConversa,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export const TIPO_ACHADO_LABEL: Record<string, string> = {
  cobranca_indevida: 'Cobrança indevida',
  resposta_repetida: 'Resposta repetida',
  duplicacao_imediata: 'Duplicação imediata',
  encaminhamento_repetido: 'Encaminhamento repetido',
  escalonamento_duplicado: 'Escalonamento duplicado',
  promessa_indevida: 'Promessa indevida',
  pix_enviado: 'Pix enviado',
  tool_falhou: 'Ferramenta falhou',
  quebra_persona: 'Quebra de persona',
  diagnostico_em_bloco: 'Diagnóstico em bloco',
  fora_do_escopo_tecnico: 'Fora do escopo técnico',
  supervisor_corrigiu: 'Supervisor corrigiu',
  supervisor_bloqueou: 'Supervisor bloqueou',
};

export const SUPERVISOR_ACAO_LABEL: Record<string, string> = {
  corrigir: 'Corrigiu resposta',
  bloquear_escalar: 'Bloqueou e escalou',
};

export const GRAVIDADE_LABEL: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};
