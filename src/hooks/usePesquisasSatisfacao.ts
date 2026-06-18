import { useQuery } from '@tanstack/react-query';

export interface PesquisaSatisfacao {
  id: string;
  atendimento_encerrado_id: string | null;
  id_conversa_chatwoot: string;
  id_conta_chatwoot: string | null;
  telefone: string | null;
  nome: string | null;
  status: 'aguardando_envio' | 'enviada' | 'respondida' | 'novo_atendimento' | 'expirada';
  nota: number | null;
  resposta_texto: string | null;
  survey_sent_at: string | null;
  bloqueado_ate: string;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePesquisasSatisfacao() {
  return useQuery({
    queryKey: ['pesquisas_satisfacao'],
    queryFn: async (): Promise<PesquisaSatisfacao[]> => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
          throw new Error('Supabase ENV não configurado');
        }

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de 10s atingido ao buscar pesquisas de satisfação.')), 10000)
        );

        const req = fetch(`${supabaseUrl}/rest/v1/pesquisas_satisfacao?select=*&order=created_at.desc`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
        }).then(res => {
          if (!res.ok) throw new Error(`Supabase HTTP Error: ${res.status}`);
          return res.json();
        });

        return await Promise.race([req, timeoutPromise]) as PesquisaSatisfacao[];
      } catch (err) {
        console.error('🚨 ERRO ao buscar pesquisas de satisfação:', err);
        return [];
      }
    },
    refetchInterval: 30000,
  });
}
