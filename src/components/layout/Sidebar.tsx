import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  UserCircle,
  Phone,
  FileText,
  BarChart3,
  Bot,
  Settings,
  Settings2,
  ChevronLeft,
  ChevronRight,
  X,
  Bell,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import logoImage from '../../assets/Adapt-Link-Logo.png';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // useAuth deve estar sempre disponível pois Sidebar está dentro do AuthProvider via Layout
  const { user, signOut } = useAuth();
  const { canAccessAdvancedSettings } = usePermissions();

  // Menu items com verificação de permissões
  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      title: 'Atendimentos',
      href: '/atendimentos',
      icon: MessageSquare
    },
    {
      title: 'Colaboradores',
      href: '/colaboradores',
      icon: Users
    },
    {
      title: 'Ligações com IA',
      href: '/ligacoes-ia',
      icon: Phone
    },
    {
      title: 'Ordens de Serviço',
      href: '/ordem-servico',
      icon: FileText
    },
    {
      title: 'Configuração de IA',
      href: '/configuracao-ia',
      icon: Bot
    },
    {
      title: 'Relatórios',
      href: '/relatorios',
      icon: BarChart3
    },
    {
      title: 'Clientes MK',
      href: '/clientes',
      icon: UserCircle
    },
    {
      title: 'Configurações',
      href: '/configuracoes',
      icon: Settings
    },
    // Apenas Master pode ver Configurações Avançadas
    ...(canAccessAdvancedSettings() ? [{
      title: 'Configurações Avançadas',
      href: '/configuracoes-avancadas',
      icon: Settings2
    }] : []),
    {
      title: 'Sair',
      href: '/login',
      icon: LogOut
    }
  ];

  // Função para obter iniciais do nome do usuário
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  // Função para obter nome de exibição
  const getDisplayName = () => {
    if (user?.name) {
      return user.name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  // Função para obter role de exibição
  const getDisplayRole = () => {
    if (user?.role) {
      const roleMap: Record<string, string> = {
        'master': 'Master',
        'admin': 'Administrador',
        'encarregado': 'Encarregado',
        'user': 'Usuário',
        'operator': 'Operador',
        'manager': 'Gerente',
      };
      return roleMap[user.role] || user.role;
    }
    return 'Usuário';
  };

  const handleLogout = async () => {
    try {
      if (signOut) {
        await signOut();
      } else {
        // Se não houver signOut, apenas navegar
        navigate('/login');
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Se falhar, redirecionar para login
      navigate('/login');
    }
  };

  // Mobile overlay
  const MobileOverlay = () => (
    isMobile && mobileOpen ? (
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onMobileClose}
      />
    ) : null
  );

  return (
    <>
      <MobileOverlay />
      <div className={cn(
        "bg-card border-r border-border flex flex-col transition-all duration-300",
        // Desktop behavior
        !isMobile && (collapsed ? "w-16" : "w-64"),
        // Mobile behavior - drawer
        isMobile && (
          mobileOpen
            ? "fixed left-0 top-16 bottom-0 w-64 z-50 shadow-xl"
            : "fixed left-0 top-16 bottom-0 w-64 z-50 shadow-xl -translate-x-full"
        ),
        // Desktop height
        !isMobile && "h-[calc(100vh-4rem)]",
        // Mobile height
        isMobile && "h-[calc(100vh-4rem)]"
      )}>
        {/* Header Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {(!collapsed || isMobile) && (
            <>
              <span className="font-bold text-foreground text-lg">Menu</span>
              {isMobile && onMobileClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMobileClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {collapsed && !isMobile && (
            <div className="w-full flex justify-center">
              {/* Notificações removidas a pedido do usuário */}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-3">
            {menuItems.filter(item => item.href !== '/login').map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={isMobile ? onMobileClose : undefined}
                    className={cn(
                      "flex items-center px-3 py-4 text-sm font-medium rounded-lg transition-all duration-200",
                      "hover:bg-primary-muted hover:text-primary",
                      isActive && "bg-primary text-primary-foreground shadow-primary",
                      collapsed && !isMobile && "justify-center px-2"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      (!collapsed || isMobile) && "mr-3"
                    )} />
                    {(!collapsed || isMobile) && <span>{item.title}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Card - Fixo no final */}
        {user && (
          <div className="mt-auto border-t border-border bg-card">
            {(!collapsed || isMobile) ? (
              // Versão expandida
              <div className="p-3">
                <div className="bg-background rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name || user.email} className="w-full h-full rounded-full" />
                        ) : (
                          getInitials(user.name, user.email)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getDisplayRole()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground truncate px-1">
                      {user.email}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigate('/perfil');
                          if (isMobile) onMobileClose?.();
                        }}
                        className="flex-1 h-8 text-xs sm:px-2"
                      >
                        <UserIcon className="h-3 w-3 mr-1.5" />
                        Ver Perfil
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-3 w-3 mr-2" />
                        Sair
                      </Button>
                    </div>
                  </div>
                </div>
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="w-full justify-center h-8 text-xs text-muted-foreground hover:text-foreground mt-2"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Recolher
                  </Button>
                )}
              </div>
            ) : (
              // Versão colapsada - só avatar e toggle
              <div className="p-2 space-y-2">
                <div className="flex justify-center">
                  <Avatar className="h-10 w-10 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name || user.email} className="w-full h-full rounded-full" />
                      ) : (
                        getInitials(user.name, user.email)
                      )}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="w-full justify-center h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
};