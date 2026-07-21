import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Feedback {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: 'bug' | 'melhoria' | 'sugestao' | 'outro';
  status: 'novo' | 'em_analise' | 'em_desenvolvimento' | 'resolvido' | 'rejeitado';
  created_at: string;
  created_by: string | null;
  resposta_admin: string | null;
  atualizacao_id: string | null;
  resolvido_em: string | null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getProjectRef() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const match = url.match(/https:\/\/([^.]+)\.supabase/);
  return match ? match[1] : '';
}

function getToken() {
  try {
    const projectRef = getProjectRef();
    const stored = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.access_token || anonKey;
    }
  } catch { /* ignore */ }
  return anonKey;
}

async function fetchFeedbacks(token: string): Promise<Feedback[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const url = `${supabaseUrl}/rest/v1/feedbacks?select=*&order=created_at.desc&limit=200`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function createFeedback(data: Omit<Feedback, 'id' | 'created_at' | 'resolvido_em'>, token: string): Promise<Feedback> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const res = await fetch(`${supabaseUrl}/rest/v1/feedbacks`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

async function updateFeedback(id: string, data: Partial<Feedback>, token: string): Promise<Feedback> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const res = await fetch(`${supabaseUrl}/rest/v1/feedbacks?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

export function useFeedbacks() {
  return useQuery({
    queryKey: ['feedbacks'],
    queryFn: () => fetchFeedbacks(getToken()),
    staleTime: 60000 * 5, // Cache por 5 minutos
    refetchOnWindowFocus: false,
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Feedback, 'id' | 'created_at' | 'resolvido_em'>) => createFeedback(data, getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });
}

export function useUpdateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Feedback> }) => updateFeedback(id, data, getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });
}
