import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, User } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Função para atualizar dados do usuário (busca da tabela users)
  const updateUser = async (authUser: any, accessToken?: string) => {
    console.log('👤 Atualizando usuário...', { 
      hasAuthUser: !!authUser, 
      userId: authUser?.id,
      email: authUser?.email 
    });

    if (!authUser) {
      console.log('❌ Sem authUser, limpando estado');
      setUser(null);
      setLoading(false);
      return;
    }

    // Fallback: usa cache do localStorage se disponível (evita tela sem área quando query é lenta)
    setUser(prev => {
      if (prev && prev.id === authUser.id) return prev;
      try {
        const cached = localStorage.getItem(`userProfile_${authUser.id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as User;
          if (parsed.id === authUser.id) return parsed;
        }
      } catch (_) {}
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
        role: (authUser.user_metadata?.role as User['role']) || 'user',
        avatar_url: authUser.user_metadata?.avatar_url || null,
      };
    });
    setLoading(false);

    // Buscar dados completos via REST direta (evita travamento do SDK)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const token = accessToken || supabaseKey;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(
        `${supabaseUrl}/rest/v1/users?select=id,email,full_name,role,area,supervisor_id,avatar_url,chatwoot_id&id=eq.${authUser.id}&limit=1`,
        {
          signal: controller.signal,
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      clearTimeout(timeoutId);

      if (resp.ok) {
        const rows = await resp.json();
        const userProfile = rows[0];
        if (userProfile) {
          const userData: User = {
            id: userProfile.id,
            email: userProfile.email || authUser.email || '',
            name: userProfile.full_name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
            role: (userProfile.role as User['role']) || 'user',
            area: userProfile.area as User['area'],
            supervisor_id: userProfile.supervisor_id || undefined,
            avatar_url: userProfile.avatar_url || authUser.user_metadata?.avatar_url || null,
            chatwoot_id: userProfile.chatwoot_id,
          };
          console.log('✅ Dados do usuário (REST):', userData);
          try { localStorage.setItem(`userProfile_${userData.id}`, JSON.stringify(userData)); } catch (_) {}
          setUser(userData);
        }
      } else {
        console.warn('⚠️ REST users falhou:', resp.status);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar perfil (usando cache/fallback):', error);
    }
  };

  // Verificar sessão inicial via onAuthStateChange (não depende de locks)
  useEffect(() => {
    let handled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      handled = true;
      if (session?.user) {
        await updateUser(session.user, session.access_token);
      } else {
        await updateUser(null);
      }
    });

    // Fallback: se onAuthStateChange não disparar em 3s, destravar a UI
    const fallbackTimer = setTimeout(() => {
      if (!handled) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Fazendo login...', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📨 Resposta do login:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        userId: data?.user?.id,
        error: error?.message 
      });

      if (error) {
        console.error('❌ Erro no login:', error);
        return { error };
      }

      if (data?.user) {
        console.log('✅ Login bem-sucedido, atualizando usuário...');
        // Atualizar usuário (não esperar, pois já define loading como false)
        updateUser(data.user, data.session?.access_token);
        console.log('🚀 Redirecionando para /dashboard');
        // Pequeno delay para garantir que o estado foi atualizado
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
        return { error: null };
      }

      return { error: new Error('Login falhou') };
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name,
          },
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      if (user?.id) {
        try { localStorage.removeItem(`userProfile_${user.id}`); } catch (_) {}
      }
      setUser(null);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) return { error: new Error('Usuário não autenticado') };

      // Atualizar apenas os metadados do usuário no auth nativo
      const { error } = await supabase.auth.updateUser({
        data: {
          name: updates.name,
          full_name: updates.name,
          avatar_url: updates.avatar_url,
        }
      });

      if (error) {
        return { error };
      }

      setUser({ ...user, ...updates });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}