import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ─── Types ─── */
export interface Like {
  id: string;
  atualizacao_id: string;
  user_id: string;
  created_at: string;
}

export interface Comentario {
  id: string;
  atualizacao_id: string;
  user_id: string;
  texto: string;
  created_at: string;
  user_name?: string;
}

export interface Vista {
  id: string;
  atualizacao_id: string;
  user_id: string;
  curtido: boolean;
  comentou: boolean;
  visto_em: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* ─── Likes ─── */
async function fetchLikes(): Promise<Like[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_likes?select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function toggleLike(data: { atualizacao_id: string; user_id: string }): Promise<{ liked: boolean }> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  // Check if already liked
  const checkRes = await fetch(
    `${supabaseUrl}/rest/v1/atualizacoes_likes?atualizacao_id=eq.${data.atualizacao_id}&user_id=eq.${data.user_id}&select=id`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
  );
  const existing = await checkRes.json();

  if (existing.length > 0) {
    // Unlike
    await fetch(
      `${supabaseUrl}/rest/v1/atualizacoes_likes?id=eq.${existing[0].id}`,
      {
        method: 'DELETE',
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      }
    );
    return { liked: false };
  } else {
    // Like
    await fetch(`${supabaseUrl}/rest/v1/atualizacoes_likes`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(data),
    });
    return { liked: true };
  }
}

/* ─── Comentários ─── */
async function fetchComentarios(): Promise<Comentario[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(
    `${supabaseUrl}/rest/v1/v_atualizacoes_comentarios?select=*&order=created_at.desc`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function createComentario(data: { atualizacao_id: string; user_id: string; texto: string }): Promise<Comentario> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_comentarios`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

async function deleteComentario(id: string): Promise<void> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  await fetch(`${supabaseUrl}/rest/v1/atualizacoes_comentarios?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
}

/* ─── Vistas (popup tracking) ─── */
async function fetchVistas(): Promise<Vista[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_vistas?select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function marcarVisto(data: { atualizacao_id: string; user_id: string }): Promise<Vista> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_vistas`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

async function updateVista(data: { atualizacao_id: string; user_id: string; curtido?: boolean; comentou?: boolean }): Promise<Vista> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const payload: Record<string, any> = {};
  if (data.curtido !== undefined) payload.curtido = data.curtido;
  if (data.comentou !== undefined) payload.comentou = data.comentou;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/atualizacoes_vistas?atualizacao_id=eq.${data.atualizacao_id}&user_id=eq.${data.user_id}`,
    {
      method: 'PATCH',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

/* ─── Hooks ─── */
export function useLikes() {
  return useQuery({ queryKey: ['atualizacoes-likes'], queryFn: fetchLikes });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleLike,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-likes'] }),
  });
}

export function useComentarios() {
  return useQuery({ queryKey: ['atualizacoes-comentarios'], queryFn: fetchComentarios });
}

export function useCreateComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createComentario,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-comentarios'] }),
  });
}

export function useDeleteComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteComentario,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-comentarios'] }),
  });
}

export function useVistas() {
  return useQuery({ queryKey: ['atualizacoes-vistas'], queryFn: fetchVistas });
}

export function useMarcarVisto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marcarVisto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-vistas'] }),
  });
}

export function useUpdateVista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateVista,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-vistas'] }),
  });
}
