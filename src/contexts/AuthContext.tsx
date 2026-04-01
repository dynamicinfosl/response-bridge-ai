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
  const updateUser = async (authUser: any) => {
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

    // Fallback básico primeiro (para não travar)
    const fallbackUser: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
      role: (authUser.user_metadata?.role as User['role']) || 'user',
      avatar_url: authUser.user_metadata?.avatar_url || null,
    };

    // Definir usuário básico primeiro para não travar a UI
    setUser(fallbackUser);
    setLoading(false);

    // Depois tentar buscar/criar dados completos da tabela (sem bloquear)
    try {
      // Tentar buscar primeiro
      let { data: userProfile, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, area, supervisor_id, avatar_url')
        .eq('id', authUser.id)
        .single();

      // Se não encontrou, criar o registro
      if (error && error.code === 'PGRST116') {
        console.log('📝 Usuário não encontrado na tabela, criando registro...');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
            role: authUser.user_metadata?.role || 'user',
          })
          .select()
          .single();

        if (insertError) {
          console.warn('⚠️ Erro ao criar perfil do usuário:', insertError.message);
          return;
        }

        userProfile = newUser;
        error = null;
      }

      if (error) {
        console.warn('⚠️ Erro ao buscar perfil do usuário (usando dados básicos):', error.message);
        return;
      }

      if (userProfile) {
        // Atualizar com dados completos da tabela
        const userData: User = {
          id: userProfile.id,
          email: userProfile.email || authUser.email || '',
          name: userProfile.full_name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
          role: (userProfile.role as User['role']) || 'user',
          area: userProfile.area as User['area'],
          supervisor_id: userProfile.supervisor_id || undefined,
          avatar_url: userProfile.avatar_url || authUser.user_metadata?.avatar_url || null,
        };

        console.log('✅ Dados do usuário (tabela users):', userData);
        setUser(userData);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados completos (usando dados básicos):', error);
      // Já temos o fallback definido, então não precisa fazer nada
    }
  };

  // Verificar sessão inicial
  useEffect(() => {
    console.log('🚀 Inicializando AuthContext...');
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Forçar refresh do token para garantir que o metadata (role) está atualizado
        const { data: refreshed } = await supabase.auth.refreshSession();
        updateUser(refreshed?.session?.user ?? session.user ?? null);
      } else {
        updateUser(null);
      }
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth mudou:', event, { hasUser: !!session?.user });
      await updateUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
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
        updateUser(data.user);
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