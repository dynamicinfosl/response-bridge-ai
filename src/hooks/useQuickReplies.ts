import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface QuickReply {
  id: string;
  user_id: string;
  shortcut: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyInput {
  user_id: string;
  shortcut: string;
  title: string;
  content: string;
}

const normalizeShortcut = (shortcut: string) =>
  shortcut
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-');

export function useQuickReplies(userId?: string) {
  return useQuery({
    queryKey: ['quick-replies', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('user_id', userId)
        .order('shortcut', { ascending: true });

      if (error) throw error;
      return (data || []) as QuickReply[];
    },
    enabled: !!userId,
  });
}

export function useCreateQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickReplyInput) => {
      const payload = {
        ...input,
        shortcut: normalizeShortcut(input.shortcut),
      };

      const { data, error } = await supabase
        .from('quick_replies')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data as QuickReply;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies', variables.user_id] });
    },
  });
}

export function useUpdateQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, user_id, shortcut, title, content }: QuickReplyInput & { id: string }) => {
      const { data, error } = await supabase
        .from('quick_replies')
        .update({
          shortcut: normalizeShortcut(shortcut),
          title,
          content,
        })
        .eq('id', id)
        .eq('user_id', user_id)
        .select('*')
        .single();

      if (error) throw error;
      return data as QuickReply;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies', variables.user_id] });
    },
  });
}

export function useDeleteQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return { id, userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies', variables.userId] });
    },
  });
}
