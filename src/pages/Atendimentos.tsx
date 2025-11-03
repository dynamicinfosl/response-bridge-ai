import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TransferModal } from '@/components/atendimentos/TransferModal';
import { CloseTicketModal } from '@/components/atendimentos/CloseTicketModal';
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
  User,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChats, useMessages, useSendMessage } from '@/hooks/useChats';
import { Loader2 } from 'lucide-react';

const Atendimentos = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [chatsToShow, setChatsToShow] = useState<number>(20); // Quantidade inicial de chats a mostrar
  const [searchQuery, setSearchQuery] = useState<string>(''); // Busca de conversas

  // Buscar chats e mensagens da API
  const { data: chatsData, isLoading: chatsLoading, error: chatsError } = useChats();
  const { data: messagesData, isLoading: messagesLoading } = useMessages(selectedChat);
  const sendMessageMutation = useSendMessage();

  // Debug: Log de erro
  useEffect(() => {
    if (chatsError) {
      console.error('❌ Erro ao buscar chats:', chatsError);
    }
  }, [chatsError]);

  // Garantir que chats é sempre um array e normalizar os dados
  // O n8n pode retornar um objeto único ou um array
  const chats = (() => {
    if (!chatsData) return [];
    
    let rawChats: any[] = [];
    
    // Se já é um array, usa direto
    if (Array.isArray(chatsData)) {
      rawChats = chatsData;
    }
    // Se é um objeto, verifica se tem propriedade 'messages' (quando vem do json_agg)
    else if (typeof chatsData === 'object' && chatsData !== null) {
      // Se for um objeto com propriedade messages (array), é um resultado do json_agg
      if ('messages' in chatsData && Array.isArray((chatsData as any).messages)) {
        rawChats = (chatsData as any).messages;
      }
      // Se o objeto tem propriedades que indicam que é um chat (id, chatid, etc)
      else if ('id' in chatsData || 'chatid' in chatsData || 'pushName' in chatsData || 'pushname' in chatsData) {
        rawChats = [chatsData];
      }
      // Tenta encontrar arrays dentro
      else {
        const keys = Object.keys(chatsData);
        for (const key of keys) {
          const value = (chatsData as any)[key];
          if (Array.isArray(value) && value.length > 0) {
            if (value[0] && (value[0].id || value[0].chatid)) {
              rawChats = value;
              break;
            }
          }
        }
      }
      
      // Se não encontrou nada, transforma o objeto em array
      if (rawChats.length === 0) {
        rawChats = [chatsData];
      }
    }
    
    // Normalizar os dados: garantir que pushName, lastMessage sempre existam (mesmo que vazios)
    return rawChats.map(chat => ({
      ...chat,
      pushName: chat.pushName || chat.pushname || null,
      lastMessage: chat.lastMessage || chat.lastmessage || null,
      clientPhone: chat.clientPhone || chat.clientphone || chat.id,
    }));
  })();

  // Garantir que messages é sempre um array também
  const messages = Array.isArray(messagesData) 
    ? messagesData 
    : messagesData 
      ? [messagesData] // Se for um objeto, transforma em array
      : [];

  // Helper para formatar nome do cliente (prioridade: pushName > client > número formatado)
  const formatClientName = (chat: any) => {
    // Prioridade 1: pushName normalizado (já foi normalizado no processamento do array)
    if (chat.pushName && chat.pushName.trim() !== '') {
      return chat.pushName;
    }
    
    // Prioridade 2: Nome fornecido manualmente (client deve ser nome, não telefone)
    if (chat.client && chat.client.trim() !== '' && !chat.client.includes('@')) {
      return chat.client;
    }
    
    // Prioridade 3: Formatar número do WhatsApp
    if (chat.phone || chat.id) {
      const phone = chat.phone || chat.id || '';
      const number = phone.replace('@s.whatsapp.net', '').replace('@c.us', '');
      if (number.length === 11) {
        return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
      } else if (number.length >= 10) {
        return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
      }
      return number || 'Cliente';
    }
    
    return 'Cliente Desconhecido';
  };

  // Helper para formatar número de telefone do chatId
  const formatPhoneNumber = (chatId: string) => {
    if (!chatId) return '';
    // Remove @s.whatsapp.net e formata número
    let number = chatId.replace('@s.whatsapp.net', '').replace('@c.us', '');
    
    // Remove código do país (55) se existir no início
    if (number.startsWith('55') && number.length > 11) {
      number = number.substring(2);
    }
    
    // Formata como (XX) XXXXX-XXXX para celular (11 dígitos) ou (XX) XXXX-XXXX para fixo (10 dígitos)
    if (number.length === 11) {
      // Celular: (21) 98248-9052
      return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
    } else if (number.length === 10) {
      // Fixo: (21) 3456-7890
      return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
    }
    
    return number;
  };

  // Helper para obter iniciais do nome
  const getInitials = (name: string) => {
    if (!name) return '??';
    // Remove caracteres especiais e pega os primeiros caracteres
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase();
    if (cleanName.length >= 2) return cleanName;
    return '??';
  };

  // Helper para formatar tempo relativo
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Agora';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sim':
      case 'pendente':
        return { className: 'bg-warning/10 text-warning border-warning/20', label: 'Pendente' };
      case 'active':
      case 'em_andamento':
        return { className: 'bg-primary/10 text-primary border-primary/20', label: 'Em andamento' };
      case 'waiting':
        return { className: 'bg-warning/10 text-warning border-warning/20', label: 'Aguardando' };
      case 'concluido':
        return { className: 'bg-success/10 text-success border-success/20', label: 'Concluído' };
      default:
        return { className: 'bg-muted/10 text-muted-foreground border-muted/20', label: status || 'Desconhecido' };
    }
  };

  const getSenderInfo = (sender: string) => {
    switch (sender) {
      case 'client':
        return { icon: User, color: 'bg-muted', label: 'Cliente' };
      case 'agent':
        return { icon: Bot, color: 'bg-primary', label: 'Sistema' };
      case 'ai':
        return { icon: Bot, color: 'bg-primary', label: 'Sistema' };
      case 'human':
        return { icon: User, color: 'bg-success', label: 'Atendente' };
      default:
        return { icon: Bot, color: 'bg-primary', label: 'Sistema' };
    }
  };

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      sendMessageMutation.mutate({
        chatId: selectedChat,
        content: messageText,
        sender: 'agent'
      });
      setMessageText('');
    }
  };

  const selectedChatData = chats.find(chat => chat.id === selectedChat);

  // Filtrar chats por status e busca
  const filteredChats = chats.filter(chat => {
    // Filtro de status
    if (statusFilter !== 'all') {
      const chatStatus = chat.status || (chat as any).statusP;
      if (chatStatus !== statusFilter) return false;
    }
    
    // Filtro de busca (nome, telefone)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const clientName = formatClientName(chat).toLowerCase();
      const phoneNumber = formatPhoneNumber(chat.id);
      const rawPhone = chat.id.replace(/\D/g, '');
      
      return clientName.includes(query) || 
             phoneNumber.includes(query) || 
             rawPhone.includes(query);
    }
    
    return true;
  });

  // Paginar chats: mostrar apenas os primeiros X chats
  const displayedChats = filteredChats.slice(0, chatsToShow);
  const hasMoreChats = filteredChats.length > chatsToShow;

  // Função para carregar mais chats
  const loadMoreChats = () => {
    setChatsToShow(prev => prev + 20);
  };

  // Resetar paginação quando mudar o filtro
  useEffect(() => {
    setChatsToShow(20);
  }, [statusFilter]);

  // Debug: Log para verificar quantos chats estão sendo retornados
  useEffect(() => {
    if (chats.length > 0) {
      console.log('📊 Chats carregados:', chats.length);
      console.log('📝 Detalhes dos chats (normalizado):');
      chats.forEach((chat, idx) => {
        console.log(`  ${idx + 1}. ${formatClientName(chat)}`);
        console.log(`     - ID: ${chat.id}`);
        console.log(`     - pushName (normalizado): "${chat.pushName}"`);
        console.log(`     - lastMessage (normalizado): "${chat.lastMessage?.substring(0, 50)}..."`);
      });
    }
  }, [chats]);

  // Mostrar loading
  if (chatsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Carregando atendimentos...</span>
        </div>
      </Layout>
    );
  }

  // Mostrar erro
  if (chatsError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-2">Erro ao carregar atendimentos</p>
            <p className="text-sm text-muted-foreground">{String(chatsError)}</p>
          </div>
        </div>
      </Layout>
    );
  }

    return (
      <Layout>
        <div className="space-y-4 sm:space-y-6 h-[calc(100vh-8rem)] flex flex-col">
          {/* Page Header */}
          <div className="flex-shrink-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Atendimentos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie todas as conversas em tempo real
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">
          {/* Chat List */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">Conversas</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs border rounded px-2 py-1.5 w-full sm:w-auto"
                  >
                    <option value="all">Todos</option>
                    <option value="pendente">Pendentes</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluídos</option>
                  </select>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Filter className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Filtros</span>
                    <span className="sm:hidden">Filtrar</span>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum chat encontrado</p>
                  </div>
                ) : (
                  <>
                    {displayedChats.map((chat) => {
                    const status = getStatusBadge(chat.status || (chat as any).statusP);
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
                              {getInitials(formatClientName(chat))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate">
                                  {formatClientName(chat)}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {formatPhoneNumber(chat.id || chat.chatid || chat.phone || '')}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                {formatTimeAgo(chat.time || chat.updatedAt || '')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {chat.lastMessage || 'Iniciando conversa...'}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getChannelIcon(chat.channel || chat.WhatsApp || 'WhatsApp')}
                                <Badge variant="outline" className={status.className}>
                                  {status.label}
                                </Badge>
                                {chat.attendant && (
                                  <span className="text-xs text-muted-foreground">
                                    • {chat.attendant}
                                  </span>
                                )}
                              </div>
                              {chat.unread && chat.unread > 0 && (
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
                    {/* Botão "Ver mais" */}
                    {hasMoreChats && (
                      <div className="p-4 border-t border-border">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={loadMoreChats}
                        >
                          Ver mais ({filteredChats.length - chatsToShow} restantes)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {selectedChatData ? (
              <Card className="shadow-card h-full flex flex-col min-h-0">
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(formatClientName(selectedChatData))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {formatClientName(selectedChatData)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formatPhoneNumber(selectedChatData.id || selectedChatData.chatid || selectedChatData.phone || '')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getChannelIcon(selectedChatData.channel || selectedChatData.WhatsApp || 'WhatsApp')}
                          <span className="text-sm text-muted-foreground">
                            {selectedChatData.channel || selectedChatData.WhatsApp || 'WhatsApp'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusBadge(selectedChatData.status || (selectedChatData as any).statusP).className}>
                        {getStatusBadge(selectedChatData.status || (selectedChatData as any).statusP).label}
                      </Badge>
                      {(selectedChatData.status || (selectedChatData as any).statusP) !== 'concluido' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowTransferModal(true)}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Transferir
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowCloseModal(true)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Encerrar
                          </Button>
                        </>
                      )}
                      {(selectedChatData.status || (selectedChatData as any).statusP) === 'concluido' && (
                        <Button variant="outline" size="sm">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages - Estilo WhatsApp */}
                <CardContent className="flex-1 p-0 flex flex-col min-h-0 bg-[#efeae2]" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}>
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-[#54656f]" />
                          <p className="text-[#54656f] font-medium">Nenhuma mensagem ainda</p>
                          <p className="text-[#8696a0] text-sm mt-1">Inicie a conversa</p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isClient = message.sender === 'client';
                        const isAgent = message.sender === 'agent' || message.sender === 'ai';
                        
                        // Verifica se é o mesmo remetente da mensagem anterior (para agrupar)
                        const prevMessage = index > 0 ? messages[index - 1] : null;
                        const isSameSender = prevMessage && prevMessage.sender === message.sender;
                        
                        // Formata horário (HH:MM) - corrige timezone
                        const getMessageTime = () => {
                          const timestamp = message.timestamp || message.time;
                          if (!timestamp) return '';
                          
                          try {
                            let date: Date;
                            
                            // Se o timestamp não tem 'Z' ou timezone, assume UTC e converte para local
                            if (typeof timestamp === 'string') {
                              // Se já tem timezone info, usa direto
                              if (timestamp.includes('Z') || timestamp.includes('+') || timestamp.includes('-', 10)) {
                                date = new Date(timestamp);
                              } else {
                                // Se não tem timezone, assume UTC (Postgres retorna em UTC)
                                date = new Date(timestamp + 'Z');
                              }
                            } else {
                              date = new Date(timestamp);
                            }
                            
                            if (isNaN(date.getTime())) return '';
                            
                            // Obtém horas e minutos no timezone local do navegador
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            
                            return `${hours}:${minutes}`;
                          } catch (error) {
                            console.error('Erro ao formatar horário:', error, timestamp);
                            return '';
                          }
                        };
                        
                        const messageTime = getMessageTime();
                        
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-2 mb-1",
                              isClient ? "justify-start" : "justify-end"
                            )}
                          >
                            {/* Avatar apenas quando muda o remetente */}
                            {!isSameSender && (
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                                isClient ? "bg-[#dfe5e7]" : "bg-[#34b7f1]"
                              )}>
                                {isClient ? (
                                  <User className="w-4 h-4 text-[#54656f]" />
                                ) : (
                                  <Bot className="w-4 h-4 text-white" />
                                )}
                              </div>
                            )}
                            
                            {/* Espaçador quando não tem avatar */}
                            {isSameSender && <div className="w-8 flex-shrink-0" />}
                            
                            <div className={cn(
                              "relative max-w-[75%] group",
                              isClient ? "ml-0" : "mr-0"
                            )}>
                              {/* Balão de mensagem estilo WhatsApp */}
                              <div className={cn(
                                "px-3 py-2 rounded-lg shadow-sm relative",
                                isClient
                                  ? "bg-white text-[#111b21] rounded-tl-none" // Branco para cliente (esquerda)
                                  : "bg-[#d9e5ff] text-[#111b21] rounded-tr-none", // Azul claro para agente (direita)
                                // Ajusta o rabinho baseado no agrupamento
                                isSameSender && (
                                  isClient 
                                    ? "" 
                                    : ""
                                )
                              )}>
                                {/* Conteúdo da mensagem */}
                                <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                                
                                {/* Horário e status dentro do balão */}
                                <div className={cn(
                                  "flex items-center gap-1 mt-1",
                                  isClient ? "justify-start" : "justify-end"
                                )}>
                                  <span className="text-[11px] text-[#667781]">
                                    {messageTime || formatTimeAgo(message.timestamp || message.time || '')}
                                  </span>
                                  {!isClient && (
                                    <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>

                {/* Message Input - Estilo WhatsApp */}
                <div className="p-3 bg-[#f0f2f5] border-t border-[#e9edef]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-lg">
                      <Input
                        placeholder="Digite uma mensagem"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-11"
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className={cn(
                        "h-11 w-11 p-0 rounded-full",
                        messageText.trim() 
                          ? "bg-[#25d366] hover:bg-[#20ba5a]" 
                          : "bg-[#8696a0] hover:bg-[#667781]"
                      )}
                    >
                      <Send className="w-5 h-5 text-white" />
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

        {/* Modals */}
        {selectedChatData && (
          <>
            <TransferModal
              isOpen={showTransferModal}
              onClose={() => setShowTransferModal(false)}
              clientName={selectedChatData.client || selectedChatData.phone || 'Cliente'}
              currentAttendant={selectedChatData.attendant || undefined}
            />
            <CloseTicketModal
              isOpen={showCloseModal}
              onClose={() => setShowCloseModal(false)}
              clientName={selectedChatData.client || selectedChatData.phone || 'Cliente'}
              ticketData={{
                startTime: formatTimeAgo(selectedChatData.createdAt || ''),
                totalMessages: messages.length,
                aiMessages: messages.filter((m: any) => m.sender === 'ai').length,
                humanMessages: messages.filter((m: any) => m.sender === 'agent').length,
                channel: selectedChatData.channel || selectedChatData.WhatsApp || 'WhatsApp'
              }}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default Atendimentos;