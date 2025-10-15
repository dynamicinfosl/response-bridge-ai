import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { InsightsCard } from '@/components/dashboard/InsightsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  Users,
  TrendingUp,
  Phone,
  Mail,
  MessageCircle,
  Download,
  RefreshCw,
  Calendar,
  Bot,
  ChevronDown
} from 'lucide-react';

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [channelChartPeriod, setChannelChartPeriod] = useState('semanal');
  const [efficiencyChartPeriod, setEfficiencyChartPeriod] = useState('30');

  const handleExport = () => {
    // Simular exportação de dados
    console.log('Exportando dados do período:', selectedPeriod);
    // Aqui você implementaria a lógica real de exportação
  };

  const handleRefresh = () => {
    // Simular atualização de dados
    console.log('Atualizando dados...');
    // Aqui você implementaria a lógica real de atualização
    window.location.reload(); // Por enquanto, recarrega a página
  };
  const statsData = [
    {
      title: 'Atendimentos Pendentes',
      value: '0',
      subtitle: 'Aguardando atendente',
      trend: { value: '0%', isPositive: true },
      icon: Clock
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '0min',
      subtitle: 'Meta: < 3min',
      trend: { value: '0%', isPositive: true },
      icon: TrendingUp
    },
    {
      title: 'Taxa de Resolução',
      value: '0%',
      subtitle: 'Resolvidos hoje',
      trend: { value: '0%', isPositive: true },
      icon: CheckCircle
    },
    {
      title: 'Atendimentos IA vs Humano',
      value: '0%',
      subtitle: 'Resolvidos pela IA',
      trend: { value: '0%', isPositive: true },
      icon: MessageSquare
    }
  ];

  // Dados para gráfico de barras empilhadas "Atendimentos por Canal"
  const channelChartData = [
    { period: 'Seg', whatsapp: 0, chatSite: 0, telefone: 0, email: 0 },
    { period: 'Ter', whatsapp: 0, chatSite: 0, telefone: 0, email: 0 },
    { period: 'Qua', whatsapp: 0, chatSite: 0, telefone: 0, email: 0 },
    { period: 'Qui', whatsapp: 0, chatSite: 0, telefone: 0, email: 0 },
    { period: 'Sex', whatsapp: 0, chatSite: 0, telefone: 0, email: 0 },
    { period: 'Sáb', whatsapp: 0, chatSite: 0, telefone: 0, email: 0 },
    { period: 'Dom', whatsapp: 0, chatSite: 0, telefone: 0, email: 0 }
  ];

  // Dados para gráfico de linha "Eficiência da IA vs Humano"
  const efficiencyChartData = [
    { day: 1, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 2, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 3, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 4, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 5, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 6, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 7, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 8, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 9, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 10, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 11, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 12, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 13, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 14, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 15, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 16, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 17, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 18, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 19, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 20, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 21, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 22, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 23, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 24, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 25, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 26, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 27, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 28, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 29, aiResolved: 0, humanResolved: 0, transferRate: 0 },
    { day: 30, aiResolved: 0, humanResolved: 0, transferRate: 0 }
  ];

  const channelData = [
    { name: 'WhatsApp', value: 0, color: 'bg-success' },
    { name: 'Instagram', value: 0, color: 'bg-primary' },
    { name: 'E-mail', value: 0, color: 'bg-warning' },
    { name: 'Telefone', value: 0, color: 'bg-muted' }
  ];

  // Dados para a tabela de Tempo Médio de Atendimento
  const averageTimeData = [
    {
      channel: 'WhatsApp',
      icon: MessageCircle,
      aiTime: '0m 0s',
      humanTime: '0m 0s',
      difference: '0m 0s',
      savings: '0%'
    },
    {
      channel: 'Chat Site',
      icon: MessageSquare,
      aiTime: '0m 0s',
      humanTime: '0m 0s',
      difference: '0m 0s',
      savings: '0%'
    },
    {
      channel: 'Telefone',
      icon: Phone,
      aiTime: '0m 0s',
      humanTime: '0m 0s',
      difference: '0m 0s',
      savings: '0%'
    },
    {
      channel: 'Email',
      icon: Mail,
      aiTime: '0m 0s',
      humanTime: '0m 0s',
      difference: '0m 0s',
      savings: '0%'
    }
  ];

  // Dados para insights do sistema
  const systemInsights = [
    {
      icon: CheckCircle,
      title: 'Sistema iniciado',
      description: 'Aguardando dados para análise de economia de tempo.'
    },
    {
      icon: TrendingUp,
      title: 'Aguardando dados',
      description: 'Coletando informações sobre resolução por IA.'
    },
    {
      icon: Clock,
      title: 'Monitoramento ativo',
      description: 'Analisando padrões de atendimento em tempo real.'
    },
    {
      icon: Bot,
      title: 'IA configurada',
      description: 'Sistema pronto para processar atendimentos.'
    }
  ];

  // Dados para distribuição por tipo de atendimento
  const serviceTypeData = [
    { type: 'Dúvidas sobre produtos', color: '#1E62C4', colorClass: 'bg-primary' },
    { type: 'Reclamações', color: '#4A90E2', colorClass: 'bg-blue-400' },
    { type: 'Suporte técnico', color: '#7BB3F0', colorClass: 'bg-blue-300' },
    { type: 'Outros', color: '#A8D4FF', colorClass: 'bg-blue-200' }
  ];

  // Dados para satisfação do cliente
  const satisfactionData = [
    { period: 'Jan', satisfaction: 0 },
    { period: 'Fev', satisfaction: 0 },
    { period: 'Mar', satisfaction: 0 },
    { period: 'Abr', satisfaction: 0 },
    { period: 'Mai', satisfaction: 0 },
    { period: 'Jun', satisfaction: 0 },
    { period: 'Jul', satisfaction: 0 },
    { period: 'Ago', satisfaction: 0 }
  ];

  const recentChats = [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'em_andamento':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'concluido':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'WhatsApp':
        return <MessageCircle className="w-4 h-4 text-success" />;
      case 'Instagram':
        return <MessageSquare className="w-4 h-4 text-primary" />;
      case 'E-mail':
        return <Mail className="w-4 h-4 text-warning" />;
      case 'Telefone':
        return <Phone className="w-4 h-4 text-muted-foreground" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard - Visão Geral</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Visão geral dos atendimentos e métricas
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Seletor de Período */}
            <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1.5">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Período:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32 border-0 shadow-none focus:ring-0 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                className="flex items-center gap-1.5 h-7 px-2 text-xs"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              
              <Button 
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-1.5 h-7 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsData.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Atendimentos por Canal - Gráfico de Barras Empilhadas */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg sm:text-xl">Atendimentos por Canal</span>
                <div className="flex gap-1">
                  {['diario', 'semanal', 'mensal'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setChannelChartPeriod(period)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        channelChartPeriod === period
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {period === 'diario' ? 'Diário' : period === 'semanal' ? 'Semanal' : 'Mensal'}
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Gráfico de Barras Empilhadas Simulado */}
              <div className="h-64 flex items-end justify-between gap-2 mb-4">
                {channelChartData.map((data, index) => {
                  const total = data.whatsapp + data.chatSite + data.telefone + data.email;
                  const maxValue = Math.max(...channelChartData.map(d => d.whatsapp + d.chatSite + d.telefone + d.email));
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full h-48 bg-muted rounded-t-sm flex flex-col justify-end relative">
                        {/* WhatsApp (azul) */}
                        <div 
                          className="w-full bg-primary transition-all duration-300"
                          style={{ height: `${(data.whatsapp / maxValue) * 100}%` }}
                        />
                        {/* Chat Site (azul claro) */}
                        <div 
                          className="w-full bg-blue-400 transition-all duration-300"
                          style={{ height: `${(data.chatSite / maxValue) * 100}%` }}
                        />
                        {/* Telefone (azul mais claro) */}
                        <div 
                          className="w-full bg-blue-300 transition-all duration-300"
                          style={{ height: `${(data.telefone / maxValue) * 100}%` }}
                        />
                        {/* Email (cinza claro) */}
                        <div 
                          className="w-full bg-muted-foreground/30 transition-all duration-300"
                          style={{ height: `${(data.email / maxValue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-2">{data.period}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Legenda */}
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm text-muted-foreground">WhatsApp</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Chat Site</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Telefone</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-muted-foreground/30 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  </div>
              </div>
            </CardContent>
          </Card>

          {/* Eficiência da IA vs Humano - Gráfico de Linha */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg sm:text-xl">Eficiência da IA vs Humano</span>
                <div className="flex gap-1">
                  {['7', '30', '90'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setEfficiencyChartPeriod(period)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        efficiencyChartPeriod === period
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {period} dias
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Gráfico de Linha Simulado */}
              <div className="h-64 relative mb-4">
                <svg className="w-full h-full" viewBox="0 0 400 200">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Linha IA (azul escuro, mais grossa) */}
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={efficiencyChartData.slice(0, 30).map((data, index) => 
                      `${20 + (index * 12)},${180 - (data.aiResolved * 1.5)}`
                    ).join(' ')}
                  />
                  
                  {/* Linha Humano (azul claro, mais fina) */}
                  <polyline
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={efficiencyChartData.slice(0, 30).map((data, index) => 
                      `${20 + (index * 12)},${180 - (data.humanResolved * 1.5)}`
                    ).join(' ')}
                  />
                  
                  {/* Linha Taxa de Transferência (azul muito claro, fina) */}
                  <polyline
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={efficiencyChartData.slice(0, 30).map((data, index) => 
                      `${20 + (index * 12)},${180 - (data.transferRate * 8)}`
                    ).join(' ')}
                  />
                  
                  {/* Pontos da linha IA */}
                  {efficiencyChartData.slice(0, 30).map((data, index) => (
                    <circle
                      key={`ai-${index}`}
                      cx={20 + (index * 12)}
                      cy={180 - (data.aiResolved * 1.5)}
                      r="3"
                      fill="#2563eb"
                    />
                  ))}
                  
                  {/* Pontos da linha Humano */}
                  {efficiencyChartData.slice(0, 30).map((data, index) => (
                    <circle
                      key={`human-${index}`}
                      cx={20 + (index * 12)}
                      cy={180 - (data.humanResolved * 1.5)}
                      r="2"
                      fill="#60a5fa"
                    />
                  ))}
                  
                  {/* Pontos da linha Transferência */}
                  {efficiencyChartData.slice(0, 30).map((data, index) => (
                    <circle
                      key={`transfer-${index}`}
                      cx={20 + (index * 12)}
                      cy={180 - (data.transferRate * 8)}
                      r="1.5"
                      fill="#93c5fd"
                    />
                  ))}
                </svg>
                    </div>
              
              {/* Legenda */}
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Resolvidos pela IA</span>
                      </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Resolvidos por Humanos</span>
                      </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Taxa de Transferência</span>
                  </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Tempo Médio de Atendimento e Insights do Sistema */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: Tempo Médio de Atendimento */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg sm:text-xl">Tempo Médio de Atendimento</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Todos os canais</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Canal</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">IA (média)</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Humano (média)</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Diferença</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {averageTimeData.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <tr key={index} className="border-b border-border/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">{item.channel}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">{item.aiTime}</td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">{item.humanTime}</td>
                          <td className="py-3 px-2 text-sm text-success font-medium">{item.difference}</td>
                          <td className="py-3 px-2 text-sm text-success font-medium">{item.savings}</td>
                        </tr>
                      );
                    })}
                    {/* Linha de Média Total */}
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td className="py-3 px-2">
                        <span className="text-sm font-semibold">Média Total</span>
                      </td>
                      <td className="py-3 px-2 text-sm font-semibold">0m 0s</td>
                      <td className="py-3 px-2 text-sm font-semibold">0m 0s</td>
                      <td className="py-3 px-2 text-sm font-semibold text-success">0m 0s</td>
                      <td className="py-3 px-2 text-sm font-semibold text-success">0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Insights do Sistema */}
          <Card className="shadow-card bg-primary/5 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <span>Insights do Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {systemInsights.map((insight, index) => {
                  const Icon = insight.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white/50 rounded-lg border border-primary/10">
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground mb-1">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Ver todos os insights
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda Linha - Distribuição por Tipo e Satisfação do Cliente */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 3: Distribuição por Tipo de Atendimento */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg sm:text-xl">Distribuição por Tipo de Atendimento</span>
                <Button variant="link" className="text-primary hover:text-primary/80 p-0 h-auto">
                  Ver detalhes
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Gráfico de Pizza */}
              <div className="flex flex-col items-center gap-6">
                {/* Gráfico de Pizza SVG */}
                <div className="w-48 h-48 relative">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    {/* Fundo cinza */}
                    <circle cx="100" cy="100" r="80" fill="#f3f4f6" />
                    
                    {/* Dúvidas sobre produtos - 40% */}
                    <path
                      d="M 100,100 L 100,20 A 80,80 0 0,1 165.69,65.69 Z"
                      fill="#1E62C4"
                    />
                    {/* Reclamações - 30% */}
                    <path
                      d="M 100,100 L 165.69,65.69 A 80,80 0 0,1 165.69,134.31 Z"
                      fill="#4A90E2"
                    />
                    {/* Suporte técnico - 20% */}
                    <path
                      d="M 100,100 L 165.69,134.31 A 80,80 0 0,1 100,180 Z"
                      fill="#7BB3F0"
                    />
                    {/* Outros - 10% */}
                    <path
                      d="M 100,100 L 100,180 A 80,80 0 0,1 34.31,134.31 Z"
                      fill="#A8D4FF"
                    />
                  </svg>
                </div>
                
                {/* Legenda */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  {serviceTypeData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-muted-foreground">{item.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Satisfação do Cliente */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg sm:text-xl">Satisfação do Cliente</span>
                <Button variant="link" className="text-primary hover:text-primary/80 p-0 h-auto">
                  Ver detalhes
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Métricas de Satisfação */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success mb-1">0%</div>
                  <div className="text-xs text-muted-foreground">Atendimentos IA</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">0%</div>
                  <div className="text-xs text-muted-foreground">Atendimentos Humanos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">0%</div>
                  <div className="text-xs text-muted-foreground">Média Geral</div>
                </div>
              </div>

              {/* Gráfico de Linha de Satisfação */}
              <div className="h-24 mb-6">
                <svg className="w-full h-full" viewBox="0 0 300 80">
                  {/* Linha principal (satisfação IA) */}
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={satisfactionData.map((data, index) => 
                      `${20 + (index * 35)},${60 - (data.satisfaction * 0.5)}`
                    ).join(' ')}
                  />
                  
                  {/* Linha secundária (satisfação humana) */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={satisfactionData.map((data, index) => 
                      `${20 + (index * 35)},${60 - ((data.satisfaction - 5) * 0.5)}`
                    ).join(' ')}
                  />
                  
                  {/* Pontos */}
                  {satisfactionData.map((data, index) => (
                    <circle
                      key={index}
                      cx={20 + (index * 35)}
                      cy={60 - (data.satisfaction * 0.5)}
                      r="2"
                      fill="#22c55e"
                    />
                  ))}
                </svg>
        </div>

              {/* Feedback Recente */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Aguardando feedback</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">Nenhum feedback disponível</div>
                <blockquote className="text-sm italic text-muted-foreground">
                  "O sistema está pronto para coletar feedback dos atendimentos."
                </blockquote>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;