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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Função para atualizar dados do usuário (apenas auth nativo)
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

    // Usar apenas dados do sistema de auth nativo do Supabase
    const userData: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
      role: 'user',
      avatar_url: authUser.user_metadata?.avatar_url || null,
    };

    console.log('✅ Dados do usuário (auth nativo):', userData);
    setUser(userData);
    setLoading(false);
  };

  // Verificar sessão inicial
  useEffect(() => {
    console.log('🚀 Inicializando AuthContext...');
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('📋 Sessão inicial:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: error?.message 
      });
      updateUser(session?.user ?? null);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth mudou:', event, { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id 
      });
      await updateUser(session?.user ?? null);
    });

    return () => {
      console.log('🧹 Limpando subscription AuthContext');
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
        await updateUser(data.user);
        console.log('🚀 Redirecionando para /dashboard');
        navigate('/dashboard');
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
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
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