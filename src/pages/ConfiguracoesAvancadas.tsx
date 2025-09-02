import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Webhook, 
  Bot, 
  MessageSquare, 
  Save,
  Plus,
  Trash2,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ConfiguracoesAvancadas = () => {
  const [horarioAtendimento, setHorarioAtendimento] = useState({
    segunda: { inicio: '08:00', fim: '18:00', ativo: true },
    terca: { inicio: '08:00', fim: '18:00', ativo: true },
    quarta: { inicio: '08:00', fim: '18:00', ativo: true },
    quinta: { inicio: '08:00', fim: '18:00', ativo: true },
    sexta: { inicio: '08:00', fim: '18:00', ativo: true },
    sabado: { inicio: '08:00', fim: '12:00', ativo: false },
    domingo: { inicio: '08:00', fim: '12:00', ativo: false }
  });

  const [webhooks, setWebhooks] = useState([
    { id: 1, name: 'Nova Mensagem', url: 'https://api.exemplo.com/nova-mensagem', ativo: true },
    { id: 2, name: 'Atendimento Encerrado', url: 'https://api.exemplo.com/encerrado', ativo: true },
    { id: 3, name: 'Atendente Atribuído', url: 'https://api.exemplo.com/atribuido', ativo: false }
  ]);

  const [respostasAutomaticas, setRespostasAutomaticas] = useState({
    boasVindas: 'Olá! Sou a IA da nossa empresa. Como posso ajudá-lo hoje?',
    foraExpediente: 'No momento estamos fora do horário de atendimento. Nossa equipe retorna às 08:00. Deixe sua mensagem que responderemos assim que possível!',
    transferencia: 'Vou transferir você para um dos nossos atendentes humanos. Um momento, por favor.',
    encerramento: 'Muito obrigado pelo contato! Se precisar de mais alguma coisa, estarei sempre aqui para ajudar.'
  });

  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configurações salvas!",
      description: "Todas as configurações avançadas foram atualizadas.",
    });
  };

  const testWebhook = (webhook: any) => {
    toast({
      title: "Testando webhook...",
      description: `Enviando requisição de teste para ${webhook.name}`,
    });
  };

  const addWebhook = () => {
    const newWebhook = {
      id: Date.now(),
      name: 'Novo Webhook',
      url: 'https://',
      ativo: true
    };
    setWebhooks([...webhooks, newWebhook]);
  };

  const removeWebhook = (id: number) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
  };

  const diasSemana = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações Avançadas</h1>
            <p className="text-muted-foreground">
              Configure horários, webhooks e automações
            </p>
          </div>
          <Button onClick={handleSave} className="bg-gradient-primary hover:shadow-primary">
            <Save className="w-4 h-4 mr-2" />
            Salvar Tudo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Horário de Atendimento */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Horário de Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Configure os horários em que o atendimento humano estará disponível. 
                  Fora desse horário, apenas a IA responderá.
                </p>
                
                <div className="grid gap-4">
                  {diasSemana.map((dia) => {
                    const horario = horarioAtendimento[dia.key as keyof typeof horarioAtendimento];
                    return (
                      <div key={dia.key} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                        <div className="w-32">
                          <Switch
                            checked={horario.ativo}
                            onCheckedChange={(checked) => 
                              setHorarioAtendimento(prev => ({
                                ...prev,
                                [dia.key]: { ...prev[dia.key as keyof typeof prev], ativo: checked }
                              }))
                            }
                          />
                          <Label className="ml-2 text-sm">{dia.label}</Label>
                        </div>
                        
                        {horario.ativo && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={horario.inicio}
                              onChange={(e) => 
                                setHorarioAtendimento(prev => ({
                                  ...prev,
                                  [dia.key]: { ...prev[dia.key as keyof typeof prev], inicio: e.target.value }
                                }))
                              }
                              className="w-24"
                            />
                            <span className="text-muted-foreground">às</span>
                            <Input
                              type="time"
                              value={horario.fim}
                              onChange={(e) => 
                                setHorarioAtendimento(prev => ({
                                  ...prev,
                                  [dia.key]: { ...prev[dia.key as keyof typeof prev], fim: e.target.value }
                                }))
                              }
                              className="w-24"
                            />
                          </div>
                        )}
                        
                        {!horario.ativo && (
                          <Badge variant="outline" className="bg-muted/10 text-muted-foreground">
                            Fechado
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-primary" />
                  Webhooks
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addWebhook}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure URLs para receber notificações de eventos do sistema.
                </p>
                
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="border border-border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={webhook.name}
                        onChange={(e) => 
                          setWebhooks(prev => prev.map(w => 
                            w.id === webhook.id ? { ...w, name: e.target.value } : w
                          ))
                        }
                        className="font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.ativo}
                          onCheckedChange={(checked) =>
                            setWebhooks(prev => prev.map(w => 
                              w.id === webhook.id ? { ...w, ativo: checked } : w
                            ))
                          }
                        />
                        <Button variant="outline" size="sm" onClick={() => testWebhook(webhook)}>
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => removeWebhook(webhook.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={webhook.url}
                      onChange={(e) => 
                        setWebhooks(prev => prev.map(w => 
                          w.id === webhook.id ? { ...w, url: e.target.value } : w
                        ))
                      }
                      placeholder="https://api.exemplo.com/webhook"
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Respostas Automáticas */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Respostas Automáticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure as mensagens automáticas da IA para diferentes situações.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Boas-vindas</Label>
                    <Textarea
                      value={respostasAutomaticas.boasVindas}
                      onChange={(e) => 
                        setRespostasAutomaticas(prev => ({ ...prev, boasVindas: e.target.value }))
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Fora do expediente</Label>
                    <Textarea
                      value={respostasAutomaticas.foraExpediente}
                      onChange={(e) => 
                        setRespostasAutomaticas(prev => ({ ...prev, foraExpediente: e.target.value }))
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Transferência para humano</Label>
                    <Textarea
                      value={respostasAutomaticas.transferencia}
                      onChange={(e) => 
                        setRespostasAutomaticas(prev => ({ ...prev, transferencia: e.target.value }))
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Encerramento</Label>
                    <Textarea
                      value={respostasAutomaticas.encerramento}
                      onChange={(e) => 
                        setRespostasAutomaticas(prev => ({ ...prev, encerramento: e.target.value }))
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Instructions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Integração com N8N / Evolution API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-primary-muted p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-primary">Endpoints disponíveis:</h4>
              <div className="text-sm space-y-2 font-mono">
                <div><strong>POST</strong> /api/atendimentos - Criar novo atendimento</div>
                <div><strong>GET</strong> /api/atendimentos - Listar atendimentos</div>
                <div><strong>POST</strong> /api/mensagens - Enviar mensagem</div>
                <div><strong>PUT</strong> /api/atendimentos/{`{id}`} - Atualizar status</div>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure seu N8N para chamar esses endpoints e conecte com WhatsApp, Instagram e outros canais.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ConfiguracoesAvancadas;