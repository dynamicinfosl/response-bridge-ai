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
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchAtualizacoes(): Promise<Atualizacao[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const url = `${supabaseUrl}/rest/v1/atualizacoes?select=*&order=published_at.desc.nullslast&limit=200`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAtualizacoesPublicadas(): Promise<Atualizacao[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const url = `${supabaseUrl}/rest/v1/atualizacoes?is_published=eq.true&select=*&order=published_at.desc&limit=200`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function createAtualizacao(data: Omit<Atualizacao, 'id' | 'created_at'>): Promise<Atualizacao> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

async function updateAtualizacao(id: string, data: Partial<Atualizacao>): Promise<Atualizacao> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
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
    queryFn: fetchAtualizacoes,
    refetchInterval: 60000,
  });
}

export function useAtualizacoesPublicadas() {
  return useQuery({
    queryKey: ['atualizacoes-publicadas'],
    queryFn: fetchAtualizacoesPublicadas,
    refetchInterval: 60000,
  });
}

export function useCreateAtualizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAtualizacao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atualizacoes'] });
      qc.invalidateQueries({ queryKey: ['atualizacoes-publicadas'] });
    },
  });
}

export function useUpdateAtualizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Atualizacao> }) => updateAtualizacao(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atualizacoes'] });
      qc.invalidateQueries({ queryKey: ['atualizacoes-publicadas'] });
    },
  });
}
