import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  console.log('🔒 ProtectedRoute:', { loading, hasUser: !!user, userId: user?.id });

  if (loading) {
    console.log('⏳ ProtectedRoute: Ainda carregando...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ ProtectedRoute: Sem usuário, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute: Usuário autenticado, renderizando conteúdo');
  return <>{children}</>;
};

export default ProtectedRoute;

