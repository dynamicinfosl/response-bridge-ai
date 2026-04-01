import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('master' | 'admin' | 'encarregado' | 'user')[];
  fallbackPath?: string;
}

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles,
  fallbackPath = '/dashboard'
}: RoleProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isMaster, isAdmin, isEncarregado } = usePermissions();

  if (loading) {
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
    return <Navigate to="/login" replace />;
  }

  // Verificar se o usuário tem uma das roles permitidas
  const hasAccess = allowedRoles.some(role => {
    switch (role) {
      case 'master':
        return isMaster();
      case 'admin':
        return isAdmin();
      case 'encarregado':
        return isEncarregado();
      case 'user':
        return true; // Qualquer usuário autenticado
      default:
        return false;
    }
  });

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldX className="w-8 h-8 text-destructive" />
              <CardTitle>Acesso Negado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
            <p className="text-sm text-muted-foreground">
              Esta área requer uma das seguintes permissões: {allowedRoles.join(', ')}.
            </p>
            <Button 
              onClick={() => window.location.href = fallbackPath}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;


