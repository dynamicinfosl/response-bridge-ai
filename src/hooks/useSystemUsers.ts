import { useQuery } from '@tanstack/react-query';

export interface SystemUser {
  id: string;
  nome: string;
  email: string;
  created_at: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchSystemUsers(): Promise<SystemUser[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ENV não configurado');
  const res = await fetch(`${supabaseUrl}/rest/v1/v_users?select=*&order=nome.asc`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useSystemUsers() {
  return useQuery({
    queryKey: ['system-users'],
    queryFn: fetchSystemUsers,
    staleTime: 5 * 60 * 1000,
  });
}
