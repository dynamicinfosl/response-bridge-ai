import { Layout } from '@/components/layout/Layout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  Users,
  TrendingUp,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';

const Dashboard = () => {
  const statsData = [
    {
      title: 'Atendimentos Pendentes',
      value: '27',
      subtitle: 'Aguardando atendente',
      trend: { value: '8%', isPositive: false },
      icon: Clock
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '2.4min',
      subtitle: 'Meta: < 3min',
      trend: { value: '15%', isPositive: true },
      icon: TrendingUp
    },
    {
      title: 'Taxa de Resolução',
      value: '89%',
      subtitle: 'Resolvidos hoje',
      trend: { value: '12%', isPositive: true },
      icon: CheckCircle
    },
    {
      title: 'Atendimentos IA vs Humano',
      value: '76%',
      subtitle: 'Resolvidos pela IA',
      trend: { value: '5%', isPositive: true },
      icon: MessageSquare
    }
  ];

  const channelData = [
    { name: 'WhatsApp', value: 45, color: 'bg-success' },
    { name: 'Instagram', value: 30, color: 'bg-primary' },
    { name: 'E-mail', value: 20, color: 'bg-warning' },
    { name: 'Telefone', value: 5, color: 'bg-muted' }
  ];

  const recentChats = [
    {
      id: 1,
      client: 'Maria Silva',
      channel: 'WhatsApp',
      lastMessage: 'Preciso de ajuda com meu pedido #1234',
      time: '2 min atrás',
      status: 'pendente',
      unread: 3
    },
    {
      id: 2,
      client: 'João Santos',
      channel: 'Instagram',
      lastMessage: 'Quando vai chegar minha encomenda?',
      time: '5 min atrás',
      status: 'em_andamento',
      unread: 0
    },
    {
      id: 3,
      client: 'Ana Costa',
      channel: 'E-mail',
      lastMessage: 'Gostaria de cancelar minha assinatura',
      time: '10 min atrás',
      status: 'pendente',
      unread: 1
    }
  ];

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
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral dos atendimentos e métricas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Channel Distribution */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Distribuição por Canal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelData.map((channel) => (
                  <div key={channel.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${channel.color}`} />
                      <span className="text-sm font-medium">{channel.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${channel.color}`}
                          style={{ width: `${channel.value}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">
                        {channel.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Chats */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Conversas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentChats.map((chat) => (
                  <div key={chat.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-shrink-0">
                      {getChannelIcon(chat.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium truncate">{chat.client}</h4>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(chat.status)}`}>
                          {chat.status === 'pendente' ? 'Pendente' : 
                           chat.status === 'em_andamento' ? 'Em andamento' : 'Concluído'}
                        </span>
                        {chat.unread > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics and Export */}
          <MetricsCard />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;