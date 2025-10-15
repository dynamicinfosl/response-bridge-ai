import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Phone,
  FileText,
  BarChart3,
  Bot,
  Settings, 
  ChevronLeft,
  ChevronRight,
  X,
  Bell,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import logoImage from '../../assets/Adapt-Link-Logo.png';

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
    title: 'Configurações',
    href: '/configuracoes',
    icon: Settings
  },
  {
    title: 'Sair',
    href: '/login',
    icon: LogOut
  }
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();

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
            {!isMobile && (
              <span className="text-sm text-primary font-medium">3 notificações</span>
            )}
          </>
        )}
        {collapsed && !isMobile && (
          <div className="w-full flex justify-center">
            <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-3">
          {menuItems.slice(0, -1).map((item) => {
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

      {/* Sair Button */}
      <div className="p-3 border-t border-border">
        <NavLink
          to="/login"
          onClick={isMobile ? onMobileClose : undefined}
          className={cn(
            "flex items-center px-3 py-4 text-sm font-medium rounded-lg transition-all duration-200",
            "hover:bg-destructive/10 hover:text-destructive",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <LogOut className={cn(
            "h-5 w-5",
            (!collapsed || isMobile) && "mr-3"
          )} />
          {(!collapsed || isMobile) && <span>Sair</span>}
        </NavLink>
      </div>

      {/* Toggle Button - Only on desktop */}
      {!isMobile && (
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full justify-center h-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
    </>
  );
};