import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  MessageCircle, 
  Mail, 
  Phone, 
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  Bot,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Atendimentos = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(1);
  const [messageText, setMessageText] = useState('');

  const chats = [
    {
      id: 1,
      client: 'Maria Silva',
      channel: 'WhatsApp',
      status: 'pendente',
      lastMessage: 'Preciso de ajuda com meu pedido #1234',
      time: '2 min atrás',
      unread: 3,
      avatar: 'MS'
    },
    {
      id: 2,
      client: 'João Santos',
      channel: 'Instagram',
      status: 'em_andamento',
      lastMessage: 'Quando vai chegar minha encomenda?',
      time: '5 min atrás',
      unread: 0,
      avatar: 'JS'
    },
    {
      id: 3,
      client: 'Ana Costa',
      channel: 'E-mail',
      status: 'pendente',
      lastMessage: 'Gostaria de cancelar minha assinatura',
      time: '10 min atrás',
      unread: 1,
      avatar: 'AC'
    },
    {
      id: 4,
      client: 'Pedro Lima',
      channel: 'Telefone',
      status: 'concluido',
      lastMessage: 'Muito obrigado pelo atendimento!',
      time: '1 hora atrás',
      unread: 0,
      avatar: 'PL'
    }
  ];

  const messages = [
    {
      id: 1,
      sender: 'client',
      content: 'Olá! Preciso de ajuda com meu pedido #1234',
      time: '14:32',
      type: 'text'
    },
    {
      id: 2,
      sender: 'ai',
      content: 'Olá Maria! Vou te ajudar com seu pedido. Deixe-me consultar as informações.',
      time: '14:33',
      type: 'text'
    },
    {
      id: 3,
      sender: 'ai',
      content: 'Encontrei seu pedido! Está em processo de separação no nosso centro de distribuição. Previsão de entrega: 2 dias úteis.',
      time: '14:33',
      type: 'text'
    },
    {
      id: 4,
      sender: 'client',
      content: 'Mas eu preciso muito do produto para amanhã. Não tem como acelerar?',
      time: '14:35',
      type: 'text'
    },
    {
      id: 5,
      sender: 'human',
      content: 'Olá Maria, sou o atendente Carlos. Vou verificar se conseguimos uma entrega expressa para você.',
      time: '14:40',
      type: 'text'
    }
  ];

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return { className: 'bg-warning/10 text-warning border-warning/20', label: 'Pendente' };
      case 'em_andamento':
        return { className: 'bg-primary/10 text-primary border-primary/20', label: 'Em andamento' };
      case 'concluido':
        return { className: 'bg-success/10 text-success border-success/20', label: 'Concluído' };
      default:
        return { className: 'bg-muted/10 text-muted-foreground border-muted/20', label: 'Desconhecido' };
    }
  };

  const getSenderInfo = (sender: string) => {
    switch (sender) {
      case 'client':
        return { icon: User, color: 'bg-muted', label: 'Cliente' };
      case 'ai':
        return { icon: Bot, color: 'bg-primary', label: 'IA' };
      case 'human':
        return { icon: User, color: 'bg-success', label: 'Atendente' };
      default:
        return { icon: User, color: 'bg-muted', label: 'Sistema' };
    }
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Aqui seria enviada a mensagem via API
      setMessageText('');
    }
  };

  const selectedChatData = chats.find(chat => chat.id === selectedChat);

  return (
    <Layout>
      <div className="space-y-6 h-[calc(100vh-8rem)]">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Atendimentos</h1>
          <p className="text-muted-foreground">
            Gerencie todas as conversas em tempo real
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Chat List */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversas</CardTitle>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {chats.map((chat) => {
                  const status = getStatusBadge(chat.status);
                  return (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      className={cn(
                        "p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/50",
                        selectedChat === chat.id && "bg-primary-muted border-l-4 border-l-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {chat.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium truncate">{chat.client}</h4>
                            <span className="text-xs text-muted-foreground">{chat.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mb-2">
                            {chat.lastMessage}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getChannelIcon(chat.channel)}
                              <Badge variant="outline" className={status.className}>
                                {status.label}
                              </Badge>
                            </div>
                            {chat.unread > 0 && (
                              <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {chat.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedChatData ? (
              <Card className="shadow-card h-full flex flex-col">
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {selectedChatData.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedChatData.client}</h3>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(selectedChatData.channel)}
                          <span className="text-sm text-muted-foreground">{selectedChatData.channel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusBadge(selectedChatData.status).className}>
                        {getStatusBadge(selectedChatData.status).label}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Encerrar
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const senderInfo = getSenderInfo(message.sender);
                      const SenderIcon = senderInfo.icon;
                      
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            message.sender === 'client' ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            senderInfo.color,
                            message.sender === 'client' ? "bg-muted" : senderInfo.color
                          )}>
                            <SenderIcon className={cn(
                              "w-4 h-4",
                              message.sender === 'client' ? "text-muted-foreground" : "text-white"
                            )} />
                          </div>
                          <div className={cn(
                            "max-w-[70%] space-y-1",
                            message.sender === 'client' ? "items-end" : "items-start"
                          )}>
                            <div className={cn(
                              "px-4 py-2 rounded-lg",
                              message.sender === 'client' 
                                ? "bg-primary text-primary-foreground ml-auto" 
                                : message.sender === 'ai'
                                ? "bg-muted text-muted-foreground"
                                : "bg-success/10 text-success-foreground border border-success/20"
                            )}>
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1 text-xs text-muted-foreground",
                              message.sender === 'client' ? "justify-end" : "justify-start"
                            )}>
                              <span>{senderInfo.label}</span>
                              <span>•</span>
                              <span>{message.time}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="resize-none"
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className="px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="shadow-card h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Selecione uma conversa para começar</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Atendimentos;