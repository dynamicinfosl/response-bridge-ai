import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Play,
  Pause,
  Square,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LigacoesIA = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState('00:00');
  const [searchTerm, setSearchTerm] = useState('');

  const recentCalls = [
    {
      id: 1,
      client: 'Maria Silva',
      phone: '+55 11 99999-9999',
      duration: '05:32',
      status: 'completed',
      date: '2024-01-15 14:30',
      aiTranscription: 'Cliente solicitou informações sobre produto X. IA forneceu detalhes completos.',
      satisfaction: 5
    },
    {
      id: 2,
      client: 'João Santos',
      phone: '+55 11 88888-8888',
      duration: '03:15',
      status: 'completed',
      date: '2024-01-15 13:45',
      aiTranscription: 'Cliente com dúvida sobre entrega. IA resolveu questão e agendou follow-up.',
      satisfaction: 4
    },
    {
      id: 3,
      client: 'Ana Costa',
      phone: '+55 11 77777-7777',
      duration: '00:45',
      status: 'missed',
      date: '2024-01-15 12:20',
      aiTranscription: 'Chamada perdida. IA deixou mensagem automática.',
      satisfaction: null
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'missed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'in-progress':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'missed':
        return 'Perdida';
      case 'in-progress':
        return 'Em andamento';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'missed':
        return <AlertCircle className="w-4 h-4" />;
      case 'in-progress':
        return <Clock className="w-4 h-4" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    // Simular duração da chamada
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setCallDuration(`${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`);
    }, 1000);

    // Simular fim da chamada após 10 segundos
    setTimeout(() => {
      setIsCallActive(false);
      clearInterval(interval);
      setCallDuration('00:00');
    }, 10000);
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallDuration('00:00');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ligações com IA</h1>
            <p className="text-muted-foreground">
              Gerencie chamadas telefônicas automatizadas com inteligência artificial
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
            <Button className="bg-gradient-primary hover:shadow-primary">
              <Phone className="w-4 h-4 mr-2" />
              Nova Ligação
            </Button>
          </div>
        </div>

        {/* Call Interface */}
        {isCallActive && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Chamada Ativa com IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                  <Bot className="w-10 h-10 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">IA Atendendo</h3>
                  <p className="text-muted-foreground">Cliente: +55 11 99999-9999</p>
                  <p className="text-2xl font-mono font-bold text-primary">{callDuration}</p>
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant={isSpeakerOn ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  >
                    {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={endCall}
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ligações Hoje</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <Phone className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Resolução</p>
                  <p className="text-2xl font-bold">87%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold">3.2min</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por cliente, telefone ou transcrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-primary" />
              Ligações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {call.client.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{call.client}</h4>
                      <p className="text-sm text-muted-foreground">{call.phone}</p>
                      <p className="text-xs text-muted-foreground">{call.date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{call.duration}</p>
                      <Badge className={cn("text-xs", getStatusBadge(call.status))}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(call.status)}
                          {getStatusLabel(call.status)}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="text-right min-w-[200px]">
                      <p className="text-xs text-muted-foreground mb-1">Transcrição IA:</p>
                      <p className="text-sm">{call.aiTranscription}</p>
                      {call.satisfaction && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">Satisfação:</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={cn(
                                "text-xs",
                                i < call.satisfaction ? "text-warning" : "text-muted-foreground"
                              )}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
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

export default LigacoesIA;
