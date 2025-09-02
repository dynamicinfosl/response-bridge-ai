import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Settings, 
  ChevronLeft,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    title: 'Configurações',
    href: '/configuracoes',
    icon: Settings
  }
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();

  return (
    <div className={cn(
      "bg-card border-r border-border flex flex-col h-full transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-primary text-lg">Adapt</span>
              <span className="text-xs text-muted-foreground -mt-1">Link</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="ml-auto p-2"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    "hover:bg-primary-muted hover:text-primary",
                    isActive && "bg-primary text-primary-foreground shadow-primary",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    !collapsed && "mr-3"
                  )} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};