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
// import { useClientNames } from '@/hooks/useClientNames';

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
    console.log('🔍 Iniciando normalização de chats. chatsData:', chatsData);
    
    if (!chatsData) {
      console.log('⚠️ chatsData é null/undefined');
      return [];
    }
    
    let rawChats: any[] = [];
    
    // Se já é um array, usa direto
    if (Array.isArray(chatsData)) {
      console.log('📦 chatsData é array com', chatsData.length, 'itens');
      rawChats = chatsData;
      // Filtrar objetos que claramente não são chats (ex: {success: true})
      rawChats = rawChats.filter(item => {
        if (!item || typeof item !== 'object') return false;
        
        // Se tem 'json' dentro, é um chat válido (formato do n8n)
        if ('json' in item && typeof item.json === 'object') {
          return true;
        }
        
        // Se tem apenas 'success' ou 'pairedItem' (sem json), não é um chat
        const keys = Object.keys(item);
        if (keys.length <= 2 && (keys.includes('success') || keys.includes('pairedItem'))) {
          console.log('🚫 Filtrando item não-chat:', item);
          return false;
        }
        
        // Se tem id, chatid, pushName, etc, é um chat válido
        if ('id' in item || 'chatid' in item || 'pushName' in item || 'pushname' in item) {
          return true;
        }
        
        return true;
      });
      console.log('📦 Após filtrar não-chats:', rawChats.length, 'itens');
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
      
      // Se não encontrou nada, não cria chat fantasma - retorna array vazio
      // (removido: não criar chat a partir de objeto vazio)
    }
    
    // Extrair dados de dentro de objetos {json: {...}} se existir (formato do n8n)
    console.log('🔄 Extraindo json de', rawChats.length, 'itens');
    rawChats = rawChats.map((item, idx) => {
      // Se o item tem uma propriedade 'json' e é um objeto, extrai o json
      if (item && typeof item === 'object' && 'json' in item && typeof item.json === 'object') {
        console.log(`✅ Item ${idx}: extraindo json`, item.json);
        return item.json;
      }
      console.log(`📄 Item ${idx}: usando direto`, item);
      return item;
    });
    console.log('🔄 Após extrair json:', rawChats.length, 'itens');
    
    // Normalizar os dados e filtrar chats inválidos
    const normalizedChats = rawChats
      .map(chat => {
        // Tratar pushName: remover \n e converter string "null" para null real
        let pushName = chat.pushName || chat.pushname || null;
        if (typeof pushName === 'string') {
          pushName = pushName.trim().replace(/\n/g, '');
          if (pushName === '' || pushName === 'null' || pushName === 'undefined') {
            pushName = null;
          }
        }
        
        // Preservar id original (pode ser string ou número)
        const chatId = chat.id?.toString() || chat.chatid?.toString() || null;
        const phone = chat.phone?.toString() || chat.id?.toString() || chat.chatid?.toString() || null;
        
        const normalized = {
          ...chat,
          id: chatId,
          phone: phone,
          pushName: pushName,
          lastMessage: chat.lastMessage || chat.lastmessage || null,
          clientPhone: chat.clientPhone || chat.clientphone || chatId || phone || null,
        };
        
        return normalized;
      })
      .filter(chat => {
        // Filtrar chats inválidos: deve ter id válido (não null, não vazio, não só espaços)
        const validId = chat.id && 
                       typeof chat.id === 'string' && 
                       chat.id.trim() !== '' && 
                       chat.id !== 'null' && 
                       chat.id !== 'undefined' &&
                       chat.id.length >= 5; // Deve ter pelo menos 5 caracteres (número de telefone mínimo)
        
        // Ignorar objetos que são apenas respostas de sucesso (ex: {success: true})
        const isSuccessResponse = chat.success === true && !chat.id && !chat.chatid;
        
        const isValid = validId && !isSuccessResponse;
        
        if (!isValid && chat.id) {
          console.warn('Chat filtrado (inválido):', { id: chat.id, phone: chat.phone, pushName: chat.pushName });
        }
        
        return isValid;
      });
    
    // Debug: Log dos chats normalizados
    if (normalizedChats.length > 0) {
      console.log('✅ Chats normalizados:', normalizedChats.length, normalizedChats);
    } else if (rawChats.length > 0) {
      console.warn('⚠️ Chats foram filtrados! Raw chats:', rawChats);
    }
    
    return normalizedChats;
  })();

  // Garantir que messages é sempre um array também e normalizar
  const messages = (() => {
    console.log('🔍 Iniciando normalização de mensagens. messagesData:', messagesData);
    
    if (!messagesData) {
      console.log('⚠️ messagesData é null/undefined');
      return [];
    }
    
    let rawMessages: any[] = [];
    
    // Se já é um array, usa direto
    if (Array.isArray(messagesData)) {
      console.log('📦 messagesData é array com', messagesData.length, 'itens');
      rawMessages = messagesData;
    } else if (messagesData) {
      console.log('📦 messagesData é objeto, convertendo para array');
      rawMessages = [messagesData];
    }
    
    // Extrair dados de dentro de objetos {json: {...}} se existir (formato do n8n)
    console.log('🔄 Extraindo json de', rawMessages.length, 'mensagens');
    rawMessages = rawMessages.map((item, idx) => {
      // Se o item tem uma propriedade 'json' e é um objeto, extrai o json
      if (item && typeof item === 'object' && 'json' in item && typeof item.json === 'object') {
        console.log(`✅ Mensagem ${idx}: extraindo json`, item.json);
        return item.json;
      }
      console.log(`📄 Mensagem ${idx}: usando direto`, item);
      return item;
    });
    console.log('🔄 Após extrair json:', rawMessages.length, 'mensagens');
    
    // Normalizar e ordenar mensagens
    const normalizedMessages = rawMessages
      .map((msg, idx) => {
        console.log(`📝 Normalizando mensagem ${idx}:`, msg);
        // Preservar timestamp original (prioridade: timestamp > time > createdat)
        let timestamp = msg.timestamp || msg.time || msg.createdat;
        
        // Se timestamp não tem timezone, adiciona 'Z' para indicar UTC
        if (timestamp && typeof timestamp === 'string' && !timestamp.includes('Z') && !timestamp.match(/[+-]\d{2}:\d{2}$/)) {
          // Se é formato ISO sem timezone, adiciona Z
          if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            timestamp = timestamp + 'Z';
          }
        }
        
        return {
          id: msg.id?.toString() || `msg_${Date.now()}_${Math.random()}`,
          chatId: msg.chatId || msg.chatid || selectedChat || '',
          content: msg.content || '',
          sender: msg.sender === 'client' ? 'user' : (msg.sender === 'agent' || msg.sender === 'ai' ? 'agent' : (msg.sender === 'user' ? 'user' : 'user')),
          timestamp: timestamp || new Date().toISOString(),
          read: msg.read || false,
        };
      })
      .filter(msg => {
        const isValid = msg.content && msg.chatId;
        if (!isValid) {
          console.warn('🚫 Mensagem filtrada (inválida):', msg);
        }
        return isValid;
      })
      .sort((a, b) => {
        // Ordena por timestamp (mais antigas primeiro)
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        if (isNaN(timeA) || isNaN(timeB)) return 0; // Mantém ordem original se timestamp inválido
        return timeA - timeB;
      });
    
    console.log('✅ Mensagens normalizadas:', normalizedMessages.length, normalizedMessages);
    console.log('📊 Por sender:', {
      user: normalizedMessages.filter(m => m.sender === 'user').length,
      agent: normalizedMessages.filter(m => m.sender === 'agent').length,
    });
    
    return normalizedMessages;
  })();

  // Preservar nomes no localStorage (temporário até Supabase funcionar)
  const preservedNames = JSON.parse(localStorage.getItem('preservedChatNames') || '{}');

  // Função para salvar nome no localStorage
  const saveNameToStorage = (chatId: string, name: string) => {
    const cleanChatId = chatId.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const invalidNames = ['agente de ia', 'agente', 'ia', 'bot', 'assistente', 'sistema', 'lucas'];
    
    if (name && name.length >= 2 && !invalidNames.some(invalid => name.toLowerCase().includes(invalid))) {
      const updated = { ...preservedNames, [cleanChatId]: name };
      localStorage.setItem('preservedChatNames', JSON.stringify(updated));
      console.log('💾 Nome salvo no localStorage:', { chatId: cleanChatId, name });
    }
  };

  // Função para buscar nome no localStorage
  const getNameFromStorage = (chatId: string): string | null => {
    const cleanChatId = chatId.replace('@s.whatsapp.net', '').replace('@c.us', '');
    return preservedNames[cleanChatId] || null;
  };

  // Helper para formatar nome do cliente
  const formatClientName = (chat: any) => {
    const chatId = chat.id || chat.chatid || chat.phone || '';
    
    // PRIORIDADE 1: Nome salvo no localStorage
    const savedName = getNameFromStorage(chatId);
    if (savedName) {
      return savedName;
    }
    
    // PRIORIDADE 2: pushName (nome do WhatsApp) - salvar se for válido
    let pushName = chat.pushName || chat.pushname || null;
    if (typeof pushName === 'string') {
      pushName = pushName.trim().replace(/\n/g, '');
      if (pushName && pushName !== '' && pushName !== 'null' && pushName !== 'undefined') {
        const lowerPushName = pushName.toLowerCase();
        const invalidNames = ['agente de ia', 'agente', 'ia', 'bot', 'assistente', 'sistema', 'lucas'];
        if (!invalidNames.some(invalid => lowerPushName.includes(invalid))) {
          saveNameToStorage(chatId, pushName);
          return pushName;
        }
      }
    }
    
    // PRIORIDADE 3: Nome fornecido manualmente (client)
    if (chat.client && chat.client.trim() !== '' && !chat.client.includes('@')) {
      const lowerClient = chat.client.toLowerCase();
      const invalidNames = ['agente de ia', 'agente', 'ia', 'bot', 'assistente', 'sistema', 'lucas'];
      if (!invalidNames.some(invalid => lowerClient.includes(invalid))) {
        saveNameToStorage(chatId, chat.client.trim());
        return chat.client.trim();
      }
    }
    
    // PRIORIDADE 4: Formatar número do WhatsApp (fallback)
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
                        // Corrigir: sender pode ser 'user' (cliente) ou 'agent' (agente)
                        const isClient = message.sender === 'user' || message.sender === 'client';
                        const isAgent = message.sender === 'agent' || message.sender === 'ai';
                        
                        // Verifica se é o mesmo remetente da mensagem anterior (para agrupar)
                        const prevMessage = index > 0 ? messages[index - 1] : null;
                        const isSameSender = prevMessage && (
                          (prevMessage.sender === message.sender) ||
                          ((prevMessage.sender === 'user' || prevMessage.sender === 'client') && 
                           (message.sender === 'user' || message.sender === 'client')) ||
                          ((prevMessage.sender === 'agent' || prevMessage.sender === 'ai') && 
                           (message.sender === 'agent' || message.sender === 'ai'))
                        );
                        
                        // Formata horário (HH:MM) - corrige timezone
                        const getMessageTime = () => {
                          const timestamp = message.timestamp || message.time || message.createdat;
                          if (!timestamp) return '';
                          
                          try {
                            let date: Date;
                            
                            // Se o timestamp não tem 'Z' ou timezone, assume UTC e converte para local
                            if (typeof timestamp === 'string') {
                              // Remove espaços e caracteres extras
                              const cleanTimestamp = timestamp.trim();
                              
                              // Se já tem timezone info (Z, +, ou - após a data), usa direto
                              if (cleanTimestamp.includes('Z') || cleanTimestamp.match(/[+-]\d{2}:\d{2}$/)) {
                                date = new Date(cleanTimestamp);
                              } else if (cleanTimestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                                // Formato ISO sem timezone - assume UTC
                                date = new Date(cleanTimestamp + 'Z');
                              } else {
                                // Tenta parse direto
                                date = new Date(cleanTimestamp);
                              }
                            } else {
                              date = new Date(timestamp);
                            }
                            
                            if (isNaN(date.getTime())) {
                              console.warn('Timestamp inválido:', timestamp);
                              return '';
                            }
                            
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
                                    {messageTime || '--:--'}
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