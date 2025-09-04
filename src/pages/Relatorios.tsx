import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Phone,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Relatorios = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedReport, setSelectedReport] = useState('all');

  const reportTypes = [
    {
      id: 'atendimentos',
      title: 'Relatório de Atendimentos',
      description: 'Análise completa de atendimentos por canal',
      icon: MessageSquare,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'ligacoes',
      title: 'Relatório de Ligações IA',
      description: 'Performance das chamadas automatizadas',
      icon: Phone,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'ordens',
      title: 'Relatório de Ordens de Serviço',
      description: 'Gestão e performance dos serviços técnicos',
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 'colaboradores',
      title: 'Relatório de Colaboradores',
      description: 'Produtividade e performance da equipe',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 'financeiro',
      title: 'Relatório Financeiro',
      description: 'Análise de receitas e custos operacionais',
      icon: DollarSign,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      id: 'satisfacao',
      title: 'Relatório de Satisfação',
      description: 'Avaliações e feedback dos clientes',
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    }
  ];

  const metrics = [
    {
      title: 'Total de Atendimentos',
      value: '1,247',
      change: '+12.5%',
      trend: 'up',
      icon: MessageSquare,
      color: 'text-primary'
    },
    {
      title: 'Taxa de Resolução IA',
      value: '87.3%',
      change: '+5.2%',
      trend: 'up',
      icon: Bot,
      color: 'text-blue-500'
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '2.4min',
      change: '-15.3%',
      trend: 'down',
      icon: Clock,
      color: 'text-green-500'
    },
    {
      title: 'Satisfação Média',
      value: '4.8/5',
      change: '+0.3',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-yellow-500'
    }
  ];

  const channelData = [
    { name: 'WhatsApp', value: 45, color: 'bg-green-500', percentage: '45%' },
    { name: 'Instagram', value: 30, color: 'bg-pink-500', percentage: '30%' },
    { name: 'E-mail', value: 15, color: 'bg-blue-500', percentage: '15%' },
    { name: 'Telefone', value: 10, color: 'bg-orange-500', percentage: '10%' }
  ];

  const topPerformers = [
    {
      name: 'Carlos Silva',
      role: 'Atendente',
      atendimentos: 156,
      satisfacao: 4.9,
      resolucao: '94%'
    },
    {
      name: 'Ana Santos',
      role: 'Supervisora',
      atendimentos: 142,
      satisfacao: 4.8,
      resolucao: '92%'
    },
    {
      name: 'Roberto Lima',
      role: 'Técnico',
      atendimentos: 98,
      satisfacao: 4.7,
      resolucao: '89%'
    }
  ];

  const recentReports = [
    {
      id: 'RPT-2024-001',
      title: 'Relatório Mensal - Janeiro 2024',
      type: 'Completo',
      generated: '2024-01-31 18:30',
      size: '2.4 MB',
      status: 'ready'
    },
    {
      id: 'RPT-2024-002',
      title: 'Análise de Performance IA',
      type: 'Ligações IA',
      generated: '2024-01-30 14:15',
      size: '1.8 MB',
      status: 'ready'
    },
    {
      id: 'RPT-2024-003',
      title: 'Relatório Financeiro Q1',
      type: 'Financeiro',
      generated: '2024-01-29 09:45',
      size: '3.2 MB',
      status: 'generating'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-success/10 text-success border-success/20';
      case 'generating':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Pronto';
      case 'generating':
        return 'Gerando';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4" />;
      case 'generating':
        return <Clock className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">
              Análise detalhada de performance e métricas do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Período
            </Button>
            <Button className="bg-gradient-primary hover:shadow-primary">
              <BarChart3 className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <Card key={index} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        metric.trend === 'up' ? "text-success" : "text-destructive"
                      )}>
                        {metric.change}
                      </span>
                    </div>
                  </div>
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", metric.color.replace('text-', 'bg-').replace('-500', '-500/10'))}>
                    <metric.icon className={cn("w-6 h-6", metric.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Types */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Tipos de Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportTypes.map((report) => (
                <div
                  key={report.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", report.bgColor)}>
                      <report.icon className={cn("w-5 h-5", report.color)} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{report.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Distribution */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Distribuição por Canal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelData.map((channel, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", channel.color)} />
                      <span className="text-sm font-medium">{channel.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{channel.percentage}</span>
                      <span className="text-sm font-semibold">{channel.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <h4 className="font-medium text-sm">{performer.name}</h4>
                      <p className="text-xs text-muted-foreground">{performer.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{performer.atendimentos} atendimentos</p>
                      <p className="text-xs text-muted-foreground">
                        {performer.satisfacao}/5 • {performer.resolucao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Relatórios Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{report.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {report.type} • {report.generated} • {report.size}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={cn("text-xs", getStatusBadge(report.status))}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(report.status)}
                        {getStatusLabel(report.status)}
                      </span>
                    </Badge>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={report.status !== 'ready'}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <BarChart3 className="w-6 h-6" />
                <span>Relatório Diário</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span>Relatório Semanal</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <TrendingUp className="w-6 h-6" />
                <span>Relatório Mensal</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Relatorios;
