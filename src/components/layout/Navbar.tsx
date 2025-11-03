import { Search, ChevronDown, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import logoImage from '../../assets/Adapt-Link-Logo.png';

interface NavbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar = ({ sidebarCollapsed, onToggleSidebar }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('Adapt Link');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('companySettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.companyLogo) setCompanyLogo(parsed.companyLogo as string);
        if (parsed?.companyName) setCompanyName(parsed.companyName as string);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    // Simular logout
    toast({
      title: "Logout realizado!",
      description: "Você foi desconectado com sucesso.",
    });
    
    // Redirecionar para a página de login
    navigate('/login');
  };

  // Função para obter o título da página atual
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/atendimentos':
        return 'Atendimento';
      case '/ligacoes-ia':
        return 'Ligações IA';
      case '/ordem-servico':
        return 'Ordem de Serviço';
      case '/relatorios':
        return 'Relatórios';
      case '/configuracao-ia':
        return 'Configuração IA';
      case '/colaboradores':
        return 'Colaboradores';
      case '/configuracoes':
        return 'Configurações';
      default:
        return 'Atendimento';
    }
  };

  return (
    <header className="bg-primary h-16 flex items-center px-4 sm:px-6 relative shadow-sm">
      {/* Gradiente sutil no topo e base */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-black/10"></div>
      
      <div className="flex items-center w-full">
        {/* Mobile Menu Button */}
        {isMobile && onToggleSidebar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="text-white hover:bg-white/10 mr-2 p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo e Título - Responsivo */
        }
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-6 sm:h-7 object-contain" />
            ) : (
              <div className="flex items-baseline">
                <span className="text-white font-bold text-lg sm:text-xl tracking-tight">adapt</span>
                <span className="text-white/70 text-lg sm:text-xl font-light tracking-tight">link</span>
              </div>
            )}
          </div>
          
          <div className="h-6 w-px bg-white/30 hidden sm:block"></div>
          
          <span className="text-white font-medium text-sm sm:text-lg drop-shadow-sm min-w-0 truncate hidden sm:block">
            {getPageTitle()}
          </span>
        </div>

        {/* Barra de Busca - Responsiva */}
        <div className="flex-1 mx-2 sm:mx-4 lg:mx-8 max-w-xs sm:max-w-lg lg:max-w-2xl">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={isMobile ? "Buscar..." : "Buscar atendimentos, clientes ou OS..."}
              className="w-full h-9 sm:h-10 bg-white border-gray-200 rounded-lg pl-3 sm:pl-4 pr-8 sm:pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Seção Direita - Responsiva */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
          {/* Botão Novo - Oculto em mobile muito pequeno */}
          <Button 
            className="bg-blue-300/90 hover:bg-blue-300 text-primary-foreground px-2 sm:px-4 py-1.5 h-8 text-xs sm:text-sm font-medium rounded-full shadow-sm border-0 hidden xs:flex"
            onClick={() => {
              toast({
                title: "Novo",
                description: "Funcionalidade em desenvolvimento...",
              });
            }}
          >
            <span className="hidden sm:inline">Novo</span>
            <span className="sm:hidden">+</span>
          </Button>
          
          {/* User Info - Adaptado para mobile */}
          <div className="flex flex-col items-end text-right">
            <span className="text-xs sm:text-sm font-medium text-white whitespace-nowrap">
              {isMobile ? "C. Jr" : "Cláudio Jr"}
            </span>
            <span className="text-xs text-white/80 whitespace-nowrap hidden sm:block">
              Administrador
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};