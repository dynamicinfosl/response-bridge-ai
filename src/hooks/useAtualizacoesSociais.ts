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

/* ─── Likes ─── */
async function fetchLikes(token: string): Promise<Like[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_likes?select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function toggleLike(data: { atualizacao_id: string; user_id: string }, token: string): Promise<{ liked: boolean }> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  // Tentar inserir primeiro (like)
  const postRes = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_likes`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  });

  if (postRes.ok) {
    return { liked: true };
  }

  const errText = await postRes.text();
  console.error('[toggleLike] POST failed:', postRes.status, errText);

  // Parse JSON error if possible
  let errMessage = errText;
  try {
    const errJson = JSON.parse(errText);
    errMessage = JSON.stringify(errJson);
  } catch { /* ignore */ }

  // Se erro de chave duplicada (já existe), deletar (unlike)
  const isDuplicate = errMessage.toLowerCase().includes('duplicate') ||
                      errMessage.includes('23505') ||
                      postRes.status === 409 ||
                      errMessage.toLowerCase().includes('unique constraint');

  if (isDuplicate) {
    console.log('[toggleLike] Duplicate detected, deleting (unlike)...');
    const delRes = await fetch(
      `${supabaseUrl}/rest/v1/atualizacoes_likes?atualizacao_id=eq.${data.atualizacao_id}&user_id=eq.${data.user_id}`,
      {
        method: 'DELETE',
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }
    );
    if (!delRes.ok) {
      const delErr = await delRes.text();
      console.error('[toggleLike] DELETE failed:', delRes.status, delErr);
    }
    return { liked: false };
  }

  throw new Error(`Like HTTP ${postRes.status}: ${errText}`);
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

async function createComentario(data: { atualizacao_id: string; user_id: string; texto: string }, token: string): Promise<Comentario> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  console.log('[createComentario] token prefix:', token.slice(0, 20) + '...', 'data:', data);
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_comentarios`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[createComentario] failed:', res.status, errText);
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
  const rows = await res.json();
  return rows[0];
}

async function deleteComentario(id: string, token: string): Promise<void> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  await fetch(`${supabaseUrl}/rest/v1/atualizacoes_comentarios?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
}

/* ─── Vistas (popup tracking) ─── */
async function fetchVistas(token: string): Promise<Vista[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_vistas?select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function marcarVisto(data: { atualizacao_id: string; user_id: string }, token: string): Promise<Vista> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');

  const res = await fetch(`${supabaseUrl}/rest/v1/atualizacoes_vistas`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    const rows = await res.json();
    return rows[0];
  }

  const errText = await res.text();
  // Se erro de chave duplicada, buscar e retornar o registro existente
  if (errText.includes('duplicate') || errText.includes('23505') || res.status === 409) {
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/atualizacoes_vistas?atualizacao_id=eq.${data.atualizacao_id}&user_id=eq.${data.user_id}&select=*&limit=1`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    const rows = await getRes.json();
    return rows[0];
  }

  throw new Error(`Visto HTTP ${res.status}: ${errText}`);
}

async function updateVista(data: { atualizacao_id: string; user_id: string; curtido?: boolean; comentou?: boolean }, token: string): Promise<Vista> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const payload: Record<string, any> = {};
  if (data.curtido !== undefined) payload.curtido = data.curtido;
  if (data.comentou !== undefined) payload.comentou = data.comentou;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/atualizacoes_vistas?atualizacao_id=eq.${data.atualizacao_id}&user_id=eq.${data.user_id}`,
    {
      method: 'PATCH',
      headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

function getAuthToken(): string {
  try {
    const stored = localStorage.getItem('sb-erydxufihxdyhzklpjza-auth-token');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.access_token) return parsed.access_token;
    }
  } catch { /* ignore */ }
  return anonKey;
}

/* ─── Hooks ─── */
export function useLikes() {
  return useQuery<Like[]>({ queryKey: ['atualizacoes-likes'], queryFn: () => fetchLikes(getAuthToken()) });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { atualizacao_id: string; user_id: string }) => toggleLike(data, getAuthToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-likes'] }),
  });
}

export function useComentarios() {
  return useQuery({ queryKey: ['atualizacoes-comentarios'], queryFn: fetchComentarios });
}

export function useCreateComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { atualizacao_id: string; user_id: string; texto: string }) => createComentario(data, getAuthToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-comentarios'] }),
  });
}

export function useDeleteComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComentario(id, getAuthToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-comentarios'] }),
  });
}

export function useVistas() {
  return useQuery<Vista[]>({ queryKey: ['atualizacoes-vistas'], queryFn: () => fetchVistas(getAuthToken()) });
}

export function useMarcarVisto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { atualizacao_id: string; user_id: string }) => marcarVisto(data, getAuthToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-vistas'] }),
  });
}

export function useUpdateVista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { atualizacao_id: string; user_id: string; curtido?: boolean; comentou?: boolean }) => updateVista(data, getAuthToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atualizacoes-vistas'] }),
  });
}
