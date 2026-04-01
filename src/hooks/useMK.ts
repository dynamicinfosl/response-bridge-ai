import { useQuery } from '@tanstack/react-query';
import type { MKClienteDoc, MKConsultaClientesParams } from '@/lib/mk-api';
import {
  consultaDoc,
  consultaNome,
  consultaClientes,
  faturasPendentes,
  contratosPorCliente,
  conexoesPorCliente,
} from '@/lib/mk-api';

/** Lista clientes MK com filtros */
export function useClientesMK(params: MKConsultaClientesParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['mk', 'clientes', params],
    queryFn: () => consultaClientes(params),
    enabled: enabled,
    staleTime: 60 * 1000,
    retry: 0, // não repetir ao falhar (ex.: token ausente) para exibir erro logo
  });
}

/** Cliente por CPF/CNPJ (normalizado para um único objeto ou primeiro do array) */
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
    staleTime: 2 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000,
  });
}

/** Resumo do cliente para o painel no atendimento: dados + faturas + contratos + conexões */
export interface MKClienteResumo {
  cliente: MKClienteDoc | null;
  faturas: { cd_fatura?: string; [key: string]: unknown }[];
  contratos: { [key: string]: unknown }[];
  conexoes: { [key: string]: unknown }[];
}

export function useClienteResumo(
  cd_cliente: string | null,
  clienteBase: MKClienteDoc | null = null,
  enabled = true
) {
  return useQuery({
    queryKey: ['mk', 'cliente-resumo', cd_cliente],
    queryFn: async (): Promise<MKClienteResumo> => {
      if (!cd_cliente) return { cliente: clienteBase || null, faturas: [], contratos: [], conexoes: [] };
      const [fat, cont, conn] = await Promise.all([
        faturasPendentes(cd_cliente),
        contratosPorCliente(cd_cliente),
        conexoesPorCliente(cd_cliente),
      ]);
      return {
        cliente: clienteBase || ({ cd_cliente } as MKClienteDoc),
        faturas: fat,
        contratos: cont,
        conexoes: conn,
      };
    },
    enabled: enabled && !!cd_cliente,
    staleTime: 60 * 1000,
  });
}
