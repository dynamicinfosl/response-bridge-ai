import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Eye,
  Download,
  Send,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

const OrdemServico = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const ordensServico = [
    {
      id: 'OS-2024-001',
      cliente: 'Maria Silva',
      telefone: '+55 11 99999-9999',
      email: 'maria@email.com',
      endereco: 'Rua das Flores, 123 - São Paulo/SP',
      servico: 'Instalação de Sistema',
      descricao: 'Instalação completa do sistema de atendimento com IA',
      dataAbertura: '2024-01-15',
      dataAgendamento: '2024-01-20',
      tecnico: 'Carlos Santos',
      status: 'agendado',
      prioridade: 'alta',
      valor: 'R$ 2.500,00',
      observacoes: 'Cliente preferência para manhã'
    },
    {
      id: 'OS-2024-002',
      cliente: 'João Oliveira',
      telefone: '+55 11 88888-8888',
      email: 'joao@email.com',
      endereco: 'Av. Paulista, 456 - São Paulo/SP',
      servico: 'Manutenção Preventiva',
      descricao: 'Manutenção mensal do sistema e atualizações',
      dataAbertura: '2024-01-14',
      dataAgendamento: '2024-01-18',
      tecnico: 'Ana Costa',
      status: 'em_andamento',
      prioridade: 'media',
      valor: 'R$ 800,00',
      observacoes: 'Sistema funcionando normalmente'
    },
    {
      id: 'OS-2024-003',
      cliente: 'Pedro Lima',
      telefone: '+55 11 77777-7777',
      email: 'pedro@email.com',
      endereco: 'Rua da Consolação, 789 - São Paulo/SP',
      servico: 'Suporte Técnico',
      descricao: 'Correção de bugs no sistema de relatórios',
      dataAbertura: '2024-01-13',
      dataAgendamento: '2024-01-16',
      tecnico: 'Roberto Silva',
      status: 'concluido',
      prioridade: 'baixa',
      valor: 'R$ 450,00',
      observacoes: 'Problema resolvido com sucesso'
    },
    {
      id: 'OS-2024-004',
      cliente: 'Ana Santos',
      telefone: '+55 11 66666-6666',
      email: 'ana@email.com',
      endereco: 'Rua Augusta, 321 - São Paulo/SP',
      servico: 'Treinamento',
      descricao: 'Treinamento da equipe no uso do sistema',
      dataAbertura: '2024-01-12',
      dataAgendamento: '2024-01-25',
      tecnico: 'Mariana Costa',
      status: 'pendente',
      prioridade: 'media',
      valor: 'R$ 1.200,00',
      observacoes: 'Aguardando confirmação da equipe'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'agendado':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'em_andamento':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'concluido':
        return 'bg-success/10 text-success border-success/20';
      case 'cancelado':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'agendado':
        return 'Agendado';
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4" />;
      case 'agendado':
        return <Calendar className="w-4 h-4" />;
      case 'em_andamento':
        return <AlertCircle className="w-4 h-4" />;
      case 'concluido':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelado':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'media':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'baixa':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getPrioridadeLabel = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Média';
      case 'baixa':
        return 'Baixa';
      default:
        return 'Normal';
    }
  };

  const filteredOrdens = ordensServico.filter(ordem => {
    const matchesSearch = ordem.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ordem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ordem.servico.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ordem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ordens de Serviço</h1>
            <p className="text-muted-foreground">
              Gerencie ordens de serviço, agendamentos e acompanhamento técnico
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-gradient-primary hover:shadow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nova Ordem
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{ordensServico.length}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-warning">
                    {ordensServico.filter(o => o.status === 'pendente').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {ordensServico.filter(o => o.status === 'em_andamento').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                  <p className="text-2xl font-bold text-success">
                    {ordensServico.filter(o => o.status === 'concluido').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, OS, serviço..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="agendado">Agendado</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Ordens de Serviço ({filteredOrdens.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOrdens.map((ordem) => (
                <div key={ordem.id} className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {ordem.cliente.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">{ordem.cliente}</h3>
                        <p className="text-sm text-muted-foreground">{ordem.id}</p>
                        <p className="text-sm text-muted-foreground">{ordem.servico}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", getStatusBadge(ordem.status))}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(ordem.status)}
                          {getStatusLabel(ordem.status)}
                        </span>
                      </Badge>
                      <Badge className={cn("text-xs", getPrioridadeBadge(ordem.prioridade))}>
                        {getPrioridadeLabel(ordem.prioridade)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{ordem.telefone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{ordem.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{ordem.endereco}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Abertura: {ordem.dataAbertura}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Agendamento: {ordem.dataAgendamento}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Técnico: {ordem.tecnico}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Valor: </span>
                        <span className="text-success font-semibold">{ordem.valor}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Descrição: </span>
                        <span>{ordem.descricao}</span>
                      </div>
                      {ordem.observacoes && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Observações: </span>
                          <span>{ordem.observacoes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Comunicar
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrdemServico;
