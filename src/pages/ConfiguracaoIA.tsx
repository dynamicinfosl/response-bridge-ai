import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Settings, 
  Brain,
  MessageSquare,
  Phone,
  Mail,
  Zap,
  Shield,
  Target,
  Clock,
  Save,
  TestTube,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const ConfiguracaoIA = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    // Configurações Gerais
    enabled: true,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    language: 'pt-BR',
    
    // Configurações de Resposta
    responseStyle: 'profissional',
    autoResponse: true,
    responseDelay: 2,
    maxResponseTime: 30,
    
    // Configurações de Canal
    whatsapp: {
      enabled: true,
      greeting: 'Olá! Sou a IA da Adapt Link. Como posso ajudá-lo hoje?',
      fallback: 'Desculpe, não consegui entender. Vou transferir você para um atendente humano.',
      workingHours: '08:00-18:00'
    },
    instagram: {
      enabled: true,
      greeting: 'Oi! 👋 Sou a IA da Adapt Link. Em que posso ajudar?',
      fallback: 'Ops! Não entendi bem. Vou chamar um humano para te ajudar! 😊',
      workingHours: '09:00-19:00'
    },
    email: {
      enabled: true,
      greeting: 'Olá! Recebi sua mensagem e estou aqui para ajudar.',
      fallback: 'Sua mensagem foi encaminhada para nossa equipe de atendimento.',
      workingHours: '24/7'
    },
    phone: {
      enabled: true,
      greeting: 'Olá! Sou a assistente virtual da Adapt Link. Como posso ajudá-lo?',
      fallback: 'Vou transferir sua chamada para um de nossos atendentes.',
      workingHours: '08:00-18:00'
    },
    
    // Configurações de Aprendizado
    learningEnabled: true,
    feedbackCollection: true,
    conversationAnalysis: true,
    improvementSuggestions: true,
    
    // Configurações de Segurança
    dataRetention: 30,
    privacyMode: true,
    contentFilter: true,
    escalationRules: true
  });

  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simular salvamento
    setTimeout(() => {
      toast({
        title: "Configurações salvas!",
        description: "As configurações da IA foram atualizadas com sucesso.",
      });
      setIsLoading(false);
    }, 2000);
  };

  const handleTest = () => {
    toast({
      title: "Teste iniciado!",
      description: "Testando configurações da IA...",
    });
  };

  const handleReset = () => {
    toast({
      title: "Configurações resetadas!",
      description: "Voltando para as configurações padrão.",
    });
  };

  const updateSetting = (path: string, value: any) => {
    setAiSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const channelConfigs = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: MessageSquare,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    },
    {
      id: 'email',
      name: 'E-mail',
      icon: Mail,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'phone',
      name: 'Telefone',
      icon: Phone,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuração de IA</h1>
            <p className="text-muted-foreground">
              Configure e personalize a inteligência artificial do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest}>
              <TestTube className="w-4 h-4 mr-2" />
              Testar IA
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:shadow-primary">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* AI Status */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Status da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">IA Adapt Link</h3>
                  <p className="text-sm text-muted-foreground">Modelo: {aiSettings.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  "text-xs",
                  aiSettings.enabled 
                    ? "bg-success/10 text-success border-success/20" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}>
                  {aiSettings.enabled ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ativa
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Inativa
                    </>
                  )}
                </Badge>
                <Switch
                  checked={aiSettings.enabled}
                  onCheckedChange={(checked) => updateSetting('enabled', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configurações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo de IA</Label>
                <select
                  id="model"
                  value={aiSettings.model}
                  onChange={(e) => updateSetting('model', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                  <option value="custom">Modelo Personalizado</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <select
                  id="language"
                  value={aiSettings.language}
                  onChange={(e) => updateSetting('language', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura: {aiSettings.temperature}</Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiSettings.temperature}
                  onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Conservador</span>
                  <span>Criativo</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Máximo de Tokens: {aiSettings.maxTokens}</Label>
                <input
                  id="maxTokens"
                  type="range"
                  min="100"
                  max="4000"
                  step="100"
                  value={aiSettings.maxTokens}
                  onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Respostas curtas</span>
                  <span>Respostas longas</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel Configurations */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Configurações por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {channelConfigs.map((channel) => (
                <div key={channel.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", channel.bgColor)}>
                        <channel.icon className={cn("w-4 h-4", channel.color)} />
                      </div>
                      <h3 className="font-semibold">{channel.name}</h3>
                    </div>
                    <Switch
                      checked={aiSettings[channel.id].enabled}
                      onCheckedChange={(checked) => updateSetting(`${channel.id}.enabled`, checked)}
                    />
                  </div>

                  {aiSettings[channel.id].enabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${channel.id}-greeting`}>Mensagem de Boas-vindas</Label>
                        <Textarea
                          id={`${channel.id}-greeting`}
                          value={aiSettings[channel.id].greeting}
                          onChange={(e) => updateSetting(`${channel.id}.greeting`, e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${channel.id}-fallback`}>Mensagem de Fallback</Label>
                        <Textarea
                          id={`${channel.id}-fallback`}
                          value={aiSettings[channel.id].fallback}
                          onChange={(e) => updateSetting(`${channel.id}.fallback`, e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${channel.id}-hours`}>Horário de Funcionamento</Label>
                        <Input
                          id={`${channel.id}-hours`}
                          value={aiSettings[channel.id].workingHours}
                          onChange={(e) => updateSetting(`${channel.id}.workingHours`, e.target.value)}
                          placeholder="Ex: 08:00-18:00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Response Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Configurações de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="responseStyle">Estilo de Resposta</Label>
                <select
                  id="responseStyle"
                  value={aiSettings.responseStyle}
                  onChange={(e) => updateSetting('responseStyle', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="profissional">Profissional</option>
                  <option value="amigavel">Amigável</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseDelay">Delay de Resposta (segundos): {aiSettings.responseDelay}</Label>
                <input
                  id="responseDelay"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={aiSettings.responseDelay}
                  onChange={(e) => updateSetting('responseDelay', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxResponseTime">Tempo Máximo de Resposta (segundos): {aiSettings.maxResponseTime}</Label>
                <input
                  id="maxResponseTime"
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={aiSettings.maxResponseTime}
                  onChange={(e) => updateSetting('maxResponseTime', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoResponse"
                  checked={aiSettings.autoResponse}
                  onCheckedChange={(checked) => updateSetting('autoResponse', checked)}
                />
                <Label htmlFor="autoResponse">Resposta Automática</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning & Security */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Aprendizado e Melhoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="learningEnabled">Aprendizado Ativo</Label>
                  <p className="text-xs text-muted-foreground">A IA aprende com as conversas</p>
                </div>
                <Switch
                  id="learningEnabled"
                  checked={aiSettings.learningEnabled}
                  onCheckedChange={(checked) => updateSetting('learningEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="feedbackCollection">Coleta de Feedback</Label>
                  <p className="text-xs text-muted-foreground">Solicita avaliações dos usuários</p>
                </div>
                <Switch
                  id="feedbackCollection"
                  checked={aiSettings.feedbackCollection}
                  onCheckedChange={(checked) => updateSetting('feedbackCollection', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="conversationAnalysis">Análise de Conversas</Label>
                  <p className="text-xs text-muted-foreground">Analisa padrões nas conversas</p>
                </div>
                <Switch
                  id="conversationAnalysis"
                  checked={aiSettings.conversationAnalysis}
                  onCheckedChange={(checked) => updateSetting('conversationAnalysis', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="improvementSuggestions">Sugestões de Melhoria</Label>
                  <p className="text-xs text-muted-foreground">Gera sugestões automáticas</p>
                </div>
                <Switch
                  id="improvementSuggestions"
                  checked={aiSettings.improvementSuggestions}
                  onCheckedChange={(checked) => updateSetting('improvementSuggestions', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Segurança e Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Retenção de Dados (dias): {aiSettings.dataRetention}</Label>
                <input
                  id="dataRetention"
                  type="range"
                  min="1"
                  max="365"
                  step="1"
                  value={aiSettings.dataRetention}
                  onChange={(e) => updateSetting('dataRetention', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacyMode">Modo Privacidade</Label>
                  <p className="text-xs text-muted-foreground">Não armazena dados pessoais</p>
                </div>
                <Switch
                  id="privacyMode"
                  checked={aiSettings.privacyMode}
                  onCheckedChange={(checked) => updateSetting('privacyMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="contentFilter">Filtro de Conteúdo</Label>
                  <p className="text-xs text-muted-foreground">Filtra conteúdo inadequado</p>
                </div>
                <Switch
                  id="contentFilter"
                  checked={aiSettings.contentFilter}
                  onCheckedChange={(checked) => updateSetting('contentFilter', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="escalationRules">Regras de Escalação</Label>
                  <p className="text-xs text-muted-foreground">Transfere para humanos quando necessário</p>
                </div>
                <Switch
                  id="escalationRules"
                  checked={aiSettings.escalationRules}
                  onCheckedChange={(checked) => updateSetting('escalationRules', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ConfiguracaoIA;
