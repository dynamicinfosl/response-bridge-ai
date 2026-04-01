import { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  ChevronDown,
  FileText,
  Download,
  UserSearch,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChats, useMessages, useSendMessage, useMarkAsRead, useUpdateChatStatus, useReactivateAI, useInterveneChat } from '@/hooks/useChats';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { consultaDoc, consultaNome } from '@/lib/mk-api';
import type { MKClienteDoc } from '@/lib/mk-api';
import { ClientSummaryPanel } from '@/components/atendimentos/ClientSummaryPanel';
const WhatsAppAudioPlayer = ({ url }: { url: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const changeSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px] sm:min-w-[260px] py-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-10 w-10 p-0 rounded-full hover:bg-black/5 flex-shrink-0"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
      </Button>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="h-1 bg-black/10 rounded-full relative w-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="h-7 w-12 px-0 text-[11px] font-bold rounded-full bg-black/5 hover:bg-black/10 transition-colors flex-shrink-0"
        onClick={changeSpeed}
      >
        {speed}x
      </Button>

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
};

const Atendimentos = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [chatsToShow, setChatsToShow] = useState<number>(20); // Quantidade inicial de chats a mostrar
  const [searchQuery, setSearchQuery] = useState<string>(''); // Busca de conversas
  const [showScrollButton, setShowScrollButton] = useState(false); // Mostrar botão de scroll
  const [newMessageCount, setNewMessageCount] = useState(0); // Contador de novas mensagens
  // Painel resumo cliente MK
  const [showBuscarClienteMK, setShowBuscarClienteMK] = useState(false);
  const [clienteMK, setClienteMK] = useState<MKClienteDoc | null>(null);
  const [cdClienteMK, setCdClienteMK] = useState<string | null>(null);
  const [searchMKBy, setSearchMKBy] = useState<'doc' | 'nome'>('doc');
  const [searchMKValue, setSearchMKValue] = useState('');
  const [searchMKLoading, setSearchMKLoading] = useState(false);
  const [searchMKError, setSearchMKError] = useState<string | null>(null);

  // Refs para gestão de scroll
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageSignatureRef = useRef<string | null>(null);

  // Controle local de contagem de não lidas para maior confiabilidade
  const [localUnread, setLocalUnread] = useState<Record<string, number>>({});
  const lastSeenTimes = useRef<Record<string, number>>({});
  const isInitialLoad = useRef(true);

  const { data: chatsData, isLoading: chatsLoading, error: chatsError } = useChats();
  const { data: messagesData, isLoading: messagesLoading } = useMessages(selectedChat);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const updateStatusMutation = useUpdateChatStatus();
  const reactivateAIMutation = useReactivateAI();
  const interveneChatMutation = useInterveneChat();
  
  const { user } = useAuth();
  
  // Log de depuração do perfil do usuário
  useEffect(() => {
    if (user) {
      console.log('👤 Perfil Logado:', {
        id: user.id,
        role: user.role,
        area: user.area,
        isMasterOrAdmin: user.role === 'master' || user.role === 'admin'
      });
    }
  }, [user]);

  // Controle de visualização de mensagens para chats fechados
  const [viewMessagesForClosedChat, setViewMessagesForClosedChat] = useState<Record<string, boolean>>({});

  // Constantes de Setores (para visibilidade)
  const SECTOR_LABELS = [
    'comercial', 'financeiro', 'tecnico', 'tecnica',
    's-comercial', 's-financeiro', 's-tecnico', 's-tecnica'
  ];

  // Função para normalizar texto (remover acentos, minúsculas e prefixo s-)
  const normalizeText = (text: string) => {
    if (!text) return '';
    let normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    // Se começar com "s-", removemos para facilitar a comparação se necessário, 
    // mas mantemos o suporte aos slugs completos no SECTOR_LABELS
    return normalized;
  };

  // Função para verificar se um chat está em Triagem
  const isTriagemChat = (labels: string[]) => {
    if (!labels || labels.length === 0) return true;
    const normalizedLabels = labels.map(l => normalizeText(l));
    if (normalizedLabels.includes('triagem')) return true;
    // Se não tem nenhuma etiqueta de setor, está em triagem
    return !normalizedLabels.some(l => SECTOR_LABELS.includes(l));
  };

  // Marcar como lido na API ao abrir o chat
  useEffect(() => {
    if (selectedChat) {
      markAsReadMutation.mutate(selectedChat);
    }
  }, [selectedChat]);

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

        // Preservar id original e phone original
        const chatId = chat.id?.toString() || chat.chatid?.toString() || null;
        // Prioridade real para o telefone
        const phone = chat.phone?.toString() || chat.clientPhone?.toString() || '';

        const normalized = {
          ...chat,
          id: chatId,
          phone: phone,
          pushName: chat.pushName || chat.pushname || null,
          lastMessage: chat.lastMessage || chat.lastmessage || null,
          clientPhone: phone,
        };

        return normalized;
      })
      .filter(chat => {
        const validId = chat.id &&
          typeof chat.id === 'string' &&
          chat.id.trim() !== '' &&
          chat.id !== 'null' &&
          chat.id !== 'undefined';

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
  // Garantir que messages é sempre um array também e normalizar
  const messages = (() => {
    if (!messagesData) return [];

    let rawMessages: any[] = [];
    if (Array.isArray(messagesData)) {
      rawMessages = messagesData;
    } else if (messagesData && (messagesData as any).payload) {
      rawMessages = (messagesData as any).payload;
    } else if (messagesData) {
      rawMessages = [messagesData];
    }

    return rawMessages
      .map((msg, idx) => {
        // Se já vier mapeado pelo hook useMessages (tipo Message), mantemos
        // Senão, aplicamos uma normalização mínima de segurança
        const stableId = msg.id?.toString() || `msg_${idx}_${Date.now()}`;
        const chatId = msg.chatId || selectedChat || '';

        return {
          ...msg,
          id: stableId,
          chatId: chatId,
        };
      })
      .filter(msg => {
        const isMediaValid = ['document', 'audio', 'image', 'video'].includes(msg.type || '') && msg.media?.url;
        const isTextValid = (msg.type === 'text' || !msg.type) && msg.content && msg.content.trim() !== '';
        return msg.chatId && (isMediaValid || isTextValid);
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return (isNaN(timeA) || isNaN(timeB)) ? 0 : timeA - timeB;
      });
  })();

  // Gerenciamento de "unread" local (corrige quando API do Chatwoot zera indevidamente)
  useEffect(() => {
    if (!chats || chats.length === 0) return;

    setLocalUnread(prev => {
      const next = { ...prev };
      let hasChanges = false;

      chats.forEach(chat => {
        if (!chat.id) return;

        const timestampTime = new Date(chat.updatedAt || chat.time || 0).getTime();
        const prevTime = lastSeenTimes.current[chat.id];

        // Se a conversa está aberta, zera o contador
        if (selectedChat === chat.id) {
          if (next[chat.id] > 0) {
            next[chat.id] = 0;
            hasChanges = true;
          }
          lastSeenTimes.current[chat.id] = timestampTime;
          return;
        }

        if (isInitialLoad.current) {
          lastSeenTimes.current[chat.id] = timestampTime;
          if (chat.unread && chat.unread > 0) {
            next[chat.id] = chat.unread;
            hasChanges = true;
          }
        } else if (prevTime && timestampTime > prevTime) {
          // Houve uma nova atualização e o chat não está selecionado
          if (chat.lastMessageSender === 'user') {
            next[chat.id] = (next[chat.id] || 0) + 1;
            hasChanges = true;
          }
          lastSeenTimes.current[chat.id] = timestampTime;
        } else if (!prevTime) {
          // Novo chat que acabou de aparecer
          if (chat.lastMessageSender === 'user') {
            next[chat.id] = (chat.unread && chat.unread > 0) ? chat.unread : 1;
            hasChanges = true;
          }
          lastSeenTimes.current[chat.id] = timestampTime;
        }
      });

      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      }

      return hasChanges ? next : prev;
    });
  }, [chats, selectedChat]);

  // Preservar nomes no localStorage
  const preservedNames = JSON.parse(localStorage.getItem('preservedChatNames') || '{}');

  // Função para salvar nome no localStorage
  const saveNameToStorage = (chatId: string, name: string) => {
    const cleanChatId = chatId.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const invalidNames = ['agente de ia', 'agente', 'ia', 'bot', 'assistente', 'sistema', 'lucas', 'atendimento'];

    if (name && name.length >= 2 && !invalidNames.some(invalid => name.toLowerCase().includes(invalid)) && name !== 'Cliente') {
      const updated = { ...preservedNames, [cleanChatId]: name };
      localStorage.setItem('preservedChatNames', JSON.stringify(updated));
    }
  };

  // Helper para formatar nome do cliente
  const formatClientName = (chat: any) => {
    const chatId = chat.id || chat.chatid || chat.phone || '';

    // PRIORIDADE 1: Nome fornecido pelo Chatwoot (se não for genérico)
    if (chat.client && chat.client.trim() !== '' && !['cliente', 'cliente desconhecido', 'unknown'].includes(chat.client.toLowerCase()) && !chat.client.includes('@')) {
      const lowerClient = chat.client.toLowerCase();
      const invalidNames = ['agente de ia', 'agente', 'ia', 'bot', 'assistente', 'sistema', 'atendimento'];
      if (!invalidNames.some(invalid => lowerClient.includes(invalid))) {
        saveNameToStorage(chatId, chat.client.trim());
        return chat.client.trim();
      }
    }

    // PRIORIDADE 2: name (vinda do Chatwoot v1)
    if (chat.name && chat.name.trim() !== '' && !['cliente', 'cliente desconhecido'].includes(chat.name.toLowerCase())) {
      saveNameToStorage(chatId, chat.name.trim());
      return chat.name.trim();
    }

    // PRIORIDADE 3: Nome salvo no localStorage
    const savedName = preservedNames[chatId.replace('@s.whatsapp.net', '').replace('@c.us', '')];
    if (savedName) return savedName;

    // PRIORIDADE 4: pushName
    let pushName = chat.pushName || chat.pushname || chat.meta?.sender?.push_name || null;
    if (typeof pushName === 'string') {
      pushName = pushName.trim().replace(/\n/g, '');
      if (pushName && pushName !== '' && pushName !== 'null' && !['cliente', 'unknown'].includes(pushName.toLowerCase())) {
        saveNameToStorage(chatId, pushName);
        return pushName;
      }
    }

    // PRIORIDADE 5: Formatar número do WhatsApp (fallback por telefone)
    if (chat.phone && chat.phone !== chat.id) {
      return formatPhoneNumber(chat.phone);
    }

    return 'Cliente';
  };

  // Helper para formatar número de telefone do chatId
  const formatPhoneNumber = (phone: string, id?: string) => {
    const rawValue = phone || id || '';
    if (!rawValue) return '';

    // Se já vier formatado com + (comum no Chatwoot), mantém como está
    if (rawValue.startsWith('+')) return rawValue;

    // Remove @s.whatsapp.net e formata número
    let number = rawValue.replace('@s.whatsapp.net', '').replace('@c.us', '');

    // Se for um ID curto (Chatwoot ID), não tenta formatar como telefone
    if (number.length < 7) return number;

    // Remove código do país (55) se existir no início
    if (number.startsWith('55') && number.length > 11) {
      number = number.substring(2);
    }

    // Formata como (XX) XXXXX-XXXX para celular (11 dígitos) ou (XX) XXXX-XXXX para fixo (10 dígitos)
    if (number.length === 11) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
    } else if (number.length === 10) {
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

  const getStatusBadge = (status: string, needsHuman: boolean = false) => {
    if (needsHuman) {
      return { className: 'bg-red-50 text-red-600 border-red-200 font-bold animate-pulse', label: 'Necessita intervenção humana' };
    }
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

  const getSectorInfo = (labels: string[]) => {
    const normalizedLabels = (labels || []).map(l => normalizeText(l));
    
    if (normalizedLabels.includes('comercial') || normalizedLabels.includes('s-comercial')) {
      return { label: 'Comercial', className: 'bg-blue-50 text-blue-600 border-blue-200' };
    }
    if (normalizedLabels.includes('financeiro') || normalizedLabels.includes('s-financeiro')) {
      return { label: 'Financeiro', className: 'bg-green-50 text-green-600 border-green-200' };
    }
    if (normalizedLabels.includes('tecnico') || normalizedLabels.includes('tecnica') || 
        normalizedLabels.includes('s-tecnico') || normalizedLabels.includes('s-tecnica')) {
      return { label: 'Técnico', className: 'bg-orange-50 text-orange-600 border-orange-200' };
    }
    if (normalizedLabels.includes('triagem') || isTriagemChat(labels)) {
      return { label: 'Triagem', className: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
    return null;
  };

  // Função para fazer scroll até o final
  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setShowScrollButton(false);
      setNewMessageCount(0);
    }
  };

  // Verificar se está no final do scroll
  const isAtBottom = (): boolean => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 150; // margem de erro
    const position = container.scrollHeight - container.scrollTop - container.clientHeight;
    return position <= threshold;
  };

  // Detectar quando o usuário está fazendo scroll manual
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const position = container.scrollHeight - container.scrollTop - container.clientHeight;

    // Marcar que o usuário está interagindo
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 2000);

    // Se o usuário rolou para cima (mais de 150px do fundo)
    if (position > 150) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
      setNewMessageCount(0);
    }
  };

  // Assinatura da última mensagem: funciona mesmo quando o backend mantém o mesmo tamanho de lista
  const lastMessageSignature = messages.length > 0
    ? `${messages[messages.length - 1].timestamp}|${messages[messages.length - 1].sender}|${messages[messages.length - 1].type || 'text'}|${messages[messages.length - 1].content || messages[messages.length - 1].media?.url || ''}`
    : null;

  // Efeito para novas mensagens (por assinatura da última mensagem)
  useEffect(() => {
    if (!selectedChat) {
      lastMessageCountRef.current = 0;
      lastMessageSignatureRef.current = null;
      setNewMessageCount(0);
      setShowScrollButton(false);
      return;
    }

    // Primeira carga: inicializa e rola pro final
    if (!lastMessageSignatureRef.current && lastMessageSignature) {
      lastMessageSignatureRef.current = lastMessageSignature;
      lastMessageCountRef.current = messages.length;
      setTimeout(() => scrollToBottom(false), 200);
      return;
    }

    // Se não temos assinatura ainda, não faz nada
    if (!lastMessageSignature || !lastMessageSignatureRef.current) {
      lastMessageCountRef.current = messages.length;
      return;
    }

    // Detecta mudança na última mensagem (nova mensagem chegou ou a janela mudou)
    const signatureChanged = lastMessageSignature !== lastMessageSignatureRef.current;
    if (!signatureChanged) {
      lastMessageCountRef.current = messages.length;
      return;
    }

    const wasAtBottom = isAtBottom();

    // Atualiza refs antes de qualquer efeito assíncrono
    lastMessageSignatureRef.current = lastMessageSignature;
    lastMessageCountRef.current = messages.length;

    if (wasAtBottom && !isUserScrollingRef.current) {
      setTimeout(() => scrollToBottom(true), 100);
      return;
    }

    // Se não estava no final, incrementa contador e força exibição do indicador
    setNewMessageCount(prev => prev + 1);
    setShowScrollButton(true);
  }, [selectedChat, lastMessageSignature]);

  // Resetar ao mudar de chat
  useEffect(() => {
    lastMessageCountRef.current = 0;
    lastMessageSignatureRef.current = null;
    setShowScrollButton(false);
    setNewMessageCount(0);
    setTimeout(() => scrollToBottom(false), 300);
  }, [selectedChat]);

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      sendMessageMutation.mutate({
        chatId: selectedChat,
        content: messageText,
        sender: 'agent',
        labels: selectedChatData?.labels
      });
      setMessageText('');
      // Scroll automático após enviar mensagem
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
  };

  const handleBuscarClienteMK = async () => {
    const value = searchMKValue.trim();
    if (!value) return;
    setSearchMKError(null);
    setSearchMKLoading(true);
    try {
      if (searchMKBy === 'doc') {
        const r = await consultaDoc(value.replace(/\D/g, ''));
        const arr = Array.isArray(r) ? r : r ? [r] : [];
        const first = arr[0];
        if (first) {
          const cd = String((first as any).cd_cliente ?? (first as any).cdcliente ?? '');
          setClienteMK(first as MKClienteDoc);
          setCdClienteMK(cd || null);
          setShowBuscarClienteMK(false);
          setSearchMKValue('');
        } else {
          setSearchMKError('Nenhum cliente encontrado para este documento.');
        }
      } else {
        const r = await consultaNome(value);
        const arr = Array.isArray(r) ? r : r ? [r] : [];
        const first = arr[0];
        if (first) {
          const cd = String((first as any).cd_cliente ?? (first as any).cdcliente ?? '');
          setClienteMK(first as MKClienteDoc);
          setCdClienteMK(cd || null);
          setShowBuscarClienteMK(false);
          setSearchMKValue('');
        } else {
          setSearchMKError('Nenhum cliente encontrado com este nome.');
        }
      }
    } catch (err) {
      setSearchMKError(String(err));
    } finally {
      setSearchMKLoading(false);
    }
  };

  const selectedChatData = chats.find(chat => chat.id === selectedChat);

  // Filtrar chats por permissão de setor, status e busca
  const filteredChats = chats.filter(chat => {
    // 1. REGRA DE VISIBILIDADE (Privacidade de Setor)
    const chatLabels = chat.labels || [];
    const isTriagem = isTriagemChat(chatLabels);
    const isMasterOrAdmin = user?.role === 'master' || user?.role === 'admin';

    // Se não for admin/master, aplicamos restrição
    if (!isMasterOrAdmin) {
      const userAreaNorm = normalizeText(user?.area || '');
      
      // Regra: Sempre vê Triagem
      if (!isTriagem) {
        // Se já está classificado, só vê se for do SEU setor
        const normalizedLabels = chatLabels.map(l => normalizeText(l));
        const chatSectors = normalizedLabels.filter(l => SECTOR_LABELS.includes(l));
        
        let hasAccess = false;
        if (userAreaNorm === 'tecnica' || userAreaNorm === 'tecnico') {
          hasAccess = chatSectors.includes('tecnico') || chatSectors.includes('tecnica') || 
                      chatSectors.includes('s-tecnico') || chatSectors.includes('s-tecnica');
        } else if (userAreaNorm) {
          hasAccess = chatSectors.includes(userAreaNorm) || chatSectors.includes(`s-${userAreaNorm}`);
        }
        
        if (!hasAccess) return false;
      }
    }

    // 2. FILTRO DE STATUS
    if (statusFilter !== 'all') {
      const chatStatus = chat.status || (chat as any).statusP;
      if (chatStatus !== statusFilter) return false;
    }

    // 3. FILTRO DE BUSCA (nome, telefone)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const clientName = formatClientName(chat).toLowerCase();
      const phoneNumber = formatPhoneNumber(chat.phone, chat.id);
      const rawPhone = (chat.id || '').replace(/\D/g, '');

      return clientName.includes(query) ||
        phoneNumber.includes(query) ||
        rawPhone.includes(query);
    }

    // 4. FILTRO DE SETOR (Seleção na UI)
    if (sectorFilter !== 'all') {
      if (sectorFilter === 'triagem') {
        if (!isTriagem) return false;
      } else {
        // Filtro específico (Comercial, Financeiro, Técnico)
        const querySector = normalizeText(sectorFilter);
        const normalizedLabels = chatLabels.map(l => normalizeText(l));
        
        if (querySector === 'tecnico' || querySector === 'tecnica') {
          if (!normalizedLabels.includes('tecnico') && !normalizedLabels.includes('tecnica') &&
              !normalizedLabels.includes('s-tecnico') && !normalizedLabels.includes('s-tecnica')) return false;
        } else {
          if (!normalizedLabels.includes(querySector) && !normalizedLabels.includes(`s-${querySector}`)) return false;
        }
      }
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

  // Mostrar erro (com dica de URL/env quando for falha de configuração)
  if (chatsError) {
    const msg = String(chatsError);
    const isUrlEnv = /n8n|VITE_N8N|URL não configurada|configurada/i.test(msg);
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <p className="text-destructive font-medium mb-2">Erro ao carregar atendimentos</p>
            <p className="text-sm text-muted-foreground mb-4">{msg}</p>
            {isUrlEnv && (
              <div className="text-left text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 border border-border">
                <p className="font-medium text-foreground mb-1">Verifique:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Arquivo <code className="bg-muted px-1 rounded">.env.local</code>: <code className="bg-muted px-1 rounded">VITE_N8N_API_URL</code> e, se precisar, <code className="bg-muted px-1 rounded">VITE_N8N_API_KEY</code></li>
                  <li>Se você é <strong>master</strong>, em Configurações Avançadas: URL base e chave da API do n8n</li>
                  <li>O workflow do n8n deve aceitar <code className="bg-muted px-1 rounded">?endpoint=chats</code> e <code className="bg-muted px-1 rounded">?endpoint=messages&amp;chatId=...</code></li>
                </ul>
              </div>
            )}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base sm:text-lg">Conversas</CardTitle>
                    {user && (
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0 bg-muted">
                        {user.role} {user.area ? `| ${user.area}` : ''}
                      </Badge>
                    )}
                  </div>
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
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="text-xs border rounded px-2 py-1.5 w-full sm:w-auto"
                  >
                    <option value="all">Todos Setores</option>
                    <option value="triagem">Triagem (Aguardando)</option>
                    <option value="comercial">Comercial</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="tecnico">Técnico</option>
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
                      const needsHuman = chat.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento');
                      const status = getStatusBadge(chat.status || (chat as any).statusP, needsHuman);
                      const displayUnread = Math.max(chat.unread || 0, localUnread[chat.id] || 0);
                      return (
                        <div
                          key={chat.id}
                          onClick={() => setSelectedChat(chat.id)}
                          className={cn(
                            "p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/50",
                            selectedChat === chat.id
                              ? "bg-primary-muted border-l-4 border-l-primary"
                              : displayUnread > 0
                                ? "bg-muted/30 border-l-4 border-l-primary/50"
                                : ""
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                  {getInitials(formatClientName(chat))}
                                </AvatarFallback>
                              </Avatar>
                              {needsHuman && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium truncate">
                                    {formatClientName(chat)}
                                  </h4>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {formatPhoneNumber(chat.phone, chat.id)}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                  {formatTimeAgo(chat.time || chat.updatedAt || '')}
                                </span>
                              </div>
                              {(() => {
                                const msg = chat.lastMessage || 'Iniciando conversa...';
                                const isSummary = msg.includes('[Resumo IA]');

                                if (isSummary) {
                                  const textAfter = msg.replace('[Resumo IA]', '').trim();
                                  return (
                                    <div className="flex items-start gap-1.5 mb-2 w-full">
                                      {chat.lastMessageSender === 'agent' && (
                                        <Bot className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-1" />
                                      )}
                                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        <div className="flex items-center">
                                          <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                                            Resumo IA
                                          </span>
                                        </div>
                                        <p className={cn(
                                          "text-[13px] leading-snug line-clamp-3 whitespace-pre-wrap break-words",
                                          displayUnread > 0 ? "text-foreground font-semibold" : "text-muted-foreground opacity-90"
                                        )}>
                                          {textAfter || msg}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="flex items-center gap-1.5 mb-2 overflow-hidden w-full">
                                    {chat.lastMessageSender === 'agent' && (
                                      <Bot className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    )}
                                    <p className={cn(
                                      "text-sm truncate",
                                      displayUnread > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                                    )}>
                                      {msg}
                                    </p>
                                  </div>
                                );
                              })()}
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getChannelIcon(chat.channel || chat.WhatsApp || 'WhatsApp')}
                                  <Badge variant="outline" className={cn("px-2 py-0.5", status.className)}>
                                    {status.label}
                                  </Badge>
                                  {(() => {
                                    const sector = getSectorInfo(chat.labels);
                                    if (!sector) return null;
                                    return (
                                      <Badge variant="outline" className={cn("px-2 py-0.5 font-bold uppercase text-[10px]", sector.className)}>
                                        {sector.label}
                                      </Badge>
                                    );
                                  })()}
                                  {chat.status !== 'concluido' && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {chat.attendant && (needsHuman || chat.labels?.includes('agente-off')) ? (
                                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                                          <UserCheck className="w-3 h-3 text-primary" />
                                          Sendo atendido por: {chat.attendant}
                                        </span>
                                      ) : (!needsHuman && !chat.labels?.includes('agente-off')) ? (
                                        <span className="text-[11px] text-primary font-bold flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md">
                                          <Bot className="w-3 h-3" />
                                          Sendo atendido por: IA ATIVA
                                        </span>
                                      ) : chat.attendant ? (
                                        /* Fallback caso tenha atendente mas labels estejam em transição */
                                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                                          <UserCheck className="w-3 h-3 text-primary" />
                                          Sendo atendido por: {chat.attendant}
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                                {displayUnread > 0 && (
                                  <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                    {displayUnread}
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
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(formatClientName(selectedChatData))}
                          </AvatarFallback>
                        </Avatar>
                        {selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento') && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {formatClientName(selectedChatData)}
                          </h3>
                          {selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento') && (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white animate-pulse border-none px-2 py-0">
                              🚨 INTERVENÇÃO HUMANA
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatPhoneNumber(selectedChatData.phone, selectedChatData.id)}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-md border border-border/50">
                            {getChannelIcon(selectedChatData.channel || selectedChatData.WhatsApp || 'WhatsApp')}
                            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                              {selectedChatData.channel || selectedChatData.WhatsApp || 'WhatsApp'}
                            </span>
                          </div>
                          
                          {(() => {
                            const sector = getSectorInfo(selectedChatData.labels);
                            if (!sector) return null;
                            return (
                              <Badge variant="outline" className={cn("px-2 py-0.5 font-bold uppercase text-[10px]", sector.className)}>
                                {sector.label}
                              </Badge>
                            );
                          })()}
                          
                          {selectedChatData.status !== 'concluido' && (
                            <>
                              {selectedChatData.attendant && (selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento' || l.toLowerCase() === 'agente-off')) ? (
                                <div className="flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-[11px] font-bold text-primary whitespace-nowrap uppercase">
                                    Sendo atendido por: {selectedChatData.attendant}
                                  </span>
                                </div>
                              ) : (!selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento' || l.toLowerCase() === 'agente-off')) ? (
                                <div className="flex items-center gap-1.5 bg-success/5 px-2 py-0.5 rounded-md border border-success/10">
                                  <Bot className="w-3.5 h-3.5 text-success" />
                                  <span className="text-[11px] font-bold text-success animate-pulse whitespace-nowrap uppercase">
                                    Sendo atendido por: IA ATIVA
                                  </span>
                                </div>
                              ) : selectedChatData.attendant ? (
                                <div className="flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-[11px] font-bold text-primary whitespace-nowrap uppercase">
                                    Sendo atendido por: {selectedChatData.attendant}
                                  </span>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSearchMKError(null); setShowBuscarClienteMK(true); }}
                      >
                        <UserSearch className="w-4 h-4 mr-2" />
                        Cliente MK
                      </Button>
                      {(() => {
                        const hasNeedsHuman = selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento');
                        const sBadge = getStatusBadge(selectedChatData.status || (selectedChatData as any).statusP, hasNeedsHuman);
                        return (
                          <Badge variant="outline" className={sBadge.className}>
                            {sBadge.label}
                          </Badge>
                        );
                      })()}
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
                          {selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento' || l.toLowerCase() === 'agente-off') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                              onClick={() => {
                                reactivateAIMutation.mutate({
                                  id: selectedChatData.id,
                                  labels: selectedChatData.labels
                                });
                              }}
                              disabled={reactivateAIMutation.isPending}
                            >
                              <Bot className={cn("w-4 h-4 mr-2", reactivateAIMutation.isPending && "animate-spin")} />
                              Reativar IA
                            </Button>
                          )}
                          {!selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                              onClick={() => {
                                interveneChatMutation.mutate({
                                  id: selectedChatData.id,
                                  labels: selectedChatData.labels
                                });
                              }}
                              disabled={interveneChatMutation.isPending}
                            >
                              <UserSearch className={cn("w-4 h-4 mr-2", interveneChatMutation.isPending && "animate-spin")} />
                              Intervir
                            </Button>
                          )}
                        </>
                      )}
                      {(selectedChatData.status || (selectedChatData as any).statusP) === 'concluido' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewMessagesForClosedChat(prev => ({...prev, [selectedChatData.id]: false}))}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Resumo
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: selectedChatData.id, status: 'active' })}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reabrir
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages - Estilo WhatsApp */}
                <CardContent className="flex-1 p-0 flex flex-col min-h-0 bg-[#efeae2] relative overflow-hidden" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}>
                  {/* Overlay de Resumo para Chat Concluído */}
                  {(() => {
                    const isClosed = (selectedChatData.status || (selectedChatData as any).statusP) === 'concluido';
                    const showOverlay = isClosed && !viewMessagesForClosedChat[selectedChatData.id];
                    
                    if (!showOverlay) return null;

                    const msg = selectedChatData.lastMessage || '';
                    const hasSummary = msg.includes('[Resumo IA]');
                    const summaryText = hasSummary ? msg.replace('[Resumo IA]', '').trim() : 'Nenhum resumo gerado para este atendimento.';

                    const startTime = new Date(selectedChatData.createdAt || selectedChatData.time || Date.now());
                    const endTime = new Date(selectedChatData.updatedAt || Date.now());
                    const diffMins = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 60000));
                    const durationText = diffMins < 60 ? `${diffMins} min` : `${Math.floor(diffMins/60)}h ${diffMins%60}min`;

                    return (
                      <div className="absolute inset-0 z-30 bg-background/20 backdrop-blur-md flex items-center justify-center p-6">
                        <Card className="w-full max-w-lg shadow-lg border-primary/20">
                          <CardHeader className="text-center pb-2">
                            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl">Resumo do Atendimento</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg text-left">
                              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center">
                                <Bot className="w-4 h-4 mr-2" /> Resumo da IA
                              </h4>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{summaryText}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-muted/30 p-3 rounded-lg border border-border text-center">
                                <span className="text-xs text-muted-foreground block mb-1">Duração</span>
                                <span className="font-semibold">{durationText}</span>
                              </div>
                              <div className="bg-muted/30 p-3 rounded-lg border border-border text-center">
                                <span className="text-xs text-muted-foreground block mb-1">Status</span>
                                <Badge variant="outline" className="bg-success/10 text-success border-success/20">Concluído</Badge>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                              <Button 
                                className="flex-1" 
                                variant="outline"
                                onClick={() => setViewMessagesForClosedChat(prev => ({...prev, [selectedChatData.id]: true}))}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Visualizar
                              </Button>
                              <Button 
                                className="flex-1"
                                onClick={() => updateStatusMutation.mutate({ id: selectedChatData.id, status: 'active' })}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reabrir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}

                  <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
                  >
                    {/* Notificação dentro do chat (sticky) */}
                    {newMessageCount > 0 && (
                      <div className="sticky top-2 z-20 flex justify-center pointer-events-none">
                        <Button
                          onClick={() => scrollToBottom(true)}
                          size="sm"
                          className="pointer-events-auto rounded-full bg-background/80 backdrop-blur border border-border text-foreground shadow-sm hover:bg-background"
                          variant="outline"
                        >
                          {newMessageCount} nova{newMessageCount > 1 ? 's' : ''} mensagem{newMessageCount > 1 ? 's' : ''}
                        </Button>
                      </div>
                    )}
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
                          const timestamp = message.timestamp;
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

                        const isLastMessage = index === messages.length - 1;

                        return (
                          <div
                            key={message.id}
                            ref={isLastMessage ? lastMessageRef : null}
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
                                message.type === 'document'
                                  ? cn(
                                    "bg-[#f0f4f8] border border-[#d0d8e0]",
                                    isClient ? "rounded-tl-none" : "rounded-tr-none"
                                  ) // Fundo diferente para documentos
                                  : isClient
                                    ? "bg-white text-[#111b21] rounded-tl-none" // Branco para cliente (esquerda)
                                    : "bg-[#d9e5ff] text-[#111b21] rounded-tr-none", // Azul claro para agente (direita)
                                // Ajusta o rabinho baseado no agrupamento
                                message.type !== 'document' && isSameSender && (
                                  isClient
                                    ? ""
                                    : ""
                                )
                              )}>
                                {/* Renderizar conteúdo baseado no tipo */}
                                {message.type === 'image' && message.media && (
                                  <div className="mb-1 overflow-hidden rounded-md border border-black/5">
                                    <img
                                      src={message.media.url}
                                      alt={message.media.name}
                                      className="max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity max-h-[300px] object-contain"
                                      onClick={() => window.open(message.media.url, '_blank')}
                                    />
                                  </div>
                                )}

                                {message.type === 'video' && message.media && (
                                  <div className="mb-1 overflow-hidden rounded-md border border-black/5 bg-black">
                                    <video
                                      src={message.media.url}
                                      controls
                                      className="max-w-full h-auto max-h-[300px] outline-none"
                                    />
                                  </div>
                                )}

                                {message.type === 'audio' && message.media ? (
                                  <WhatsAppAudioPlayer url={message.media.url} />
                                ) : message.type === 'document' && message.media ? (
                                  /* Card de documento */
                                  <div className="flex items-start gap-3 py-1">
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center",
                                        isClient ? "bg-red-100" : "bg-red-100"
                                      )}>
                                        <FileText className={cn(
                                          "w-5 h-5",
                                          isClient ? "text-red-600" : "text-red-600"
                                        )} />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[14.2px] font-medium text-[#111b21] truncate mb-1">
                                        {message.media.name}
                                      </p>
                                      <a
                                        href={message.media.url.trim()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Abrir documento
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  /* Conteúdo de texto normal */
                                  <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                )}

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

                  {/* Botão de scroll para baixo - aparece ao rolar para cima */}
                  {showScrollButton && (
                    <div className="absolute bottom-6 right-6 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Button
                        onClick={() => scrollToBottom(true)}
                        className="rounded-full shadow-xl bg-white/95 backdrop-blur-sm hover:bg-white border border-border text-foreground h-11 px-4 flex items-center gap-2 transition-all hover:shadow-2xl hover:scale-105"
                        size="sm"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown className="w-4 h-4 text-primary" />
                          {newMessageCount > 0 && (
                            <>
                              <div className="h-4 w-px bg-border"></div>
                              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold min-w-[22px] text-center">
                                {newMessageCount}
                              </span>
                            </>
                          )}
                        </div>
                      </Button>
                    </div>
                  )}
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
              chatId={selectedChatData.id}
              currentAttendant={selectedChatData.attendant || undefined}
            />
            <CloseTicketModal
              isOpen={showCloseModal}
              onClose={() => setShowCloseModal(false)}
              clientName={selectedChatData.client || selectedChatData.phone || 'Cliente'}
              chatId={selectedChatData.id}
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

        {/* Dialog Buscar Cliente MK */}
        <Dialog open={showBuscarClienteMK} onOpenChange={setShowBuscarClienteMK}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buscar cliente no MK</DialogTitle>
              <DialogDescription>
                Informe CPF/CNPJ ou nome para carregar o resumo do cliente na conversa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Buscar por</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={searchMKBy}
                  onChange={(e) => setSearchMKBy(e.target.value as 'doc' | 'nome')}
                >
                  <option value="doc">CPF/CNPJ</option>
                  <option value="nome">Nome</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{searchMKBy === 'doc' ? 'CPF ou CNPJ (apenas números)' : 'Nome do cliente'}</Label>
                <Input
                  value={searchMKValue}
                  onChange={(e) => setSearchMKValue(searchMKBy === 'doc' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                  placeholder={searchMKBy === 'doc' ? 'Ex: 18300423788' : 'Nome completo ou parte'}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarClienteMK()}
                />
              </div>
              {searchMKError && (
                <p className="text-sm text-destructive">{searchMKError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBuscarClienteMK(false)}>
                Cancelar
              </Button>
              <Button onClick={handleBuscarClienteMK} disabled={searchMKLoading || !searchMKValue.trim()}>
                {searchMKLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserSearch className="w-4 h-4 mr-2" />}
                Buscar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Painel resumo cliente MK (redimensionável e minimizável) */}
        <ClientSummaryPanel
          open={!!cdClienteMK}
          onClose={() => { setClienteMK(null); setCdClienteMK(null); }}
          cliente={clienteMK}
          cdCliente={cdClienteMK}
        />
      </div>
    </Layout>
  );
};

export default Atendimentos;