import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  User, 
  Mail, 
  Shield,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Colaboradores = () => {
  const colaboradores = [
    {
      id: 1,
      nome: 'Admin User',
      email: 'admin@adaptlink.com',
      cargo: 'Gestor',
      permissao: 'admin',
      avatar: 'AU',
      ativo: true,
      ultimoAcesso: '2 min atrás'
    },
    {
      id: 2,
      nome: 'Carlos Silva',
      email: 'carlos@adaptlink.com',
      cargo: 'Atendente',
      permissao: 'atendente',
      avatar: 'CS',
      ativo: true,
      ultimoAcesso: '1 hora atrás'
    },
    {
      id: 3,
      nome: 'Ana Santos',
      email: 'ana@adaptlink.com',
      cargo: 'Atendente',
      permissao: 'atendente',
      avatar: 'AS',
      ativo: true,
      ultimoAcesso: '3 horas atrás'
    },
    {
      id: 4,
      nome: 'Roberto Lima',
      email: 'roberto@adaptlink.com',
      cargo: 'Supervisor',
      permissao: 'supervisor',
      avatar: 'RL',
      ativo: false,
      ultimoAcesso: '1 semana atrás'
    }
  ];

  const getPermissionBadge = (permissao: string) => {
    switch (permissao) {
      case 'admin':
        return { className: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Administrador' };
      case 'supervisor':
        return { className: 'bg-warning/10 text-warning border-warning/20', label: 'Supervisor' };
      case 'atendente':
        return { className: 'bg-primary/10 text-primary border-primary/20', label: 'Atendente' };
      default:
        return { className: 'bg-muted/10 text-muted-foreground border-muted/20', label: 'Usuário' };
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e suas permissões
            </p>
          </div>
          <Button className="bg-gradient-primary hover:shadow-primary">
            <Plus className="w-4 h-4 mr-2" />
            Novo Colaborador
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaboradores..."
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Shield className="w-4 h-4 mr-2" />
                Permissões
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Collaborators List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Lista de Colaboradores ({colaboradores.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="p-4 font-medium text-muted-foreground">Colaborador</th>
                    <th className="p-4 font-medium text-muted-foreground">Cargo</th>
                    <th className="p-4 font-medium text-muted-foreground">Permissão</th>
                    <th className="p-4 font-medium text-muted-foreground">Status</th>
                    <th className="p-4 font-medium text-muted-foreground">Último Acesso</th>
                    <th className="p-4 font-medium text-muted-foreground w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((colaborador) => {
                    const permission = getPermissionBadge(colaborador.permissao);
                    
                    return (
                      <tr key={colaborador.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {colaborador.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{colaborador.nome}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {colaborador.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{colaborador.cargo}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={permission.className}>
                            {permission.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              colaborador.ativo ? 'bg-success' : 'bg-muted'
                            }`} />
                            <span className={`text-sm ${
                              colaborador.ativo ? 'text-success' : 'text-muted-foreground'
                            }`}>
                              {colaborador.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {colaborador.ultimoAcesso}
                          </span>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="w-4 h-4 mr-2" />
                                Permissões
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Colaboradores</p>
                  <p className="text-2xl font-bold text-foreground">4</p>
                </div>
                <div className="w-12 h-12 bg-primary-muted rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-success">3</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Administradores</p>
                  <p className="text-2xl font-bold text-foreground">1</p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Colaboradores;