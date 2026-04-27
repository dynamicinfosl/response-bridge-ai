import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
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
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Activity,
  PieChart,
  LineChart,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AtendimentosEncerradosTable } from '@/components/relatorios/AtendimentosEncerradosTable';
import { DashboardOverview } from '@/components/relatorios/DashboardOverview';

const Relatorios = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedReport, setSelectedReport] = useState('atendimentos');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup na desmontagem do componente
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const periodOptions = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: '365d', label: 'Último ano' }
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    toast({
      title: "Gerando Relatório",
      description: "Aguarde enquanto processamos os dados...",
    });

    // Simular processamento
    timeoutRef.current = setTimeout(() => {
      // Verificar se o componente ainda está montado
      try {
        setIsGenerating(false);
        toast({
          title: "Relatório Gerado!",
          description: "Seu relatório foi gerado com sucesso e está disponível para download.",
        });
      } catch (error) {
        console.warn('Componente foi desmontado durante o processamento');
      }
      timeoutRef.current = null;
    }, 3000);
  };

  const handleDownloadReport = (reportId: string, reportTitle: string) => {
    toast({
      title: "Download Iniciado",
      description: `Fazendo download de "${reportTitle}"...`,
    });

    // Simular download
    setTimeout(() => {
      try {
        toast({
          title: "Download Concluído",
          description: "O relatório foi baixado com sucesso!",
        });
      } catch (error) {
        console.warn('Erro no download - componente pode ter sido desmontado');
      }
    }, 2000);
  };

  const handleQuickAction = (actionType: string) => {
    toast({
      title: "Ação Executada",
      description: `Gerando ${actionType.toLowerCase()}...`,
    });
  };

  const handleReportTypeSelect = (reportType: any) => {
    setSelectedReport(reportType.id);
    toast({
      title: "Tipo de Relatório Selecionado",
      description: `Selecionado: ${reportType.title}`,
    });
  };

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
    },
    {
      id: 'encerrados',
      title: 'Atendimentos Encerrados (n8n)',
      description: 'Histórico de resumo e métricas de fechamento',
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10'
    }
  ];

  const recentReports: any[] = [];

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
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-gradient-primary hover:shadow-primary"
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>
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
                  className={cn(
                    "p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
                    selectedReport === report.id && "bg-primary/10 border-primary/30"
                  )}
                  onClick={() => handleReportTypeSelect(report)}
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


        {/* Specific Report Data */}
        {selectedReport === 'encerrados' ? (
          <Card className="shadow-card overflow-hidden">
            <CardHeader className="bg-success/5 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Histórico de Atendimentos Encerrados (n8n)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <AtendimentosEncerradosTable />
            </CardContent>
          </Card>
        ) : selectedReport === 'audit_logs' ? (
          <Card className="shadow-card overflow-hidden">
            <CardHeader className="bg-purple-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Log de Auditoria e Rastreabilidade
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <AuditLogsTable />
            </CardContent>
          </Card>
        ) : selectedReport === 'atendimentos' ? (
          <DashboardOverview />
        ) : (
          <Card className="shadow-card overflow-hidden border border-dashed text-center">
            <CardContent className="p-12 flex flex-col justify-center items-center">
              <BarChart3 className="w-10 h-10 mb-4 opacity-50 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Selecione um relatório</h3>
              <p className="text-muted-foreground text-sm max-w-[300px]">Este módulo se encontra em construção. Por enquanto, explore "Relatório de Atendimentos" ou "Atendimentos Encerrados (n8n)".</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Relatorios;
