import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Atualizacao {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: 'melhoria' | 'correcao' | 'novidade' | 'manutencao';
  status: 'pendente' | 'em_desenvolvimento' | 'concluido' | 'cancelado';
  versao: string | null;
  created_at: string;
  created_by: string | null;
  published_at: string | null;
  is_published: boolean;
  link_feedback_id: string | null;
  target_user_id: string | null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getToken() {
  try {
    const stored = localStorage.getItem('sb-erydxufihxdyhzklpjza-auth-token');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.access_token || anonKey;
    }
  } catch { /* ignore */ }
  return anonKey;
}

async function fetchAtualizacoes(token: string): Promise<Atualizacao[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const url = `${supabaseUrl}/rest/v1/atualizacoes?select=*&order=published_at.desc.nullslast&limit=200`;
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

async function fetchAtualizacoesPublicadas(token: string): Promise<Atualizacao[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const url = `${supabaseUrl}/rest/v1/atualizacoes?is_published=eq.true&select=*&order=published_at.desc&limit=200`;
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

async function createAtualizacao(data: Omit<Atualizacao, 'id' | 'created_at'>, token: string): Promise<Atualizacao> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes`, {
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

async function updateAtualizacao(id: string, data: Partial<Atualizacao>, token: string): Promise<Atualizacao> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes?id=eq.${id}`, {
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

export function useAtualizacoes() {
  return useQuery({
    queryKey: ['atualizacoes'],
    queryFn: () => fetchAtualizacoes(getToken()),
    refetchInterval: 60000,
  });
}

export function useAtualizacoesPublicadas() {
  return useQuery({
    queryKey: ['atualizacoes-publicadas'],
    queryFn: () => fetchAtualizacoesPublicadas(getToken()),
    refetchInterval: 60000,
  });
}

export function useCreateAtualizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Atualizacao, 'id' | 'created_at'>) => createAtualizacao(data, getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atualizacoes'] });
      qc.invalidateQueries({ queryKey: ['atualizacoes-publicadas'] });
    },
  });
}

export function useUpdateAtualizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Atualizacao> }) => updateAtualizacao(id, data, getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atualizacoes'] });
      qc.invalidateQueries({ queryKey: ['atualizacoes-publicadas'] });
    },
  });
}

async function deleteAtualizacao(id: string, token: string): Promise<void> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function useDeleteAtualizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAtualizacao(id, getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atualizacoes'] });
      qc.invalidateQueries({ queryKey: ['atualizacoes-publicadas'] });
    },
  });
}
