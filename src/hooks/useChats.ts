import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatwootAPI, type ChatwootConversation, type ChatwootMessage } from '../lib/chatwoot';
import type { Chat, Message, SendMessagePayload } from '../lib/api';
import { supabase } from '../lib/supabase';

// Adaptadores para manter compatibilidade com a UI existente

// Helper para traduzir mensagens internas do sistema sem expor o conceito de "etiquetas"
const translateSystemMessage = (content: string): string => {
  if (!content) return '';
  const lower = content.toLowerCase();
  
  if (lower.includes(' adicionou ')) {
    if (lower.includes('precisa_atendimento')) return 'Intervenção humana solicitada';
    if (lower.includes('agente-off')) return 'Atendimento inteligente pausado';
    return 'Configuração do atendimento atualizada';
  }
  
  if (lower.includes(' removeu ')) {
    if (lower.includes('precisa_atendimento')) return 'Alerta de intervenção encerrado';
    if (lower.includes('agente-off')) return 'Atendimento inteligente reativado';
    return 'Configuração do atendimento atualizada';
  }
  
  if (lower.includes(' atribuiu ') || lower.includes(' assigned ')) {
    return 'Atendimento transferido de operador';
  }
  
  if (lower.includes('marcado como resolvido') || lower.includes('marked as resolved')) {
    return 'Atendimento finalizado com sucesso';
  }
  
  return 'Ação do sistema registrada';
};

const mapChatwootToChat = (conv: any): Chat => {
  const contact = conv.contact || conv.meta?.sender || {};
  const phone = contact.phone_number || contact.phone || '';
  const name = contact.name || contact.pushName || contact.pushname || '';

  // Tenta extrair timestamp mais recente
  // No Chatwoot, timestamps podem ser segundos ou ISO strings
  const getISO = (val: any) => {
    if (!val) return null;
    if (typeof val === 'number') return new Date(val * 1000).toISOString();
    try {
      return new Date(val).toISOString();
    } catch {
      return null;
    }
  };

  const timestamp = getISO(conv.contact_last_seen_at) ||
    getISO(conv.updated_at) ||
    getISO(conv.created_at) ||
    new Date().toISOString();

  const lastMsg = conv.messages?.[0] || conv.last_non_activity_message || null;
  let lastMsgContent = lastMsg?.content || '';

  // Prepara preview textual baseado em anexos ou mensagens de sistema
  if (lastMsg?.message_type === 2) {
    lastMsgContent = translateSystemMessage(lastMsgContent);
  } else if (lastMsg?.attachments?.length > 0) {
    const fileType = lastMsg.attachments[0].file_type || '';
    let prefix = '📄 Documento';
    if (fileType === 'image') prefix = '📷 Foto';
    else if (fileType === 'video') prefix = '🎥 Vídeo';
    else if (fileType === 'audio') prefix = '🎵 Áudio';

    lastMsgContent = lastMsgContent.trim() ? `${prefix} - ${lastMsgContent}` : prefix;
  }

  const lastMsgSender = lastMsg ? (lastMsg.message_type === 0 ? 'user' : 'agent') : undefined;

  return {
    id: conv.id.toString(),
    phone: phone,
    client: name,
    clientPhone: phone,
    status: conv.status === 'open' ? 'active' : conv.status === 'pending' ? 'pendente' : 'concluido',
    lastMessage: lastMsgContent,
    lastMessageSender: lastMsgSender as any,
    time: timestamp,
    unread: conv.unread_count || 0,
    attendant: conv.meta?.assignee?.name,
    labels: conv.labels || [],
    assigneeId: conv.meta?.assignee?.id,
    createdAt: getISO(conv.created_at) || timestamp,
    updatedAt: getISO(conv.updated_at) || timestamp,
  };
};

const mapChatwootToMessage = (msg: ChatwootMessage): Message => {
  const attachment = msg.attachments && msg.attachments.length > 0 ? msg.attachments[0] : null;
  let type: 'text' | 'document' | 'audio' | 'image' | 'video' = 'text';
  let media = undefined;

  if (attachment) {
    if (attachment.file_type === 'audio') {
      type = 'audio';
    } else if (attachment.file_type === 'image') {
      type = 'image';
    } else if (attachment.file_type === 'video') {
      type = 'video';
    } else {
      type = 'document';
    }
    // Tenta extrair um nome real se o Chatwoot retornar apenas o tipo genérico
    let fileName = attachment.file_name || attachment.file_type || 'document';
    
    if ((fileName === 'file' || !fileName.includes('.')) && attachment.data_url) {
      try {
        const urlPart = attachment.data_url.split('/').pop()?.split('?')[0];
        if (urlPart && urlPart.includes('.')) {
          fileName = decodeURIComponent(urlPart);
        }
      } catch (e) { /* ignore */ }
    }

    media = {
      url: attachment.data_url,
      name: fileName,
    };
  }

    // Define o sender. message_type === 2 indica mensagem de "Atividade" (sistema)
    let finalSender: 'user' | 'agent' | 'activity' = msg.message_type === 0 ? 'user' : 'agent';
    
    // Processamento do texto para mensagens de Atividade do sistema
    let finalContent = msg.content || '';
    if (msg.message_type === 2) {
      finalSender = 'activity';
      finalContent = translateSystemMessage(finalContent);
    }

    return {
      id: msg.id.toString(),
      chatId: msg.conversation_id.toString(),
      content: finalContent,
      sender: finalSender,
      type,
      media,
      timestamp: new Date(msg.created_at * 1000).toISOString(),
      read: true,
    };
};

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      try {
        // console.log('🔄 Buscando chats (Chatwoot) e resumos (Supabase)...');

        // Timeout para evitar travamentos silenciosos de rede
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de 10s atingido nas requisições do painel.')), 10000)
        );

        // Criando requests via fetch direto para evitar problemas de Promise de bibliotecas
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const chatwootUrl = `/api/chatwoot/api/v1/accounts/${import.meta.env.VITE_CHATWOOT_ACCOUNT_ID}/conversations?status=all`;


        const chatwootFetch = fetch(chatwootUrl, {
          headers: {
            'api_access_token': import.meta.env.VITE_CHATWOOT_API_TOKEN as string,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json());

        const supabaseFetch = fetch(`${supabaseUrl}/rest/v1/atendimentos_encerrados?select=id_conversa_chatwoot,mini_resumo`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json().catch(() => []));

        const escaladosFetch = fetch(`${supabaseUrl}/rest/v1/atendimentos_escalados?select=id_conversa_chatwoot,mini_resumo`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json().catch(() => []));

        const [response, encerrados, escalados] = await Promise.race([
          Promise.all([chatwootFetch, supabaseFetch, escaladosFetch]),
          timeoutPromise
        ]) as [any, any[], any[]];

        // console.log('✅ Resposta Fetch Raw resolvida!');

        // Chatwoot retorna { data: { payload: [...] } } via proxy/vite
        let conversations: any[] = [];
        if (Array.isArray(response)) {
          conversations = response;
        } else if (response && typeof response === 'object') {
          const anyResponse = response as any;
          conversations = anyResponse.data?.payload || anyResponse.payload || (Array.isArray(anyResponse.data) ? anyResponse.data : []);
        }

        if (!Array.isArray(conversations)) {
          console.error('❌ Chatwoot data is not an array:', response);
          return [];
        }

        const mapeados = conversations.map(conv => {
          const mappedChat = mapChatwootToChat(conv);

          // Injetar resumo da IA quando a conversa estiver concluída
          if (encerrados && encerrados.length > 0) {
            const enc = encerrados.find((e: any) => e.id_conversa_chatwoot === mappedChat.id);
            if (enc && enc.mini_resumo) {
              if (mappedChat.status === 'concluido') {
                mappedChat.lastMessage = `[Resumo IA] ${enc.mini_resumo}`;
              }
            }
          }
          
          // Injetar resumo de escalonamento para o popup
          if (escalados && escalados.length > 0) {
            const esc = escalados.find((e: any) => e.id_conversa_chatwoot === mappedChat.id);
            if (esc && esc.mini_resumo && mappedChat.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento')) {
              mappedChat.escalationSummary = esc.mini_resumo;
            }
          }

          return mappedChat;
        });

        // console.log('📊 Total de chats mapeados:', mapeados.length);
        return mapeados;
      } catch (err) {
        console.error('🚨 ERRO FATAL no queryFn do useChats:', err);
        // Em vez de throw err (que causa loading infinito e quebra UI caso falhe), retorna fallback.
        return [];
      }
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useMessages(chatId: string | null) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const response = await chatwootAPI.getMessages(Number(chatId));
      // Chatwoot retorna { payload: [...] } ou { data: { payload: [...] } } via proxy
      const messages = (response as any).data?.payload || (response as any).payload || (Array.isArray(response) ? response : []);

      if (!Array.isArray(messages)) {
        console.error('Chatwoot messages is not an array:', response);
        return [];
      }

      return messages.map(mapChatwootToMessage).sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
    enabled: !!chatId,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendMessagePayload) => {
      // 1. Enviar a mensagem (via n8n/API principal)
      // Nota: o messagesAPI.send já faz internamente o fetch para o endpoint de envio
      const response = await chatwootAPI.sendMessage(Number(data.chatId), data.content);

      // 2. Gerenciamento de etiquetas (se necessário)
      const hasNeedsHuman = data.labels?.some(l => l.toLowerCase() === 'precisa_atendimento');
      
      if (hasNeedsHuman) {
        console.log('🔄 Detectada necessidade de intervenção humana. Limpando etiquetas...');
        // Filtra 'precisa_atendimento' e garante 'agente-off'
        const baseLabels = data.labels || [];
        const filteredLabels = baseLabels.filter(l => l.toLowerCase() !== 'precisa_atendimento');
        
        // Adiciona agente-off se não existir
        if (!filteredLabels.some(l => l.toLowerCase() === 'agente-off')) {
          filteredLabels.push('agente-off');
        }

        try {
          await chatwootAPI.addLabel(Number(data.chatId), filteredLabels);
          console.log('✅ Etiquetas atualizadas com sucesso: agente-off adicionada, precisa_atendimento removida');
        } catch (labelError) {
          console.error('❌ Erro ao atualizar etiquetas no Chatwoot:', labelError);
          // Não falha a mutação inteira se apenas a etiqueta falhar
        }
      }

      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useUpdateChatStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      chatwootAPI.updateStatus(Number(id), status === 'active' ? 'open' : status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}


export function useReactivateAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, labels }: { id: string; labels: string[] }) => {
      const filteredLabels = (labels || []).filter(l => 
        l.toLowerCase() !== 'precisa_atendimento' && 
        l.toLowerCase() !== 'agente-off'
      );
      
      return chatwootAPI.addLabel(Number(id), filteredLabels);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.id] });
    },
  });
}

export function useInterveneChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, labels }: { id: string; labels: string[] }) => {
      const updatedLabels = [...(labels || [])];
      
      // Adiciona etiqueta de intervenção humana (alerta vermelho)
      if (!updatedLabels.some(l => l.toLowerCase() === 'precisa_atendimento')) {
        updatedLabels.push('precisa_atendimento');
      }
      
      // Adiciona etiqueta para parar a IA
      if (!updatedLabels.some(l => l.toLowerCase() === 'agente-off')) {
        updatedLabels.push('agente-off');
      }
      
      return chatwootAPI.addLabel(Number(id), updatedLabels);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.id] });
    },
  });
}

export function useTakeOverChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, labels }: { id: string; labels: string[] }) => {
      // Remove etiqueta de intervenção humana
      const filteredLabels = (labels || []).filter(l => 
        l.toLowerCase() !== 'precisa_atendimento'
      );
      
      // Garante que a IA fique parada enquanto o humano atende
      if (!filteredLabels.some(l => l.toLowerCase() === 'agente-off')) {
        filteredLabels.push('agente-off');
      }
      
      return chatwootAPI.addLabel(Number(id), filteredLabels);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.id] });
    },
  });
}

export function useTransferChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attendantId }: { id: string; attendantId: string }) =>
      chatwootAPI.assignAgent(Number(id), Number(attendantId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useCloseChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; reason?: string }) =>
      chatwootAPI.updateStatus(Number(id), 'resolved'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatwootAPI.markAsRead(Number(chatId)),
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

