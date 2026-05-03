import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatwootAPI, type ChatwootConversation, type ChatwootMessage } from '../lib/chatwoot';
import type { Chat, Message, SendMessagePayload } from '../lib/api';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';

// Adaptadores para manter compatibilidade com a UI existente

const formatUserArea = (area?: string | null) => {
  if (!area) return '';
  const normalized = area.toLowerCase().trim();
  if (normalized === 'tecnica' || normalized === 'tecnico') return 'Técnico';
  if (normalized === 'comercial') return 'Comercial';
  if (normalized === 'financeiro') return 'Financeiro';
  return area;
};

const fetchJsonWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const safeFetchArray = async (url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<any[]> => {
  try {
    const data = await fetchJsonWithTimeout(url, init, timeoutMs);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`❌ Erro ao buscar ${url}:`, error);
    return [];
  }
};

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

  if (lower.includes('atribuído a') || lower.includes(' atribuiu ') || lower.includes(' assigned ')) {
    // Tenta extrair quem recebeu a atribuição (o operador que interviu)
    // Padrão: "Atribuído a [Operador] por [Administrador]"
    const matchBy = content.match(/atribuído a (.*) por (.*)/i);
    if (matchBy) return `${matchBy[1]} interviu em uma conversa`;

    // Padrão: "Atribuído a [Operador]"
    const matchSimple = content.match(/atribuído a (.*)/i);
    if (matchSimple) return `${matchSimple[1]} interviu em uma conversa`;

    // Padrão: "[Administrador] atribuiu a conversa a [Operador]"
    const matchAtribuiu = content.match(/(.*) atribuiu a conversa a (.*)/i);
    if (matchAtribuiu) return `${matchAtribuiu[2]} interviu em uma conversa`;

    return 'Atendimento transferido de operador';
  }

  if (lower.includes('marcado como resolvido') || lower.includes('marked as resolved')) {
    return 'Atendimento finalizado com sucesso';
  }

  // Se não reconhecer o padrão, retorna o texto original para não perder informações vitais (como resumos de IA)
  return content;
};

const mapChatwootToChat = (conv: any): Chat => {
  const contact = conv.contact || conv.meta?.sender || {};
  const phone = contact.phone_number || contact.phone || '';
  const name = contact.name || contact.pushName || contact.pushname || '';
  const assignee = conv.meta?.assignee || conv.assignee || null;
  const rawAssigneeId = assignee?.id ?? conv.meta?.assignee_id ?? conv.assignee_id;
  const assigneeId = rawAssigneeId !== undefined && rawAssigneeId !== null && rawAssigneeId !== ''
    ? Number(rawAssigneeId)
    : undefined;
  const assigneeName = assignee?.name || conv.meta?.assignee_name || conv.assignee_name;

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
    if (fileType === 'image') prefix = '📷 Imagem';
    else if (fileType === 'video') prefix = '🎥 Vídeo';
    else if (fileType === 'audio') prefix = '🎵 Áudio';

    // Se o conteúdo for apenas um rótulo automático de mídia, não duplica
    const mediaLabels = ['imagem', 'foto', 'mensagem de voz', 'vídeo', 'video', 'arquivo pdf', 'figurinha', 'mídia', 'midia', 'áudio', 'audio', 'documento'];
    const trimmed = lastMsgContent.trim();
    const isMediaLabel = trimmed && mediaLabels.includes(trimmed.toLowerCase());

    lastMsgContent = trimmed && !isMediaLabel ? `${prefix} - ${trimmed}` : prefix;
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
    attendant: assigneeName,
    labels: conv.labels || [],
    assigneeId: Number.isFinite(assigneeId) ? assigneeId : undefined,
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
    if (msg.private) {
      // Notas privadas (como o Resumo da IA) não devem ser tratadas como "atividade" simples
      finalSender = 'agent';
      finalContent = msg.content || '';
    } else {
      finalSender = 'activity';
      finalContent = translateSystemMessage(finalContent);
    }
  } else if (msg.private) {
    finalSender = 'agent';
    finalContent = msg.content || '';
  }

  // Extrair nome do agente que enviou (message_type 1 = outgoing)
  const senderName = (msg.message_type === 1 && msg.sender?.name) ? msg.sender.name : undefined;

  return {
    id: msg.id.toString(),
    chatId: msg.conversation_id.toString(),
    content: finalContent,
    sender: finalSender,
    senderName,
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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const chatwootBaseUrl = `/api/chatwoot/api/v1/accounts/${import.meta.env.VITE_CHATWOOT_ACCOUNT_ID}`;
        const chatwootHeaders = {
          'api_access_token': import.meta.env.VITE_CHATWOOT_API_TOKEN as string,
          'Content-Type': 'application/json'
        };
        const supabaseHeaders = {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        };

        // ---------- Paginação completa do Chatwoot (últimas 24h) ----------
        const cutoff24h = Date.now() - (24 * 60 * 60 * 1000);
        const MAX_PAGES = 10;
        const chatwootStartedAt = Date.now();

        const fetchAllChatwootConversations = async (): Promise<any[]> => {
          let allConversations: any[] = [];
          for (let page = 1; page <= MAX_PAGES; page++) {
            if (Date.now() - chatwootStartedAt > 12000) {
              break;
            }

            const url = `${chatwootBaseUrl}/conversations?status=all&page=${page}`;
            let json: any;

            try {
              json = await fetchJsonWithTimeout(url, { headers: chatwootHeaders }, 6000);
            } catch (error) {
              console.error(`❌ Erro ao buscar conversas do Chatwoot na página ${page}:`, error);
              break;
            }

            let pageConversations: any[] = [];
            if (Array.isArray(json)) {
              pageConversations = json;
            } else if (json && typeof json === 'object') {
              pageConversations = json.data?.payload || json.payload || (Array.isArray(json.data) ? json.data : []);
            }

            if (!Array.isArray(pageConversations) || pageConversations.length === 0) break;

            allConversations = [...allConversations, ...pageConversations];

            // Verificar se a conversa mais antiga desta página é > 24h
            const oldest = pageConversations[pageConversations.length - 1];
            const oldestUpdated = oldest?.last_activity_at || oldest?.updated_at || oldest?.created_at;
            if (oldestUpdated) {
              const oldestTime = typeof oldestUpdated === 'number'
                ? oldestUpdated * 1000
                : new Date(oldestUpdated).getTime();
              if (oldestTime < cutoff24h) break;
            }

            // Se retornou menos que uma página completa (25), não há mais páginas
            if (pageConversations.length < 25) break;
          }
          return allConversations;
        };

        // ---------- Buscar tudo em paralelo ----------
        const chatwootFetch = fetchAllChatwootConversations();

        const supabaseFetch = safeFetchArray(`${supabaseUrl}/rest/v1/atendimentos_encerrados?select=id_conversa_chatwoot,mini_resumo`, {
          headers: supabaseHeaders
        }, 6000);

        const escaladosFetch = safeFetchArray(`${supabaseUrl}/rest/v1/atendimentos_escalados?select=id_conversa_chatwoot,mini_resumo`, {
          headers: supabaseHeaders
        }, 6000);

        const usersFetch = safeFetchArray(`${supabaseUrl}/rest/v1/users?select=full_name,area,chatwoot_id&chatwoot_id=not.is.null`, {
          headers: supabaseHeaders
        }, 6000);

        // Fetch dos dados de monitoramento (tempo de resposta)
        const monitorFetch = safeFetchArray(`${supabaseUrl}/rest/v1/conversas_monitor?select=conversation_id,waiting_since,waiting_minutes,atendente_tipo,atendente_nome,status_alerta&auto_closed=eq.false`, {
          headers: supabaseHeaders
        }, 6000);

        const [conversations, encerrados, escalados, users, monitorData] = await Promise.all([
          chatwootFetch,
          supabaseFetch,
          escaladosFetch,
          usersFetch,
          monitorFetch,
        ]) as [any[], any[], any[], any[], any[]];

        if (!Array.isArray(conversations)) {
          console.error('❌ Chatwoot data is not an array:', conversations);
          return [];
        }

        // Filtrar conversas concluídas > 24h (manter abertas independente da idade)
        const filteredConversations = conversations.filter(conv => {
          const status = conv.status;
          if (status === 'open' || status === 'pending') return true; // Sempre mostra abertas
          const updatedAt = conv.last_activity_at || conv.updated_at || conv.created_at;
          if (!updatedAt) return true;
          const updatedTime = typeof updatedAt === 'number' ? updatedAt * 1000 : new Date(updatedAt).getTime();
          return updatedTime >= cutoff24h;
        });

        const usersByChatwootId = new Map(
          (users || [])
            .filter((user: any) => user?.chatwoot_id)
            .map((user: any) => [String(user.chatwoot_id), user])
        );

        // Montar mapa de monitoramento por conversation_id
        const monitorMap = new Map(
          (monitorData || [])
            .filter((m: any) => m?.conversation_id)
            .map((m: any) => [String(m.conversation_id), m])
        );

        const mapeados = filteredConversations.map(conv => {
          const mappedChat = mapChatwootToChat(conv);
          const assignedUser = mappedChat.assigneeId ? usersByChatwootId.get(String(mappedChat.assigneeId)) : null;

          if (assignedUser) {
            mappedChat.attendant = mappedChat.attendant || assignedUser.full_name || undefined;
            mappedChat.attendantArea = formatUserArea(assignedUser.area);
          }

          // Injetar resumo da IA quando a conversa estiver concluída
          if (encerrados && encerrados.length > 0) {
            const enc = encerrados.find((e: any) => String(e.id_conversa_chatwoot) === String(mappedChat.id));
            if (enc && enc.mini_resumo) {
              if (mappedChat.status === 'concluido') {
                mappedChat.lastMessage = `[Resumo IA] ${enc.mini_resumo}`;
              }
            }
          }

          // Injetar resumo de escalonamento para o popup
          if (escalados && escalados.length > 0) {
            const esc = escalados.find((e: any) => String(e.id_conversa_chatwoot) === String(mappedChat.id));
            if (esc && esc.mini_resumo && mappedChat.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento')) {
              mappedChat.escalationSummary = esc.mini_resumo;
            }
          }

          // Enriquecer com dados de monitoramento (tempo de resposta)
          const monitor = monitorMap.get(mappedChat.id);
          if (monitor) {
            mappedChat.waitingSince = monitor.waiting_since || undefined;
            mappedChat.waitingMinutes = monitor.waiting_minutes || 0;
            mappedChat.statusAlerta = monitor.status_alerta || 'normal';
            mappedChat.atendenteTipo = monitor.atendente_tipo || 'nenhum';
          }

          return mappedChat;
        });

        return mapeados;
      } catch (err) {
        console.error('🚨 ERRO FATAL no queryFn do useChats:', err);
        return [];
      }
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useMessages(chatId: string | null) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const [response, usersResp] = await Promise.all([
        chatwootAPI.getMessages(Number(chatId)),
        fetch(`${supabaseUrl}/rest/v1/users?select=full_name,chatwoot_id&chatwoot_id=not.is.null`, {
          headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
        }).then(r => r.json().catch(() => [])),
      ]);

      // Set de chatwoot_ids de humanos para diferenciar do bot
      const humanChatwootIds = new Set<string>(
        (usersResp || []).filter((u: any) => u?.chatwoot_id).map((u: any) => String(u.chatwoot_id))
      );
      // Mapa chatwoot_id -> full_name (nome real do Supabase)
      const humanNameById = new Map<string, string>(
        (usersResp || []).filter((u: any) => u?.chatwoot_id && u?.full_name).map((u: any) => [String(u.chatwoot_id), u.full_name])
      );

      // Chatwoot retorna { payload: [...] } ou { data: { payload: [...] } } via proxy
      const messages = (response as any).data?.payload || (response as any).payload || (Array.isArray(response) ? response : []);

      if (!Array.isArray(messages)) {
        console.error('Chatwoot messages is not an array:', response);
        return [];
      }

      return messages.map((msg: any) => {
        const mapped = mapChatwootToMessage(msg);
        // Sobrescreve senderName: só mostra se o sender.id for um humano real do Supabase
        if (msg.message_type === 1 && msg.sender?.id) {
          const sid = String(msg.sender.id);
          if (humanChatwootIds.has(sid)) {
            mapped.senderName = humanNameById.get(sid) || msg.sender.name;
          } else {
            mapped.senderName = undefined; // bot — não exibir nome
          }
        }
        return mapped;
      }).sort((a: any, b: any) =>
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
    mutationFn: async (data: { chatId: string; content: string; labels?: string[]; operatorChatwootId?: number | string; currentAssigneeId?: number }) => {
      // 1. Enviar a mensagem
      const response = await chatwootAPI.sendMessage(Number(data.chatId), data.content);

      // 2. Auto-atribuir operador se conversa não tem assignee
      const numericOperatorId = Number(data.operatorChatwootId);
      const shouldAutoAssign = !data.currentAssigneeId && Number.isFinite(numericOperatorId) && numericOperatorId > 0;

      if (shouldAutoAssign) {
        try {
          await chatwootAPI.assignAgent(Number(data.chatId), numericOperatorId);
          console.log('✅ Operador auto-atribuído à conversa:', data.chatId);
        } catch (err) {
          console.error('❌ Erro ao auto-atribuir operador:', err);
        }
      }

      // 3. Gerenciamento de etiquetas
      const labels = data.labels || [];
      const hasNeedsHuman = labels.some(l => l.toLowerCase() === 'precisa_atendimento');

      if (hasNeedsHuman || shouldAutoAssign) {
        const filteredLabels = labels.filter(l => l.toLowerCase() !== 'precisa_atendimento');
        if (!filteredLabels.some(l => l.toLowerCase() === 'agente-off')) {
          filteredLabels.push('agente-off');
        }
        try {
          await chatwootAPI.addLabel(Number(data.chatId), filteredLabels);
        } catch (labelError) {
          console.error('❌ Erro ao atualizar etiquetas no Chatwoot:', labelError);
        }
      }

      return response;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && anonKey) {
          await fetch(`${supabaseUrl}/rest/v1/conversas_monitor?conversation_id=eq.${variables.chatId}`, {
            method: 'PATCH',
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status_alerta: 'normal',
              waiting_minutes: 0,
              waiting_since: null,
              updated_at: new Date().toISOString()
            })
          });
        }
      } catch (e) { console.error(e); }
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
      logAuditAction('chat_reactivate_ai', { chatId: variables.id }, 'chat', variables.id);
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
      logAuditAction('chat_intervene', { chatId: variables.id }, 'chat', variables.id);
    },
  });
}

export function useTakeOverChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, labels, attendantId }: { id: string; labels: string[]; attendantId?: string | number | null }) => {
      // Remove etiqueta de intervenção humana
      const filteredLabels = (labels || []).filter(l =>
        l.toLowerCase() !== 'precisa_atendimento'
      );

      // Garante que a IA fique parada enquanto o humano atende
      if (!filteredLabels.some(l => l.toLowerCase() === 'agente-off')) {
        filteredLabels.push('agente-off');
      }

      await chatwootAPI.addLabel(Number(id), filteredLabels);

      const numericAttendantId = Number(attendantId);
      if (Number.isFinite(numericAttendantId) && numericAttendantId > 0) {
        await chatwootAPI.assignAgent(Number(id), numericAttendantId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.id] });
      logAuditAction('chat_takeover', { chatId: variables.id }, 'chat', variables.id);
    },
  });
}

export function useTransferChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attendantId }: { id: string; attendantId: string }) =>
      chatwootAPI.assignAgent(Number(id), Number(attendantId)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      logAuditAction('chat_transfer', { chatId: variables.id, attendantId: variables.attendantId }, 'chat', variables.id);
    },
  });
}

export function useCloseChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, labels }: { id: string; reason?: string; labels?: string[] }) => {
      // 1. Atualizar status para resolved
      await chatwootAPI.updateStatus(Number(id), 'resolved');

      // 2. Remover etiquetas de estado e setor para "resetar" o cliente
      const labelsToRemove = ['agente-off', 'precisa_atendimento', 'comercial', 'financeiro', 'tecnico'];
      const filteredLabels = (labels || []).filter(l => {
        const normalized = l.toLowerCase();
        return !labelsToRemove.some(toRemove => normalized.includes(toRemove));
      });

      // Se houver labels diferentes das removidas, mantém-as. Senão, envia array vazio (remove todas)
      await chatwootAPI.addLabel(Number(id), filteredLabels);

      return { id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      logAuditAction('chat_close_manual', { chatId: variables.id, reason: variables.reason }, 'chat', variables.id);
    },
  });
}

export function useSendAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, file, content = '', operatorChatwootId, currentAssigneeId, labels }: { chatId: string; file: File; content?: string; operatorChatwootId?: number | string; currentAssigneeId?: number; labels?: string[] }) => {
      const response = await chatwootAPI.sendAttachment(Number(chatId), file, content);

      // Auto-atribuir operador se conversa não tem assignee
      const numericOperatorId = Number(operatorChatwootId);
      const shouldAutoAssign = !currentAssigneeId && Number.isFinite(numericOperatorId) && numericOperatorId > 0;

      if (shouldAutoAssign) {
        try {
          await chatwootAPI.assignAgent(Number(chatId), numericOperatorId);
          const currentLabels = labels || [];
          const filteredLabels = currentLabels.filter(l => l.toLowerCase() !== 'precisa_atendimento');
          if (!filteredLabels.some(l => l.toLowerCase() === 'agente-off')) {
            filteredLabels.push('agente-off');
          }
          await chatwootAPI.addLabel(Number(chatId), filteredLabels);
        } catch (err) {
          console.error('❌ Erro ao auto-atribuir operador no envio de anexo:', err);
        }
      }

      return response;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && anonKey) {
          await fetch(`${supabaseUrl}/rest/v1/conversas_monitor?conversation_id=eq.${variables.chatId}`, {
            method: 'PATCH',
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status_alerta: 'normal',
              waiting_minutes: 0,
              waiting_since: null,
              updated_at: new Date().toISOString()
            })
          });
        }
      } catch (e) { console.error(e); }
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

