import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas!');
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local');
  console.error('URL atual:', supabaseUrl || 'NÃO DEFINIDA');
  console.error('Key atual:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'NÃO DEFINIDA');
} else {
  console.log('✅ Supabase configurado:', supabaseUrl);
  console.log('🔑 Key (primeiros 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'sb-auth-token',
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey || '',
      }
    }
  }
);

// Interface para o usuário
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'master' | 'admin' | 'encarregado' | 'user';
  area?: 'tecnica' | 'comercial' | 'financeiro';
  supervisor_id?: string;
  avatar_url?: string;
  chatwoot_id?: number;
}

// Interface para o perfil completo do usuário
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: 'master' | 'admin' | 'encarregado' | 'user';
  area?: 'tecnica' | 'comercial' | 'financeiro';
  supervisor_id?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

