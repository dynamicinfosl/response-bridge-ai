import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientIdentity {
  id: number;
  phone_number: string;
  cpf: string | null;
  cd_cliente: string | null;
  nome_mk: string;
  source: string;
  created_at?: string;
  updated_at?: string;
}

export function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@c\.us/gi, '')
    .replace(/[^\d]/g, '');
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

export function formatCPF(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) return digits;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function useClientIdentitiesForPhones(phones: string[]) {
  return useQuery({
    queryKey: ['clientIdentities', phones],
    queryFn: async () => {
      const normalized = Array.from(new Set(phones.map(normalizePhone).filter(Boolean)));
      if (normalized.length === 0) return new Map<string, ClientIdentity>();

      const { data, error } = await supabase
        .from('client_identities')
        .select('*')
        .in('phone_number', normalized);

      if (error) {
        console.error('❌ Erro ao buscar identidades de clientes:', error);
        if (error.code === '42P01') {
          console.error('💡 Tabela client_identities não existe! Execute o SQL supabase-client-identities.sql');
        }
        return new Map<string, ClientIdentity>();
      }

      const map = new Map<string, ClientIdentity>();
      (data || []).forEach((item: ClientIdentity) => {
        map.set(normalizePhone(item.phone_number), item);
      });
      return map;
    },
    enabled: phones.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveClientIdentity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      cpf,
      cdCliente,
      nomeMK,
      source = 'cpf_auto',
    }: {
      phoneNumber: string;
      cpf?: string | null;
      cdCliente?: string | null;
      nomeMK: string;
      source?: 'cpf_auto' | 'manual';
    }) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const cleanPhone = normalizePhone(phoneNumber);
      if (!cleanPhone) {
        throw new Error('Telefone inválido');
      }

      const cleanNome = nomeMK.trim();
      if (!cleanNome || cleanNome.length < 2) {
        throw new Error('Nome do MK inválido');
      }

      const cleanCpf = cpf ? cpf.replace(/\D/g, '') : null;
      const cleanCd = cdCliente ? String(cdCliente).trim() : null;

      const { data: existing, error: selectError } = await supabase
        .from('client_identities')
        .select('*')
        .eq('phone_number', cleanPhone)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar identidade existente:', selectError);
        if (selectError.code === '42P01') {
          console.error('💡 Tabela client_identities não existe! Execute o SQL supabase-client-identities.sql');
        }
        throw selectError;
      }

      if (existing) {
        const updatePayload: Record<string, string | null> = {
          nome_mk: cleanNome,
          updated_at: new Date().toISOString(),
        };
        if (cleanCpf) updatePayload.cpf = cleanCpf;
        if (cleanCd) updatePayload.cd_cliente = cleanCd;

        const { data, error } = await supabase
          .from('client_identities')
          .update(updatePayload)
          .eq('phone_number', cleanPhone)
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao atualizar identidade:', error);
          throw error;
        }
        return data as ClientIdentity;
      }

      const { data, error } = await supabase
        .from('client_identities')
        .insert({
          phone_number: cleanPhone,
          cpf: cleanCpf,
          cd_cliente: cleanCd,
          nome_mk: cleanNome,
          source,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar identidade:', error);
        if (error.code === '42P01') {
          console.error('💡 Tabela client_identities não existe! Execute o SQL supabase-client-identities.sql');
        }
        throw error;
      }
      return data as ClientIdentity;
    },
    onSuccess: (data) => {
      if (data?.phone_number) {
        queryClient.invalidateQueries({ queryKey: ['clientIdentities'] });
      }
    },
    onError: (error: unknown) => {
      console.error('❌ Erro ao salvar identidade do cliente:', error);
    },
  });
}
