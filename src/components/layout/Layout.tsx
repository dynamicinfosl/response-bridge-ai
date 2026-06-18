import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useChats } from '@/hooks/useChats';
import { useTransferNotification } from '@/hooks/useTransferNotification';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: chats } = useChats();

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useTransferNotification({
    chats,
    myId: user?.chatwoot_id,
    userId: user?.id,
    onNavigateToChat: () => navigate('/atendimentos'),
  });

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col w-full">
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={isMobile ? toggleMobileMenu : undefined}
        notifications={notifications}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={closeMobileMenu}
        />
        <main className={`flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 bg-background-secondary transition-all duration-300 ${
          isMobile ? 'w-full' : sidebarCollapsed ? 'ml-0' : 'ml-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};