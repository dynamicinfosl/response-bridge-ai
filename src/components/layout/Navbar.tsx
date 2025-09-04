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
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 h-16 flex items-center px-6 relative">
      {/* Gradiente sutil no topo e base */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
      
      <div className="flex items-center w-full">
        {/* Logo e Título - Sempre visível no canto esquerdo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src={logoImage} 
              alt="Adapt Link Logo" 
              className="w-8 h-8 object-contain"
            />
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-lg drop-shadow-sm">adapt</span>
              <span className="text-white/60 text-sm font-light">link</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-white/30"></div>
          
          <span className="text-white font-medium text-lg drop-shadow-sm">
            {getPageTitle()}
          </span>
        </div>

        {/* Barra de Busca */}
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar atendimentos, clientes ou OS..."
              className="w-full h-10 bg-white border-gray-200 rounded-lg pl-4 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Seção Direita - Usuário */}
        <div className="flex items-center gap-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-auto p-2 text-white hover:bg-white/10">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-white text-blue-600 text-sm font-semibold">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-white">Admin User</span>
                  <span className="text-xs text-white/70">Gestor</span>
                </div>
                <ChevronDown className="h-4 w-4 text-white/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Meu Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};