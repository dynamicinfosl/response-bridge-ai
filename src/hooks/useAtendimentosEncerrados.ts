import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AtendimentoEncerrado {
    id: string;
    id_conversa_chatwoot: string;
    id_conta_chatwoot: string | null;
    telefone: string | null;
    nome: string | null;
    status: string;
    mini_resumo: string | null;
    resolvido_por: string | null;
    satisfacao_cliente: number | null;
    tempo_medio_resposta_minutos: number | null;
    motivo_contato: string | null;
    tempo_total_atendimento: number | null;
    quantidade_mensagens: number | null;
    agente_responsavel: string | null;
    encerrado_em: string | null;
    created_at: string;
    updated_at: string;
}

export function useAtendimentosEncerrados() {
    return useQuery({
        queryKey: ['atendimentos_encerrados'],
        queryFn: async (): Promise<AtendimentoEncerrado[]> => {
            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout de 10s atingido no Supabase direto.')), 10000)
                );

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !anonKey) {
                    throw new Error('Supabase ENV não configurado');
                }

                // Usando fetch direto para contornar qualquer bug de promise-hanging do supabase-js
                const url = `${supabaseUrl}/rest/v1/atendimentos_encerrados?select=*&order=created_at.desc`;
                const supabaseReq = fetch(url, {
                    headers: {
                        'apikey': anonKey,
                        'Authorization': `Bearer ${anonKey}`,
                        'Content-Type': 'application/json'
                    }
                }).then(res => {
                    if (!res.ok) throw new Error(`Supabase HTTP Error: ${res.status}`);
                    return res.json();
                });

                const data = await Promise.race([
                    supabaseReq,
                    timeoutPromise
                ]) as any;

                return data as AtendimentoEncerrado[];
            } catch (err) {
                console.error('🚨 ERRO FATAL no useAtendimentosEncerrados:', err);
                // Retornar array vazio em vez de throw para não quebrar a UI
                return [];
            }
        },
        refetchInterval: 30000, // Atualiza a cada 30 segundos
    });
}
