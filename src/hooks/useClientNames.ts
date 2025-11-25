import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ClientName {
  id: number;
  chat_id: string;
  client_name: string;
  phone_number?: string;
  source: 'manual' | 'pushname' | 'extracted';
  created_at?: string;
  updated_at?: string;
}

// Lista de nomes inválidos que nunca devem ser salvos
const INVALID_NAMES = [
  'agente de ia', 'agente', 'ia', 'bot', 'assistente', 'sistema', 'lucas',
  'admin', 'administrador', 'user', 'usuário'
];

export function useClientNames() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todos os nomes salvos
  const { data: clientNames = [], isLoading } = useQuery({
    queryKey: ['clientNames'],
    queryFn: async () => {
      if (!user) {
        console.log('⚠️ useClientNames: Usuário não autenticado');
        return [];
      }
      
      console.log('🔍 Buscando nomes de clientes no Supabase...');
      const { data, error } = await supabase
        .from('client_names')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar nomes de clientes:', error);
        if (error.code === '42P01') {
          console.error('💡 Tabela client_names não existe! Execute o SQL supabase-client-names.sql');
        }
        return [];
      }

      console.log('✅ Nomes encontrados:', data?.length || 0);
      return (data || []) as ClientName[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Mutação para salvar/atualizar nome
  const saveNameMutation = useMutation({
    mutationFn: async ({ chatId, clientName, phoneNumber, source = 'manual' }: {
      chatId: string;
      clientName: string;
      phoneNumber?: string;
      source?: 'manual' | 'pushname' | 'extracted';
    }) => {
      if (!user) {
        console.error('❌ Tentativa de salvar nome sem usuário autenticado');
        throw new Error('Usuário não autenticado');
      }

      // Limpar e validar nome
      const cleanName = clientName.trim();
      const lowerName = cleanName.toLowerCase();

      console.log('💾 Tentando salvar nome:', { chatId, cleanName, source });

      // Não salvar se for nome inválido
      if (INVALID_NAMES.some(invalid => lowerName.includes(invalid))) {
        console.log('⚠️ Nome inválido ignorado:', cleanName);
        return null;
      }

      // Não salvar se for muito curto ou muito genérico
      if (cleanName.length < 2 || cleanName.length > 100) {
        console.log('⚠️ Nome muito curto/longo ignorado:', cleanName);
        return null;
      }

      // Limpar chatId (remover sufixos do WhatsApp)
      const cleanChatId = chatId.replace('@s.whatsapp.net', '').replace('@c.us', '').trim();

      // Verificar se já existe
      console.log('🔍 Verificando se nome já existe para chatId:', cleanChatId);
      const { data: existing, error: checkError } = await supabase
        .from('client_names')
        .select('*')
        .eq('chat_id', cleanChatId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar nome existente:', checkError);
        if (checkError.code === '42P01') {
          console.error('💡 Tabela client_names não existe! Execute o SQL supabase-client-names.sql');
          return null; // Não quebrar a aplicação
        }
        return null; // Não quebrar a aplicação
      }

      if (existing) {
        console.log('📝 Nome já existe:', existing.client_name);
        // Atualizar se o novo nome for diferente e não for inválido
        if (existing.client_name !== cleanName && !INVALID_NAMES.some(invalid => lowerName.includes(invalid))) {
          console.log('🔄 Atualizando nome existente...');
          const { data, error } = await supabase
            .from('client_names')
            .update({
              client_name: cleanName,
              phone_number: phoneNumber || cleanChatId,
              source,
              updated_at: new Date().toISOString(),
            })
            .eq('chat_id', cleanChatId)
            .select()
            .single();

          if (error) {
            console.error('❌ Erro ao atualizar nome:', error);
            return null;
          }
          console.log('✅ Nome atualizado com sucesso:', data);
          return data;
        }
        return existing;
      } else {
        // Criar novo
        console.log('➕ Criando novo nome...');
        const { data, error } = await supabase
          .from('client_names')
          .insert({
            chat_id: cleanChatId,
            client_name: cleanName,
            phone_number: phoneNumber || cleanChatId,
            source,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao criar nome:', error);
          if (error.code === '42P01') {
            console.error('💡 Tabela client_names não existe! Execute o SQL supabase-client-names.sql');
          }
          return null; // Não quebrar a aplicação
        }
        console.log('✅ Nome criado com sucesso:', data);
        return data;
      }
    },
    onSuccess: (data) => {
      console.log('✅ Nome salvo, invalidando cache...');
      queryClient.invalidateQueries({ queryKey: ['clientNames'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao salvar nome:', error);
    },
  });

  // Buscar nome por chatId
  const getNameByChatId = (chatId: string): string | null => {
    if (!chatId) return null;
    
    const cleanChatId = chatId.replace('@s.whatsapp.net', '').replace('@c.us', '').trim();
    const clientName = clientNames.find(cn => cn.chat_id === cleanChatId);
    return clientName?.client_name || null;
  };

  return {
    clientNames,
    isLoading,
    getNameByChatId,
    saveName: saveNameMutation.mutateAsync,
    saveNameSync: saveNameMutation.mutate,
    isSaving: saveNameMutation.isPending,
  };
}

