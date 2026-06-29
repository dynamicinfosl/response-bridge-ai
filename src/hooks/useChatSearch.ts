import { useState, useEffect, useRef } from 'react';
import { chatwootAPI } from '../lib/chatwoot';
import { mapChatwootToChat } from './useChats';
import type { Chat } from '../lib/api';

export function useChatSearch(query: string) {
  const [results, setResults] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const searchResponse = await chatwootAPI.searchContacts(trimmed);
        const contacts = Array.isArray(searchResponse)
          ? searchResponse
          : searchResponse?.payload || searchResponse?.data?.payload || [];

        if (!Array.isArray(contacts) || contacts.length === 0) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const allChats: Chat[] = [];
        const seenIds = new Set<string>();

        await Promise.all(
          contacts.map(async (contact: any) => {
            const contactId = contact?.id || contact?.contact?.id;
            if (!contactId) return;

            try {
              const convResponse = await chatwootAPI.getContactConversations(Number(contactId));
              const conversations = Array.isArray(convResponse)
                ? convResponse
                : convResponse?.payload || convResponse?.data?.payload || [];

              if (!Array.isArray(conversations)) return;

              conversations.forEach((conv: any) => {
                const id = String(conv?.id || conv?.conversation_id || '');
                if (!id || seenIds.has(id)) return;
                seenIds.add(id);

                const merged = {
                  ...conv,
                  contact: contact?.contact || contact || conv?.contact || conv?.meta?.sender || {},
                };
                allChats.push(mapChatwootToChat(merged));
              });
            } catch (innerErr) {
              console.warn(`Erro ao buscar conversas do contato ${contactId}:`, innerErr);
            }
          })
        );

        setResults(allChats);
      } catch (err) {
        console.error('Erro na busca remota de chats:', err);
        setError('Falha ao buscar conversas no Chatwoot');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  return { data: results, isLoading, error };
}
