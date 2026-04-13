import { useQuery } from '@tanstack/react-query';
import type { 
  MKClienteDoc, 
  MKConsultaClientesParams,
  MKInvoice,
  MKContract,
  MKConnection
} from '@/lib/mk-api';
import {
  consultaDoc,
  consultaNome,
  consultaClientes,
  faturasPendentes,
  faturasPagas,
  contratosPorCliente,
  conexoesPorCliente,
  historicoConexao,
  processosAtendimento,
} from '@/lib/mk-api';

/** Lista clientes MK com filtros */
export function useClientesMK(params: MKConsultaClientesParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['mk', 'clientes', params],
    queryFn: () => consultaClientes(params),
    enabled: enabled,
    staleTime: 60 * 1000,
    retry: 0,
  });
}

/** Cliente por CPF/CNPJ */
export function useClienteByDoc(doc: string | null, enabled = true) {
  return useQuery({
    queryKey: ['mk', 'cliente-doc', doc],
    queryFn: async () => {
      if (!doc?.trim()) return null;
      const r = await consultaDoc(doc);
      const arr = Array.isArray(r) ? r : r ? [r] : [];
      return arr.length ? arr[0] : null;
    },
    enabled: enabled && !!doc?.trim(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Cliente(s) por nome */
export function useClienteByNome(nome: string | null, enabled = true) {
  return useQuery({
    queryKey: ['mk', 'cliente-nome', nome],
    queryFn: async () => {
      if (!nome?.trim()) return [];
      const r = await consultaNome(nome);
      return Array.isArray(r) ? r : r ? [r] : [];
    },
    enabled: enabled && !!nome?.trim(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Resumo do cliente para o painel: dados + faturas + contratos + conexões */
export interface MKClienteResumo {
  cliente: MKClienteDoc | null;
  faturas: MKInvoice[];
  faturas_pagas: MKInvoice[];
  contratos: MKContract[];
  conexoes: MKConnection[];
  historico_conexao: MKConnection[];
  processos: import('@/lib/mk-api').MKProcess[];
}

export function useClienteResumo(
  cd_cliente: string | null,
  clienteBase: MKClienteDoc | null = null,
  enabled = true
) {
  return useQuery({
    queryKey: ['mk', 'cliente-resumo', cd_cliente],
    queryFn: async (): Promise<MKClienteResumo> => {
      if (!cd_cliente) return { cliente: clienteBase || null, faturas: [], faturas_pagas: [], contratos: [], conexoes: [], historico_conexao: [], processos: [] };
      
      // Busca detalhes completos do cliente se não tivermos
      let fullCliente = clienteBase;
      if (!fullCliente?.endereco_completo) {
        try {
          const results = await consultaClientes({ cd_cliente });
          if (results.length) fullCliente = results[0];
        } catch (e) {
          console.error('Erro ao buscar detalhes do cliente MK:', e);
        }
      }

      const [fat, fatPagas, cont, conn, histConn, proc] = await Promise.all([
        faturasPendentes(cd_cliente),
        faturasPagas(cd_cliente),
        contratosPorCliente(cd_cliente),
        conexoesPorCliente(cd_cliente),
        historicoConexao(cd_cliente),
        processosAtendimento(cd_cliente)
      ]);

      return {
        cliente: fullCliente || clienteBase || ({ cd_cliente } as MKClienteDoc),
        faturas: fat,
        faturas_pagas: fatPagas,
        contratos: cont,
        conexoes: conn,
        historico_conexao: histConn,
        processos: proc,
      };
    },
    enabled: enabled && !!cd_cliente,
    staleTime: 60 * 1000,
  });
}
