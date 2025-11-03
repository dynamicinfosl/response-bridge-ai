import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsAPI, messagesAPI, type SendMessagePayload } from '../lib/api';

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: chatsAPI.getAll,
    refetchInterval: 3000, // Atualiza a cada 3 segundos
    staleTime: 0, // Dados sempre considerados stale (obsoletos)
    gcTime: 0, // Não usa cache do garbage collector
    refetchOnMount: true, // Sempre refaz a busca ao montar
    refetchOnWindowFocus: true, // Refaz ao focar a janela
  });
}

export function useMessages(chatId: string | null) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => chatId ? messagesAPI.getByChatId(chatId) : Promise.resolve([]),
    enabled: !!chatId,
    refetchInterval: 3000, // Atualiza a cada 3 segundos
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SendMessagePayload) => messagesAPI.send(data),
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
      chatsAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useTransferChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, attendantId }: { id: string; attendantId: string }) =>
      chatsAPI.transfer(id, attendantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useCloseChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      chatsAPI.close(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (chatId: string) => messagesAPI.markAsRead(chatId),
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

