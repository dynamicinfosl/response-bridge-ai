import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <Navbar 
        sidebarCollapsed={sidebarCollapsed} 
        onToggleSidebar={isMobile ? toggleMobileMenu : undefined}
      />
      <div className="flex flex-1 relative">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={closeMobileMenu}
        />
        <main className={`flex-1 p-4 sm:p-6 bg-background-secondary transition-all duration-300 ${
          isMobile ? 'w-full' : sidebarCollapsed ? 'ml-0' : 'ml-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};