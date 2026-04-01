import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/lib/supabase';

/**
 * Hook para verificar permissões do usuário
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * Verifica se o usuário é Master
   */
  const isMaster = (): boolean => {
    return user?.role === 'master';
  };

  /**
   * Verifica se o usuário é Admin ou Master
   */
  const isAdmin = (): boolean => {
    return user?.role === 'admin' || user?.role === 'master';
  };

  /**
   * Verifica se o usuário é Encarregado, Admin ou Master
   */
  const isEncarregado = (): boolean => {
    return user?.role === 'encarregado' || user?.role === 'admin' || user?.role === 'master';
  };

  /**
   * Verifica se o usuário pode gerenciar um usuário específico
   * 
   * Regras:
   * - Master: pode gerenciar qualquer um
   * - Admin: pode gerenciar qualquer um exceto master/admin
   * - Encarregado: pode gerenciar apenas seus subordinados
   * - User: não pode gerenciar ninguém
   */
  const canManageUser = (targetUser: User | null): boolean => {
    if (!user || !targetUser) return false;

    // Master pode gerenciar qualquer um
    if (user.role === 'master') return true;

    // Admin pode gerenciar qualquer um exceto master/admin
    if (user.role === 'admin') {
      return targetUser.role !== 'master' && targetUser.role !== 'admin';
    }

    // Encarregado pode gerenciar apenas seus subordinados
    if (user.role === 'encarregado') {
      return targetUser.supervisor_id === user.id;
    }

    // User não pode gerenciar ninguém
    return false;
  };

  /**
   * Verifica se pode alterar role de um usuário
   * Apenas Master pode alterar roles
   */
  const canChangeRole = (): boolean => {
    return user?.role === 'master';
  };

  /**
   * Verifica se pode criar usuários com role específico
   * 
   * - Master: pode criar qualquer role
   * - Admin: pode criar apenas encarregado e user
   * - Encarregado: pode criar apenas user
   */
  const canCreateRole = (role: User['role']): boolean => {
    if (!user) return false;

    if (user.role === 'master') return true;
    if (user.role === 'admin') {
      return role === 'encarregado' || role === 'user';
    }
    if (user.role === 'encarregado') {
      return role === 'user';
    }

    return false;
  };

  /**
   * Verifica se pode acessar Configurações Avançadas
   * Apenas Master
   */
  const canAccessAdvancedSettings = (): boolean => {
    return user?.role === 'master';
  };

  /**
   * Verifica se pode ver todos os usuários
   * Master e Admin podem ver todos
   */
  const canViewAllUsers = (): boolean => {
    return user?.role === 'master' || user?.role === 'admin';
  };


  return {
    user,
    isMaster,
    isAdmin,
    isEncarregado,
    canManageUser,
    canChangeRole,
    canCreateRole,
    canAccessAdvancedSettings,
    canViewAllUsers,
  };
}

