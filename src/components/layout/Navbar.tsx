import { Search, ChevronDown, LogOut } from 'lucide-react';
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
import logoImage from '../../assets/Adapt-Link-Logo.png';

interface NavbarProps {
  sidebarCollapsed: boolean;
}

export const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

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
    <header className="bg-primary h-16 flex items-center px-6 relative shadow-sm">
      {/* Gradiente sutil no topo e base */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-black/10"></div>
      
      <div className="flex items-center w-full">
        {/* Logo e Título - Largura fixa */}
        <div className="flex items-center gap-4 w-80">
          <div className="flex items-center gap-2">
            <div className="flex items-baseline">
              <span className="text-white font-bold text-xl tracking-tight">adapt</span>
              <span className="text-white/70 text-xl font-light tracking-tight">link</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-white/30"></div>
          
          <span className="text-white font-medium text-lg drop-shadow-sm min-w-0 truncate">
            {getPageTitle()}
          </span>
        </div>

        {/* Barra de Busca - Largura fixa */}
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar atendimentos, clientes ou OS..."
              className="w-full h-10 bg-white border-gray-200 rounded-lg pl-4 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Seção Direita - Largura fixa */}
        <div className="flex items-center gap-6 w-64 justify-end">
          {/* Botão Novo */}
          <Button 
            className="bg-blue-300/90 hover:bg-blue-300 text-primary-foreground px-4 py-1.5 h-8 text-sm font-medium rounded-full shadow-sm border-0 flex-shrink-0"
            onClick={() => {
              toast({
                title: "Novo",
                description: "Funcionalidade em desenvolvimento...",
              });
            }}
          >
            Novo
          </Button>
          
          {/* User Info */}
          <div className="flex flex-col items-end text-right flex-shrink-0">
            <span className="text-sm font-medium text-white whitespace-nowrap">Cláudio Jr</span>
            <span className="text-xs text-white/80 whitespace-nowrap">Administrador</span>
          </div>
        </div>
      </div>
    </header>
  );
};