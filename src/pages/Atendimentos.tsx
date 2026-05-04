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
  ChevronLeft,
  FileText,
  Download,
  UserSearch,
  UserPlus,
  Play,
  Pause,
  AlertCircle,
  ExternalLink,
  X,
  Mic,
  Video,
  Paperclip,
  Image as ImageIcon,
  UserRound,
  Zap,
  Plus,
  Pencil,
  Trash2,
  Timer,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useChats, useMessages, useSendMessage, useMarkAsRead, useUpdateChatStatus, useReactivateAI, useInterveneChat, useTakeOverChat, useSendAttachment } from '@/hooks/useChats';
import { AudioRecorder } from '@/components/atendimentos/AudioRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { Textarea } from '@/components/ui/textarea';
import { consultaDoc, consultaNome } from '@/lib/mk-api';
import type { MKClienteDoc } from '@/lib/mk-api';
import { useClienteResumo } from '@/hooks/useMK';
import { ClientSummaryPanel } from '@/components/atendimentos/ClientSummaryPanel';
import { useCreateQuickReply, useDeleteQuickReply, useQuickReplies, useUpdateQuickReply, type QuickReply } from '@/hooks/useQuickReplies';
import { logAuditAction } from '@/lib/audit';
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
      const d = audioRef.current.duration;
      // WebM gravado pelo MediaRecorder pode ter duração Infinity por falta de
      // metadata. Truque: forçar seek para o final, esperar timeupdate, voltar.
      if (d === Infinity || isNaN(d)) {
        const audio = audioRef.current;
        const onSeeked = () => {
          audio.currentTime = 0;
          setDuration(audio.duration);
          audio.removeEventListener('seeked', onSeeked);
        };
        audio.addEventListener('seeked', onSeeked);
        audio.currentTime = 1e10;
      } else {
        setDuration(d);
      }
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
  const isMobile = useIsMobile();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showQuickReplyModal, setShowQuickReplyModal] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  const [quickReplyForm, setQuickReplyForm] = useState({ title: '', shortcut: '', content: '' });
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [chatsToShow, setChatsToShow] = useState<number>(20); // Quantidade inicial de chats a mostrar
  const [searchQuery, setSearchQuery] = useState<string>(''); // Busca de conversas
  const [showScrollButton, setShowScrollButton] = useState(false); // Mostrar botão de scroll
  const [newMessageCount, setNewMessageCount] = useState(0); // Contador de novas mensagens
  const [localRepliedChats, setLocalRepliedChats] = useState<Record<string, number>>({}); // Armazena chats respondidos localmente
  const [localHumanAttendants, setLocalHumanAttendants] = useState<Record<string, { name?: string; area?: string }>>(() => {
    try {
      const saved = localStorage.getItem('localHumanAttendants');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  // Painel resumo cliente MK - Gerenciamento por chat para evitar vazamento de dados
  const [showBuscarClienteMK, setShowBuscarClienteMK] = useState(false);
  const [showMkPanel, setShowMkPanel] = useState(false);
  const [chatMKMap, setChatMKMap] = useState<Record<string, { cd: string; cliente: MKClienteDoc }>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [messageSenderOverrides, setMessageSenderOverrides] = useState<Record<string, string>>({});
  
  // Identidade derivada do chat selecionado
  const currentMKIdentity = selectedChat ? chatMKMap[selectedChat] : null;
  const cdClienteMK = currentMKIdentity?.cd || null;
  const clienteMK = currentMKIdentity?.cliente || null;

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controle local de contagem de não lidas para maior confiabilidade
  const [localUnread, setLocalUnread] = useState<Record<string, number>>({});
  const lastSeenTimes = useRef<Record<string, number>>({});
  const isInitialLoad = useRef(true);

  const { data: chatsData, isLoading: chatsLoading, error: chatsError } = useChats();
  const { data: messagesData, isLoading: messagesLoading } = useMessages(selectedChat);
  const sendMessageMutation = useSendMessage();
  const sendAttachmentMutation = useSendAttachment();

  const handleSendAudio = (blob: Blob) => {
    if (!selectedChat) return;
    if (blob.size === 0) {
      toast.error('Áudio vazio - tente gravar novamente');
      return;
    }
    // Define extensão correta com base no tipo real do blob gerado pelo MediaRecorder
    const rawBlobType = blob.type || 'audio/webm';
    const blobType = rawBlobType.toLowerCase();

    let ext = 'webm';
    let mime = 'audio/webm';
    if (blobType.includes('mp4')) { ext = 'mp4'; mime = 'audio/mp4'; }
    else if (blobType.includes('ogg')) { ext = 'ogg'; mime = rawBlobType; }
    else if (blobType.includes('mpeg') || blobType.includes('mp3')) { ext = 'mp3'; mime = 'audio/mpeg'; }
    else if (blobType.includes('wav')) { ext = 'wav'; mime = 'audio/wav'; }
    const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: mime });
    const shouldAutoAssign = !selectedChatData?.assigneeId && !!user?.chatwoot_id;
    if (shouldAutoAssign) {
      setLocalHumanAttendants(prev => ({
        ...prev,
        [selectedChat]: { name: user?.name, area: user?.area || undefined },
      }));
    }
    sendAttachmentMutation.mutate(
      {
        chatId: selectedChat,
        file,
        content: '',
        operatorChatwootId: user?.chatwoot_id,
        currentAssigneeId: selectedChatData?.assigneeId,
        labels: selectedChatData?.labels,
        operatorName: user?.name,
      },
      {
        onSuccess: (response: any) => {
          setShowAudioRecorder(false);
          if (response?.id && user?.name) {
            setMessageSenderOverrides(prev => ({
              ...prev,
              [String(response.id)]: user.name,
            }));
          }
          // Adicionar ao estado local para remover a tarja imediatamente
          setLocalRepliedChats(prev => ({ ...prev, [selectedChat]: Date.now() }));
        },
        onError: (err) => {
          toast.error('Erro ao enviar áudio');
          console.error(err);
        },
      }
    );
  };
  const markAsReadMutation = useMarkAsRead();
  const updateStatusMutation = useUpdateChatStatus();
  const reactivateAIMutation = useReactivateAI();
  const interveneChatMutation = useInterveneChat();
  const takeOverChatMutation = useTakeOverChat();
  
  // Hook para dados rápidos do MK no cabeçalho
  const { data: mkSummaryData, isLoading: mkSummaryLoading } = useClienteResumo(cdClienteMK, clienteMK, !!cdClienteMK);

  // Cálculo global de Previsão de Vencimento de Contrato para o cabeçalho
  // Prioridade: 1) internet/plano ativo com vencimento futuro,
  //              2) qualquer contrato ativo com vencimento futuro,
  //              3) contrato de internet menos vencido,
  //              4) contrato menos vencido (fallback).
  const soonestExpiringMKHeader = (() => {
    if (!mkSummaryData?.contratos || mkSummaryData.contratos.length === 0) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const calcDiff = (fim: string): number | null => {
      if (!fim) return null;
      let d = new Date(fim);
      if (typeof fim === 'string' && fim.includes('/') && fim.split('/').length === 3) {
        const parts = fim.split(' ')[0].split('/');
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
      }
      if (isNaN(d.getTime())) return null;
      return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const isInternetContract = (c: any): boolean => {
      const plano = String(c.plano_acesso || c.descricao || c.plano || '').toLowerCase();
      return /\b(mb|mega|giga|fibra|conex|internet|banda|wifi|broadband|veloc|adapt|p\.a\.?|plano)\b/i.test(plano);
    };

    const activeContracts = mkSummaryData.contratos.filter((c: any) => {
      const status = String(c.status || c.situacao || '').toLowerCase();
      return status === '' || status.includes('ativ') || status.includes('ok') || status.includes('norm') || status.includes('instal') || status.includes('fidel');
    });

    const withDate = activeContracts
      .map((c: any) => {
        const fim = c.previsao_vencimento || c.vencimento_contrato || c.data_cancelamento || c.dt_cancelamento || c.data_vencimento || c.dt_vencimento || c.vencimento_plano;
        const diff = calcDiff(fim);
        return diff !== null ? { ...c, diffDays: diff, fim } : null;
      })
      .filter(Boolean) as any[];

    if (withDate.length === 0) return null;

    // Prioridade 1: contratos de internet/plano com vencimento no futuro (ou tolerância de 30 dias vencidos)
    const internetRecent = withDate.filter((c) => isInternetContract(c) && c.diffDays >= -30);
    if (internetRecent.length > 0) {
      const best = internetRecent.reduce((a, b) => (a.diffDays < b.diffDays ? a : b));
      return { diffDays: best.diffDays, fim: best.fim };
    }

    // Prioridade 2: qualquer contrato com vencimento no futuro
    const anyFuture = withDate.filter((c) => c.diffDays >= 0);
    if (anyFuture.length > 0) {
      const best = anyFuture.reduce((a, b) => (a.diffDays < b.diffDays ? a : b));
      return { diffDays: best.diffDays, fim: best.fim };
    }

    // Prioridade 3: contratos de internet menos vencidos
    const internetAny = withDate.filter((c) => isInternetContract(c));
    if (internetAny.length > 0) {
      const best = internetAny.reduce((a, b) => (a.diffDays > b.diffDays ? a : b));
      return { diffDays: best.diffDays, fim: best.fim };
    }

    // Fallback: contrato menos vencido entre todos
    const best = withDate.reduce((a, b) => (a.diffDays > b.diffDays ? a : b));
    return { diffDays: best.diffDays, fim: best.fim };
  })();

  const { user } = useAuth();
  const { data: quickReplies = [] } = useQuickReplies(user?.id);
  const createQuickReplyMutation = useCreateQuickReply();
  const updateQuickReplyMutation = useUpdateQuickReply();
  const deleteQuickReplyMutation = useDeleteQuickReply();
  
  // Controle de visualização de mensagens para chats fechados ou com intervenção
  const [viewMessagesForClosedChat, setViewMessagesForClosedChat] = useState<Record<string, boolean>>({});
  const [viewMessagesForInterventionChat, setViewMessagesForInterventionChat] = useState<Record<string, boolean>>({});

  // Função para normalizar texto (remover acentos, minúsculas)
  const normalizeText = (text: string) => {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  };

  // Extrai o setor canônico de qualquer label (robusto para variações como "Técnico", "s-tecnico", "Setor Técnico", etc)
  // Triagem NÃO é setor — é um estado de conversas ainda não direcionadas
  const getSectorFromLabel = (label: string): string | null => {
    const n = normalizeText(label);
    if (n.includes('tecnic')) return 'tecnico';
    if (n.includes('comercial')) return 'comercial';
    if (n.includes('financeiro')) return 'financeiro';
    return null;
  };

  // Função para verificar se um chat está em Triagem (sem setor atribuído)
  const isTriagemChat = (labels: string[]) => {
    if (!labels || labels.length === 0) return true;
    // Se nenhum label mapeia para um setor reconhecido, está em triagem
    const sectors = labels.map(l => getSectorFromLabel(l)).filter(Boolean);
    return sectors.length === 0;
  };

  // Função para verificar se um chat precisa de intervenção humana
  const needsHumanIntervention = (labels: string[]) => {
    const normalizedLabels = (labels || []).map(l => normalizeText(l));
    return normalizedLabels.includes('precisa_atendimento');
  };

  // Helpers de permissão por perfil
  const isAdminOrMaster = user?.role === 'master' || user?.role === 'admin';
  const isEncarregado = user?.role === 'encarregado';
  const userSectorKey = (() => {
    const area = normalizeText(user?.area || '');
    if (area === 'tecnica' || area === 'tecnico') return 'tecnico';
    if (area === 'comercial') return 'comercial';
    if (area === 'financeiro') return 'financeiro';
    return '';
  })();
  const userSectorName = (() => {
    if (userSectorKey === 'tecnico') return 'Técnico';
    if (userSectorKey === 'comercial') return 'Comercial';
    if (userSectorKey === 'financeiro') return 'Financeiro';
    return '';
  })();

  // [DEBUG] Diagnóstico de permissão do usuário logado (visível no console F12)
  if (user) console.debug('[Atendimentos] user:', { role: user.role, area: user.area, userSectorKey, chatwoot_id: user.chatwoot_id });

  // Marcar como lido na API ao abrir o chat e fechar painel MK
  useEffect(() => {
    if (selectedChat) {
      markAsReadMutation.mutate(selectedChat);
      setShowMkPanel(false); // Fecha o painel ao trocar de chat
    }
  }, [selectedChat]);

  // Auto-detecção de CPF nas mensagens
  useEffect(() => {
    if (!selectedChat || !messagesData || messagesData.length === 0 || cdClienteMK) return;

    // Valida CPF real (checksum oficial)
    const isValidCPF = (digits: string): boolean => {
      if (digits.length !== 11) return false;
      if (/(\d)\1{10}/.test(digits)) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
      let d1 = 11 - (sum % 11);
      if (d1 >= 10) d1 = 0;
      if (d1 !== parseInt(digits[9])) return false;
      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
      let d2 = 11 - (sum % 11);
      if (d2 >= 10) d2 = 0;
      return d2 === parseInt(digits[10]);
    };

    // Valida CNPJ real (checksum oficial)
    const isValidCNPJ = (digits: string): boolean => {
      if (digits.length !== 14) return false;
      if (/(\d)\1{13}/.test(digits)) return false;
      const calc = (len: number): number => {
        const weights = len === 12
          ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
          : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        let sum = 0;
        for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * weights[i];
        const mod = sum % 11;
        return mod < 2 ? 0 : 11 - mod;
      };
      return calc(12) === parseInt(digits[12]) && calc(13) === parseInt(digits[13]);
    };

    // Detecta se 11 dígitos seguem padrão de celular BR (DDD>=11 + terceiro dígito 9)
    const looksLikePhone = (digits: string): boolean => {
      if (digits.length !== 11) return false;
      const ddd = parseInt(digits.substring(0, 2), 10);
      return ddd >= 11 && digits[2] === '9';
    };

    // 1) CPF FORMATADO (XXX.XXX.XXX-XX) — impossível confundir com telefone
    const cpfFormatado = /(?<!\d)(\d{3}\.\d{3}\.\d{3}-\d{2})(?!\d)/g;
    // 2) CPF após palavra-chave (cpf, documento, doc) — 11 dígitos puros com contexto
    const cpfComContexto = /(?:cpf|documento|doc)\s*[:=]?\s*(\d{11})(?!\d)/gi;
    // 3) 11 dígitos puros isolados — aceita se NÃO parecer telefone
    const digitos11 = /(?<!\d)(\d{11})(?!\d)/g;
    // 4) CNPJ FORMATADO (XX.XXX.XXX/XXXX-XX) — alta confiança
    const cnpjFormatado = /(?<!\d)(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})(?!\d)/g;
    // 5) CNPJ após palavra-chave — 14 dígitos puros com contexto
    const cnpjComContexto = /(?:cnpj|documento|doc)\s*[:=]?\s*(\d{14})(?!\d)/gi;
    // 6) 14 dígitos puros isolados
    const digitos14 = /(?<!\d)(\d{14})(?!\d)/g;

    const contentPool = [...messagesData].reverse().slice(0, 50);
    const candidates: string[] = [];

    // Primeiro: coleta CPFs formatados (alta confiança)
    for (const msg of contentPool) {
      const content = msg.content;
      if (!content) continue;
      for (const m of content.matchAll(cpfFormatado)) {
        const digits = m[1].replace(/\D/g, '');
        if (isValidCPF(digits) && !candidates.includes(digits)) {
          candidates.push(digits);
        }
      }
    }

    // Segundo: coleta CPFs com contexto textual (média confiança)
    if (candidates.length === 0) {
      for (const msg of contentPool) {
        const content = msg.content;
        if (!content) continue;
        for (const m of content.matchAll(cpfComContexto)) {
          const digits = m[1];
          if (isValidCPF(digits) && !candidates.includes(digits)) {
            candidates.push(digits);
          }
        }
      }
    }

    // Terceiro: 11 dígitos puros que NÃO parecem telefone celular (baixa confiança)
    if (candidates.length === 0) {
      for (const msg of contentPool) {
        const content = msg.content;
        if (!content) continue;
        for (const m of content.matchAll(digitos11)) {
          const digits = m[1];
          if (!looksLikePhone(digits) && isValidCPF(digits) && !candidates.includes(digits)) {
            console.log('[Auto-CPF] 11 dígitos detectados (não parece telefone):', digits);
            candidates.push(digits);
          }
        }
      }
    }

    // Quarto: CNPJs formatados (alta confiança)
    for (const msg of contentPool) {
      const content = msg.content;
      if (!content) continue;
      for (const m of content.matchAll(cnpjFormatado)) {
        const digits = m[1].replace(/\D/g, '');
        if (isValidCNPJ(digits) && !candidates.includes(digits)) {
          candidates.push(digits);
        }
      }
    }

    // Quinto: CNPJs com contexto textual
    for (const msg of contentPool) {
      const content = msg.content;
      if (!content) continue;
      for (const m of content.matchAll(cnpjComContexto)) {
        const digits = m[1];
        if (isValidCNPJ(digits) && !candidates.includes(digits)) {
          candidates.push(digits);
        }
      }
    }

    // Sexto: 14 dígitos puros isolados
    for (const msg of contentPool) {
      const content = msg.content;
      if (!content) continue;
      for (const m of content.matchAll(digitos14)) {
        const digits = m[1];
        if (isValidCNPJ(digits) && !candidates.includes(digits)) {
          console.log('[Auto-Doc] 14 dígitos detectados (CNPJ válido):', digits);
          candidates.push(digits);
        }
      }
    }

    if (candidates.length === 0) {
      console.log('[Auto-Doc] Nenhum CPF/CNPJ válido encontrado nas últimas 50 mensagens.');
      return;
    }

    console.log('[Auto-Doc] Documentos candidatos (CPF/CNPJ):', candidates);

    let cancelled = false;
    (async () => {
      for (const cpf of candidates) {
        if (cancelled) return;
        try {
          const r = await consultaDoc(cpf);
          const arr = Array.isArray(r) ? r : r ? [r] : [];
          const first = arr[0] as any;
          const cd = first ? String(
            first.cd_cliente ??
            first.cdcliente ??
            first.CodigoPessoa ??
            first.CodPessoa ??
            first.idPessoa ??
            first.id ??
            ''
          ) : '';
          if (cd) {
            console.log('[Auto-CPF] Cliente encontrado:', cd, first?.nome, 'CPF:', cpf);
            if (!cancelled) {
              setChatMKMap(prev => ({
                ...prev,
                [selectedChat]: { cd, cliente: first as MKClienteDoc }
              }));
            }
            return;
          }
          console.log('[Auto-CPF] CPF válido mas não encontrado no MK:', cpf);
        } catch (err) {
          console.error('[Auto-CPF] Erro ao consultar MK para', cpf, ':', err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedChat, messagesData, cdClienteMK]);

  // Garantir que chats é sempre um array e normalizar os dados
  // O n8n pode retornar um objeto único ou um array
  const chats = (() => {
    if (!chatsData) {
      return [];
    }

    let rawChats: any[] = [];

    if (Array.isArray(chatsData)) {
      rawChats = chatsData;
      rawChats = rawChats.filter(item => {
        if (!item || typeof item !== 'object') return false;
        if ('json' in item && typeof item.json === 'object') return true;
        const keys = Object.keys(item);
        if (keys.length <= 2 && (keys.includes('success') || keys.includes('pairedItem'))) return false;
        if ('id' in item || 'chatid' in item || 'pushName' in item || 'pushname' in item) return true;
        return true;
      });
    } else if (typeof chatsData === 'object' && chatsData !== null) {
      if ('messages' in chatsData && Array.isArray((chatsData as any).messages)) {
        rawChats = (chatsData as any).messages;
      } else if ('id' in chatsData || 'chatid' in chatsData || 'pushName' in chatsData || 'pushname' in chatsData) {
        rawChats = [chatsData];
      } else {
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
    }

    rawChats = rawChats.map((item) => {
      if (item && typeof item === 'object' && 'json' in item && typeof item.json === 'object') {
        return item.json;
      }
      return item;
    });

    return rawChats
      .map(chat => {
        let pushName = chat.pushName || chat.pushname || null;
        if (typeof pushName === 'string') {
          pushName = pushName.trim().replace(/\n/g, '');
          if (pushName === '' || pushName === 'null' || pushName === 'undefined') {
            pushName = null;
          }
        }

        const chatId = chat.id?.toString() || chat.chatid?.toString() || null;
        const phone = chat.phone?.toString() || chat.clientPhone?.toString() || '';

        return {
          ...chat,
          id: chatId,
          phone,
          pushName,
          lastMessage: chat.lastMessage || chat.lastmessage || null,
          clientPhone: phone,
        };
      })
      .filter(chat => {
        const validId = chat.id &&
          typeof chat.id === 'string' &&
          chat.id.trim() !== '' &&
          chat.id !== 'null' &&
          chat.id !== 'undefined';

        const isSuccessResponse = chat.success === true && !chat.id && !chat.chatid;
        return validId && !isSuccessResponse;
      });
  })();

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
        const stableId = msg.id?.toString() || `msg_${idx}_${Date.now()}`;
        const chatId = msg.chatId || selectedChat || '';

        return {
          ...msg,
          id: stableId,
          chatId,
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
          if (chat.lastMessageSender === 'user') {
            next[chat.id] = (next[chat.id] || 0) + 1;
            hasChanges = true;
          }
          lastSeenTimes.current[chat.id] = timestampTime;
        } else if (!prevTime) {
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
    const sectors = (labels || []).map(l => getSectorFromLabel(l)).filter(Boolean) as string[];
    
    if (sectors.includes('comercial')) {
      return { label: 'Comercial', className: 'bg-blue-50 text-blue-600 border-blue-200' };
    }
    if (sectors.includes('financeiro')) {
      return { label: 'Financeiro', className: 'bg-green-50 text-green-600 border-green-200' };
    }
    if (sectors.includes('tecnico')) {
      return { label: 'Técnico', className: 'bg-orange-50 text-orange-600 border-orange-200' };
    }
    if (isTriagemChat(labels)) {
      return { label: 'Triagem', className: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
    return null;
  };

  const formatAttendantDisplay = (chat: { id?: string; attendant?: string; attendantArea?: string; assigneeId?: number; labels?: string[] }) => {
    const localFallback = chat.id ? localHumanAttendants[chat.id] : undefined;
    const attendantName = chat.attendant?.trim() || localFallback?.name?.trim();
    const attendantArea = chat.attendantArea?.trim() || localFallback?.area?.trim();
    if (!attendantName && !chat.assigneeId) return '';
    if (attendantName && attendantArea) return `${attendantName} | ${attendantArea}`;
    return attendantName || 'Operador atribuído';
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
    setViewMessagesForInterventionChat(prev => ({...prev, [selectedChat || '']: false}));
    setTimeout(() => scrollToBottom(false), 300);
  }, [selectedChat]);

  const handleSendMessage = () => {
    if (selectedChat && messageText.trim()) {
      const shouldAutoAssign = !selectedChatData?.assigneeId && !!user?.chatwoot_id;
      if (shouldAutoAssign) {
        setLocalHumanAttendants(prev => ({
          ...prev,
          [selectedChat]: { name: user?.name, area: user?.area || undefined },
        }));
      }
      sendMessageMutation.mutate(
        {
          chatId: selectedChat,
          content: messageText,
          labels: selectedChatData?.labels,
          operatorChatwootId: user?.chatwoot_id,
          currentAssigneeId: selectedChatData?.assigneeId,
          operatorName: user?.name,
        },
        {
          onSuccess: (response: any) => {
            if (response?.id && user?.name) {
              setMessageSenderOverrides(prev => ({
                ...prev,
                [String(response.id)]: user.name,
              }));
            }
            // Adicionar ao estado local para remover a tarja imediatamente
            setLocalRepliedChats(prev => ({ ...prev, [selectedChat]: Date.now() }));
          },
        }
      );
      setMessageText('');
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
          if (selectedChat) {
            setChatMKMap(prev => ({
              ...prev,
              [selectedChat]: { cd, cliente: first as MKClienteDoc }
            }));
          }
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
          if (selectedChat) {
            setChatMKMap(prev => ({
              ...prev,
              [selectedChat]: { cd, cliente: first as MKClienteDoc }
            }));
          }
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

  const normalizeQuickReplyShortcut = (value: string) =>
    value.trim().replace(/^\/+/, '').toLowerCase().replace(/\s+/g, '-');

  const resolveQuickReplyVariables = (content: string) => {
    const areaLabel = user?.area
      ? user.area.charAt(0).toUpperCase() + user.area.slice(1)
      : '';

    return content
      .replace(/\[nome\]/gi, user?.name || '')
      .replace(/\[cliente\]/gi, selectedChatData?.client || selectedChatData?.phone || '')
      .replace(/\[telefone\]/gi, selectedChatData?.clientPhone || selectedChatData?.phone || '')
      .replace(/\[area\]/gi, areaLabel);
  };

  const quickReplySearch = messageText.startsWith('/') ? normalizeQuickReplyShortcut(messageText) : '';
  const showQuickReplySuggestions = messageText.startsWith('/') && quickReplies.length > 0;
  const filteredQuickReplies = showQuickReplySuggestions
    ? quickReplies.filter(reply => {
      const search = quickReplySearch;
      if (!search) return true;
      return reply.shortcut.includes(search) || reply.title.toLowerCase().includes(search);
    }).slice(0, 6)
    : [];

  const resetQuickReplyForm = () => {
    setEditingQuickReply(null);
    setQuickReplyForm({ title: '', shortcut: '', content: '' });
  };

  const handleSelectQuickReply = (reply: QuickReply) => {
    setMessageText(resolveQuickReplyVariables(reply.content));
  };

  const handleEditQuickReply = (reply: QuickReply) => {
    setEditingQuickReply(reply);
    setQuickReplyForm({
      title: reply.title,
      shortcut: reply.shortcut,
      content: reply.content,
    });
  };

  const handleSaveQuickReply = async () => {
    if (!user?.id) return;

    const title = quickReplyForm.title.trim();
    const shortcut = normalizeQuickReplyShortcut(quickReplyForm.shortcut);
    const content = quickReplyForm.content.trim();

    if (!title || !shortcut || !content) {
      toast.error('Preencha título, atalho e mensagem');
      return;
    }

    try {
      if (editingQuickReply) {
        await updateQuickReplyMutation.mutateAsync({
          id: editingQuickReply.id,
          user_id: user.id,
          title,
          shortcut,
          content,
        });
        toast.success('Mensagem pré-pronta atualizada');
      } else {
        await createQuickReplyMutation.mutateAsync({
          user_id: user.id,
          title,
          shortcut,
          content,
        });
        toast.success('Mensagem pré-pronta cadastrada');
      }
      resetQuickReplyForm();
    } catch (error: any) {
      const isDuplicate = String(error?.message || '').toLowerCase().includes('duplicate');
      toast.error(isDuplicate ? 'Você já tem uma mensagem com esse atalho' : 'Erro ao salvar mensagem pré-pronta');
    }
  };

  const handleDeleteQuickReply = async (reply: QuickReply) => {
    if (!user?.id) return;

    try {
      await deleteQuickReplyMutation.mutateAsync({ id: reply.id, userId: user.id });
      if (editingQuickReply?.id === reply.id) resetQuickReplyForm();
      toast.success('Mensagem pré-pronta removida');
    } catch {
      toast.error('Erro ao remover mensagem pré-pronta');
    }
  };

  // Filtrar chats por permissão de setor, status e busca
  const filteredChats = chats.filter(chat => {
    // 1. REGRA DE VISIBILIDADE (Privacidade de Setor)
    const chatLabels = chat.labels || [];
    const isTriagem = isTriagemChat(chatLabels);
    const chatSectors = chatLabels.map(l => getSectorFromLabel(l)).filter(Boolean) as string[];
    const hasHumanIntervention = needsHumanIntervention(chatLabels);
    const chatStatus = chat.status || (chat as any).statusP;

    // Se não for admin/master, aplicamos restrição de setor/responsável
    if (!isAdminOrMaster) {
      // 1.1 Sempre vê o que está atribuído diretamente a ele
      const isAssignedToMe = chat.assigneeId && user?.chatwoot_id && String(chat.assigneeId) === String(user.chatwoot_id);
      
      if (!isTriagem && !isAssignedToMe) {
        // Só pode ver se o setor canônico do chat bater com o setor do usuário
        if (!userSectorKey || !chatSectors.includes(userSectorKey)) {
          return false;
        }
      }
    }

    // 2. FILTRO DE STATUS
    if (statusFilter === 'active') {
      if (chatStatus === 'concluido' && !hasHumanIntervention) return false;
      if (chatStatus !== 'active' && !hasHumanIntervention) return false;
    } else if (statusFilter === 'needs_human') {
      if (!hasHumanIntervention) return false;
    } else if (statusFilter !== 'all') {
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

    // 4. FILTRO DE SETOR (Seleção na UI — só admin/master e encarregado)
    if (sectorFilter !== 'all') {
      if (sectorFilter === 'triagem') {
        if (!isTriagem) return false;
      } else {
        const filterKey = normalizeText(sectorFilter);
        const canonicalKey = filterKey === 'tecnica' ? 'tecnico' : filterKey;
        if (!chatSectors.includes(canonicalKey)) return false;
      }
    }

    return true;
  });

  // Ordenar por prioridade de tempo de espera (crítico > alerta > normal)
  const sortedChats = [...filteredChats].sort((a, b) => {
    const alertaPriority: Record<string, number> = { critico: 0, alerta: 1, normal: 2 };
    
    // Override local se respondido recentemente (menos de 3 min)
    const isAReplied = localRepliedChats[a.id] && (Date.now() - localRepliedChats[a.id] < 180000);
    const isBReplied = localRepliedChats[b.id] && (Date.now() - localRepliedChats[b.id] < 180000);
    
    const statusA = isAReplied ? 'normal' : (a.statusAlerta || 'normal');
    const statusB = isBReplied ? 'normal' : (b.statusAlerta || 'normal');
    
    const prioA = alertaPriority[statusA] ?? 2;
    const prioB = alertaPriority[statusB] ?? 2;

    // Primeiro: ordenar por prioridade de alerta
    if (prioA !== prioB) return prioA - prioB;

    // Dentro da mesma prioridade de alerta: quem espera mais aparece primeiro
    if (prioA < 2 && a.waitingMinutes && b.waitingMinutes) {
      return (b.waitingMinutes || 0) - (a.waitingMinutes || 0);
    }

    // Para conversas normais: mais recente primeiro (updatedAt desc)
    const timeA = new Date(a.updatedAt || a.time || 0).getTime();
    const timeB = new Date(b.updatedAt || b.time || 0).getTime();
    return timeB - timeA;
  });

  // Paginar chats: mostrar apenas os primeiros X chats
  const displayedChats = sortedChats.slice(0, chatsToShow);
  const hasMoreChats = sortedChats.length > chatsToShow;

  // Função para carregar mais chats
  const loadMoreChats = () => {
    setChatsToShow(prev => prev + 20);
  };

  // Resetar paginação quando mudar o filtro
  useEffect(() => {
    setChatsToShow(20);
  }, [statusFilter]);

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
      <div className="flex flex-col h-full gap-3">
        {/* Page Header */}
        <div className={cn(
          "flex-shrink-0",
          isMobile && selectedChat && "hidden"
        )}>
          <h1 className="text-base sm:text-xl font-bold text-foreground leading-tight">Atendimentos</h1>
          <p className="text-xs text-muted-foreground">Gerencie todas as conversas em tempo real</p>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:grid lg:grid-cols-3 gap-3">
          {/* Chat List - No mobile, só aparece quando não tem chat selecionado */}
          <Card className={cn(
            "shadow-card flex flex-col min-h-0",
            isMobile && selectedChat && "hidden"
          )}>
            <CardHeader className="pb-3">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm sm:text-base font-bold text-foreground">Conversas</CardTitle>
                    {user && (
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold px-1 py-0 bg-[#f0f2f5] text-[#54656f] border-none">
                        {user.role} {user.area ? `| ${user.area}` : ''}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Filtros</span>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-7 flex-1 text-[10px] border rounded-md px-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="active">Status: Em andamento</option>
                    <option value="needs_human">Necessidade de intervenção</option>
                    <option value="all">Status: Todos</option>
                    <option value="pendente">Pendentes</option>
                    <option value="active">Em Andamento</option>
                    <option value="concluido">Concluídos</option>
                  </select>
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="h-7 flex-1 text-[10px] border rounded-md px-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                  >
                    {isAdminOrMaster ? (
                      <>
                        <option value="all">Setores: Todos</option>
                        <option value="triagem">Triagem</option>
                        <option value="comercial">Comercial</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="tecnico">Técnico</option>
                      </>
                    ) : userSectorKey ? (
                      <>
                        <option value="all">Todos ({userSectorName} + Triagem)</option>
                        <option value={userSectorKey}>Só {userSectorName}</option>
                        <option value="triagem">Só Triagem</option>
                      </>
                    ) : (
                      <>
                        <option value="all">Todos (sem setor)</option>
                        <option value="triagem">Só Triagem</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8 h-8 text-xs sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto min-h-0">
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
                      const isRecentlyReplied = localRepliedChats[chat.id] && (Date.now() - localRepliedChats[chat.id] < 180000);
                      const finalStatusAlerta = isRecentlyReplied ? 'normal' : chat.statusAlerta;
                      const isAlerta = finalStatusAlerta === 'alerta';
                      const isCritico = finalStatusAlerta === 'critico';
                      const hasResponseAlert = isAlerta || isCritico;
                      return (
                        <div
                          key={chat.id}
                          onClick={() => setSelectedChat(chat.id)}
                          className={cn(
                            "p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/50",
                            selectedChat === chat.id
                              ? "bg-primary-muted border-l-4 border-l-primary"
                              : (needsHuman && chat.status !== 'resolved' && chat.status !== 'concluido')
                                ? "bg-red-50 border-l-4 border-l-red-500 animate-pulse"
                                : (isCritico && chat.status !== 'resolved' && chat.status !== 'concluido')
                                  ? "bg-red-50/80 border-l-4 border-l-red-500"
                                  : (isAlerta && chat.status !== 'resolved' && chat.status !== 'concluido')
                                    ? "bg-amber-50/60 border-l-4 border-l-amber-400"
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
                              {needsHuman && chat.status !== 'resolved' && chat.status !== 'concluido' && (
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
                                const isActivity = chat.lastMessageSender === 'activity';

                                if (isSummary) {
                                  const textAfter = msg.replace('[Resumo IA]', '').trim();
                                  return (
                                    <div className="flex items-start gap-1.5 mb-2 w-full">
                                      {chat.lastMessageSender === 'agent' && (
                                        <Bot className="w-3.5 h-3.5 mt-1 text-primary flex-shrink-0" />
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

                                if (isActivity) {
                                  return (
                                    <div className="flex items-center gap-1.5 mb-2 overflow-hidden w-full">
                                      <div className="bg-[#f0f4f8] text-[#8696a0] px-1.5 py-0.5 rounded text-[10px] font-medium italic border border-[#e1e8ed]/60 truncate max-w-full">
                                        {msg}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="flex items-center gap-1.5 mb-2 overflow-hidden w-full">
                                    {chat.lastMessageSender === 'agent' && (
                                      <Bot className="w-3.5 h-3.5 flex-shrink-0" />
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
                              {/* Alertas de SLA e Intervenção */}
                              <div className="flex flex-col gap-1.5 mt-1.5">
                                {hasResponseAlert && chat.status !== 'resolved' && chat.status !== 'concluido' && chat.waitingMinutes && chat.waitingMinutes >= 10 && (
                                  <div className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold",
                                    isCritico
                                      ? "bg-red-100 text-red-700 border border-red-200 animate-pulse"
                                      : "bg-amber-100 text-amber-700 border border-amber-200"
                                  )}>
                                    <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{chat.waitingMinutes}min sem resposta</span>
                                    {chat.atendenteTipo === 'ia' && (
                                      <span className="flex items-center gap-0.5 ml-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        IA não respondeu
                                      </span>
                                    )}
                                    {chat.atendenteTipo === 'humano' && (
                                      <span className="ml-1 font-normal opacity-80">
                                        Operador pendente
                                      </span>
                                    )}
                                  </div>
                                )}


                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 bg-muted/30 px-1.5 py-0 rounded border border-border/50">
                                    {getChannelIcon(chat.channel || chat.WhatsApp || 'WhatsApp')}
                                    <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground whitespace-nowrap lowercase">
                                      {chat.channel || chat.WhatsApp || 'WhatsApp'}
                                    </span>
                                  </div>
                                  {(() => {
                                    const sector = getSectorInfo(chat.labels);
                                    if (!sector) return null;
                                    return (
                                      <Badge variant="outline" className={cn("px-1.5 py-0 font-bold uppercase text-[9px]", sector.className)}>
                                        {sector.label}
                                      </Badge>
                                    );
                                  })()}
                                  {needsHuman && chat.status !== 'resolved' && chat.status !== 'concluido' && (
                                    <Badge 
                                      variant="destructive" 
                                      className="px-1.5 py-0 font-bold uppercase text-[9px] bg-red-500 hover:bg-red-600 text-white border-none animate-pulse flex items-center gap-1 shadow-sm"
                                    >
                                      <AlertCircle className="w-2.5 h-2.5" />
                                      Intervenção {chat.waitingMinutes !== undefined && `(${chat.waitingMinutes}m)`}
                                    </Badge>
                                  )}
                                  {chat.status !== 'concluido' && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {formatAttendantDisplay(chat) ? (
                                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                                          <User className="w-3 h-3 text-primary" />
                                          Sendo atendido por: {formatAttendantDisplay(chat)}
                                        </span>
                                      ) : (!needsHuman && !chat.labels?.includes('agente-off')) ? (
                                        <span className="text-[11px] text-primary font-bold flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md">
                                          <Bot className="w-3 h-3" />
                                          Sendo atendido por: IA ATIVA
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
                          Ver mais ({sortedChats.length - chatsToShow} restantes)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface - No mobile, aparece quando tem chat selecionado */}
          <div className={cn(
            "lg:col-span-2 flex flex-col min-h-0",
            isMobile && !selectedChat && "hidden"
          )}>
            {selectedChatData ? (
              <Card className="shadow-card h-full flex flex-col min-h-0">
                {/* Chat Header */}
                <CardHeader className="py-2 sm:py-3 px-3 sm:px-4 border-b border-border bg-background/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {isMobile && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 flex-shrink-0"
                          onClick={() => setSelectedChat(null)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                            {getInitials(formatClientName(selectedChatData))}
                          </AvatarFallback>
                        </Avatar>
                        {selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento') && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white"></span>
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">
                            {formatClientName(selectedChatData)}
                          </h3>
                          {selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento') && (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-[8px] sm:text-[9px] animate-pulse border-none px-1 py-0 flex-shrink-0">
                              INTERVENÇÃO
                            </Badge>
                          )}
                          
                          {/* Indicadores MKCloud Rápidos */}
                          {cdClienteMK ? (
                            mkSummaryData ? (
                              <div 
                                className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 flex-wrap"
                              >
                                {/* Conexão */}
                                {(() => {
                                  const connections = mkSummaryData.conexoes || [];
                                  const hasConnections = connections.length > 0;
                                  const isOnline = connections.some(c => {
                                    const s = String(c.status_conexao || '').toLowerCase().trim();
                                    return s.includes('conectado') || s.includes('online') || s.includes('ativo') || s === 'c' || s === 'a';
                                  });
                                  
                                  const mainStatus = hasConnections 
                                    ? (isOnline ? 'Conectado' : 'Desconectado')
                                    : 'Sem Conexão';
                                  return (
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "px-1 py-0 text-[9px] border-none font-bold uppercase cursor-pointer hover:brightness-95",
                                        isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                      )}
                                    >
                                      {mainStatus}
                                    </Badge>
                                  );
                                })()}

                                {/* Financeiro */}
                                {(() => {
                                  const faturas = mkSummaryData.faturas || [];
                                  const temVencida = faturas.some(f => String(f.situacao || '').toLowerCase().includes('vencida'));
                                  return (
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "px-1 py-0 text-[9px] border-none font-bold uppercase cursor-pointer hover:brightness-95",
                                        temVencida ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                      )}
                                    >
                                      {temVencida ? 'Fatura Vencida' : 'Financeiro em Dia'}
                                    </Badge>
                                  );
                                })()}

                                {/* Suspensão */}
                                {/* Suspensão */}
                                {mkSummaryData.contratos.some(c => c.status?.toLowerCase().includes('suspenso')) && (
                                  <Badge className="px-1 py-0 text-[9px] bg-red-600 text-white font-bold uppercase border-none cursor-pointer">
                                    Suspenso
                                  </Badge>
                                )}

                                {/* Vencimento de Contrato */}
                                {soonestExpiringMKHeader && (
                                  <Badge variant={soonestExpiringMKHeader.diffDays < 0 ? "destructive" : "outline"} className={cn(
                                    "px-1 py-0 text-[10px] border-none font-bold animate-in fade-in slide-in-from-left-2 duration-300",
                                    soonestExpiringMKHeader.diffDays >= 0 ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : ""
                                  )}>
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {soonestExpiringMKHeader.diffDays < 0 
                                      ? `Contrato do cliente venceu há ${Math.abs(soonestExpiringMKHeader.diffDays)} dias`
                                      : soonestExpiringMKHeader.diffDays === 0 
                                        ? 'Contrato do cliente vence hoje!' 
                                        : `Contrato do cliente irá vencer em ${soonestExpiringMKHeader.diffDays} dias`
                                    }
                                  </Badge>
                                )}
                              </div>
                            ) : mkSummaryLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />
                            ) : null
                          ) : null}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {formatPhoneNumber(selectedChatData.phone, selectedChatData.id)}
                        </p>
                        {(selectedChatData.status || (selectedChatData as any).statusP) !== 'concluido' && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {formatAttendantDisplay(selectedChatData) ? (
                              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                                <User className="w-3 h-3 text-primary" />
                                Sendo atendido por: {formatAttendantDisplay(selectedChatData)}
                              </span>
                            ) : (!selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento') && !selectedChatData.labels?.includes('agente-off')) ? (
                              <span className="text-[10px] text-primary font-bold flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md">
                                <Bot className="w-3 h-3" />
                                Sendo atendido por: IA ATIVA
                              </span>
                            ) : null}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 overflow-x-auto no-scrollbar">
                          <div className="flex items-center gap-1 bg-muted/30 px-1.5 py-0 rounded border border-border/50">
                            {getChannelIcon(selectedChatData.channel || selectedChatData.WhatsApp || 'WhatsApp')}
                            <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground whitespace-nowrap lowercase">
                              {selectedChatData.channel || selectedChatData.WhatsApp || 'WhatsApp'}
                            </span>
                          </div>
                          
                          {(() => {
                            const sector = getSectorInfo(selectedChatData.labels);
                            if (!sector) return null;
                            return (
                              <Badge variant="outline" className={cn("px-1.5 py-0 font-bold uppercase text-[9px]", sector.className)}>
                                {sector.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    
                      <div className="flex items-center gap-1.5 flex-wrap md:justify-end">
                        <Button
                          variant={cdClienteMK ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-auto py-1 text-[10px] flex flex-col items-center justify-center text-center",
                            cdClienteMK ? "bg-green-600 hover:bg-green-700 text-white border-green-700 shadow-sm" : ""
                          )}
                          onClick={() => { 
                            if (cdClienteMK) {
                              setShowMkPanel(true);
                              // Caso já estivesse aberto mas minimizado
                              window.dispatchEvent(new CustomEvent('mk-panel-unminimize'));
                            } else {
                              setSearchMKError(null); 
                              setShowBuscarClienteMK(true); 
                            }
                          }}
                        >
                          <div className="flex items-center">
                            {cdClienteMK ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <UserSearch className="w-3.5 h-3.5 mr-1" />}
                            <span className="font-semibold">{cdClienteMK ? "Cliente MK" : "Cliente MK"}</span>
                          </div>
                          {cdClienteMK && (
                            <span className="text-[8px] opacity-90 -mt-0.5 font-medium">Identificado</span>
                          )}
                        </Button>
                      
                      {(selectedChatData.status || (selectedChatData as any).statusP) !== 'concluido' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => setShowTransferModal(true)}
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            Transferir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => setShowCloseModal(true)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Encerrar
                          </Button>
                          
                          {selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento' || l.toLowerCase() === 'agente-off') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2 bg-primary/5 text-primary border-primary/20"
                              onClick={() => {
                                reactivateAIMutation.mutate({
                                  id: selectedChatData.id,
                                  labels: selectedChatData.labels
                                });
                              }}
                              disabled={reactivateAIMutation.isPending}
                            >
                              <Bot className={cn("w-3.5 h-3.5 mr-1", reactivateAIMutation.isPending && "animate-spin")} />
                              Reativar IA
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                              onClick={() => {
                                interveneChatMutation.mutate({
                                  id: selectedChatData.id,
                                  labels: selectedChatData.labels
                                });
                                logAuditAction('chat_intervene', { clientName: formatClientName(selectedChatData) }, 'chat', selectedChatData.id);
                              }}
                              disabled={interveneChatMutation.isPending}
                            >
                              <UserSearch className={cn("w-3.5 h-3.5 mr-1", interveneChatMutation.isPending && "animate-spin")} />
                              Intervir
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => setViewMessagesForClosedChat(prev => ({...prev, [selectedChatData.id]: false}))}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Resumo
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => updateStatusMutation.mutate({ id: selectedChatData.id, status: 'active' })}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
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
                      <div className="absolute inset-0 z-30 flex items-center justify-center p-3">
                        <Card className="w-full max-w-sm shadow-xl border-primary/20">
                          <CardHeader className="text-center pb-1 pt-4">
                            <div className="mx-auto bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mb-1.5">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <CardTitle className="text-base">Resumo do Atendimento</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 px-4 pb-4">
                            <div className="bg-[#f8f9fa] p-2.5 rounded-lg text-left border border-border/50 max-h-28 overflow-y-auto">
                              <h4 className="text-[10px] font-bold text-muted-foreground mb-1 flex items-center uppercase tracking-wider">
                                <Bot className="w-3 h-3 mr-1 text-primary" /> Resumo da IA
                              </h4>
                              <p className="text-[12px] leading-relaxed text-[#54656f] whitespace-pre-wrap">{summaryText}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-muted/20 p-2 rounded-lg border border-border/40 text-center">
                                <span className="text-[10px] text-muted-foreground block mb-0.5">Duração</span>
                                <span className="font-semibold text-xs">{durationText}</span>
                              </div>
                              <div className="bg-muted/20 p-2 rounded-lg border border-border/40 text-center flex flex-col items-center justify-center">
                                <span className="text-[10px] text-muted-foreground block mb-0.5">Status</span>
                                <Badge variant="outline" className="h-4 bg-success/5 text-success border-success/20 text-[9px] px-1 py-0">Concluído</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1 border-t border-border/50">
                              <Button 
                                className="flex-1 h-7 text-[11px]" 
                                variant="outline"
                                onClick={() => setViewMessagesForClosedChat(prev => ({...prev, [selectedChatData.id]: true}))}
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Ver Mensagens
                              </Button>
                              <Button 
                                className="flex-1 h-7 text-[11px]"
                                onClick={() => updateStatusMutation.mutate({ id: selectedChatData.id, status: 'active' })}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reabrir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                  {/* Overlay de Intervenção Humana (Escalado pelo n8n) */}
                  {(() => {
                    const isClosed = (selectedChatData.status || (selectedChatData as any).statusP) === 'concluido';
                    const hasIntervention = selectedChatData.labels?.some((l: string) => l.toLowerCase() === 'precisa_atendimento');
                    const showOverlay = hasIntervention && !isClosed && !viewMessagesForInterventionChat[selectedChatData.id];
                    
                    if (!showOverlay) return null;

                    // Pega o resumo que vem do useChats (Supabase) ou procura nas mensagens
                    let summaryText = (selectedChatData as any).escalationSummary || 'Aguardando resumo da IA...';
                    
                    // Busca reversa para pegar a última mensagem com resumo (apenas se não achou no banco)
                    if (!summaryText || summaryText === 'Aguardando resumo da IA...') {
                      if (messages && messages.length > 0) {
                        for (let i = messages.length - 1; i >= 0; i--) {
                          const m = messages[i];
                          if (m.content && m.content.includes('*Resumo da conversa*:')) {
                            const parts = m.content.split('*Resumo da conversa*:');
                            if (parts.length > 1) {
                              summaryText = parts[1].trim().replace(/^"|"$/g, '');
                            }
                            break;
                          }
                        }
                      }
                    }

                    return (
                      <div className="absolute inset-0 z-30 flex items-center justify-center p-3 bg-black/20 backdrop-blur-[1px]">
                        <Card className="w-full max-w-sm shadow-2xl border-red-500/30 animate-in fade-in zoom-in-95 duration-200">
                          <CardHeader className="text-center pb-1 pt-4">
                            <div className="mx-auto bg-red-100 w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-inner">
                              <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
                            </div>
                            <CardTitle className="text-base text-red-700">Intervenção Solicitada</CardTitle>
                            <p className="text-[10px] text-muted-foreground mt-0.5">A IA identificou a necessidade de um atendente humano.</p>
                          </CardHeader>
                          <CardContent className="space-y-2 px-4 pb-4">
                            <div className="bg-[#f8f9fa] p-2.5 rounded-lg text-left border border-border/60 shadow-sm max-h-28 overflow-y-auto">
                              <h4 className="text-[10px] font-bold text-muted-foreground mb-1 flex items-center uppercase tracking-wider">
                                <Bot className="w-3 h-3 mr-1 text-primary" /> Resumo da IA
                              </h4>
                              <p className="text-[12px] leading-relaxed text-[#54656f] whitespace-pre-wrap">{summaryText}</p>
                            </div>
                            
                            <div className="flex gap-2 pt-1 border-t border-border/50 mt-2">
                              <Button 
                                className="flex-1 h-7 text-[11px] shadow-sm bg-red-600 hover:bg-red-700 text-white" 
                                onClick={() => {
                                  setLocalHumanAttendants(prev => ({
                                    ...prev,
                                    [selectedChatData.id]: {
                                      name: user?.name,
                                      area: user?.area || undefined,
                                    },
                                  }));
                                  takeOverChatMutation.mutate({
                                    id: selectedChatData.id,
                                    labels: selectedChatData.labels,
                                    attendantId: user?.chatwoot_id
                                  });
                                }}
                                disabled={takeOverChatMutation.isPending}
                              >
                                {takeOverChatMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserCheck className="w-3 h-3 mr-1" />}
                                Começar a Atender
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                className="flex-1 h-7 text-[11px]"
                                variant="outline"
                                onClick={() => setViewMessagesForInterventionChat(prev => ({...prev, [selectedChatData.id]: true}))}
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Ver Mensagens
                              </Button>
                              <Button 
                                className="flex-1 h-7 px-2 text-[11px]"
                                variant="outline"
                                onClick={() => setShowTransferModal(true)}
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Transferir
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
                          className="rounded-full shadow-xl bg-white/95 backdrop-blur-sm hover:bg-white border border-border text-foreground h-11 px-4 flex items-center gap-2 transition-all hover:shadow-2xl hover:scale-105"
                          size="sm"
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
                        </div>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        // Corrigir: sender pode ser 'user' (cliente) ou 'agent' (agente)
                        const isClient = message.sender === 'user' || message.sender === 'client';
                        const isAgent = message.sender === 'agent' || message.sender === 'ai';

                        // Nome do operador que enviou: Chatwoot (fonte verdade) > override local (só fallback para msgs recém-enviadas sem senderName ainda)
                        let displaySenderName = message.senderName || messageSenderOverrides[message.id] || undefined;
                        if (displaySenderName === 'Gabriel Souza' || displaySenderName === 'gabrieldesouza100' || displaySenderName === 'Gabriel') {
                          displaySenderName = selectedChatData?.assigneeName || 'Assistente Virtual';
                        }
                        
                        const prevMessage = index > 0 ? messages[index - 1] : null;
                        let prevDisplaySenderName = prevMessage ? ((prevMessage as any).senderName || messageSenderOverrides[prevMessage.id]) : undefined;
                        if (prevDisplaySenderName === 'Gabriel Souza' || prevDisplaySenderName === 'gabrieldesouza100' || prevDisplaySenderName === 'Gabriel') {
                          prevDisplaySenderName = selectedChatData?.assigneeName || 'Assistente Virtual';
                        }
                        if (prevDisplaySenderName === 'Assistente Virtual') {
                          prevDisplaySenderName = undefined;
                        }

                        // É humano quando tem senderName (agente real, não IA) e não é assistente virtual
                        const isHuman = isAgent && !!displaySenderName && displaySenderName !== 'Assistente Virtual';
                        if (!isHuman && displaySenderName === 'Assistente Virtual') {
                          displaySenderName = undefined; // Não exibir nome de assistente virtual no card verde
                        }
                        // Verifica se é o mesmo remetente da mensagem anterior (para agrupar)
                        // Para agentes, também agrupa pelo nome (diferente operador = não agrupa)
                        const isSameSender = prevMessage && (
                          ((prevMessage.sender === 'user' || prevMessage.sender === 'client') &&
                            (message.sender === 'user' || message.sender === 'client')) ||
                          ((prevMessage.sender === 'agent' || prevMessage.sender === 'ai') &&
                            (message.sender === 'agent' || message.sender === 'ai') &&
                            prevDisplaySenderName === displaySenderName)
                        );

                        // Mostrar nome do operador na primeira mensagem do bloco
                        const showAgentName = isAgent && displaySenderName && !isSameSender;

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

                        if (message.sender === 'activity') {
                          let activityContent = message.content || '';
                          if (activityContent.includes('Gabriel Souza') || activityContent.includes('gabrieldesouza100')) {
                            // Se a conversa tem um responsável humano, atribuímos a ação a ele. Se não, foi o sistema.
                            const operatorNameToShow = selectedChatData?.assigneeName || 'Sistema';
                            activityContent = activityContent.replace(/Gabriel Souza|gabrieldesouza100/g, operatorNameToShow);
                          }

                          return (
                            <div key={message.id} ref={isLastMessage ? lastMessageRef : null} className="flex justify-center my-3">
                              <div className="bg-[#f0f4f8]/80 text-[#8696a0] text-[11px] font-medium italic px-4 py-1.5 rounded-full text-center shadow-sm max-w-[85%] border border-[#e1e8ed]/60">
                                {activityContent}
                              </div>
                            </div>
                          );
                        }

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
                                isClient ? "bg-[#dfe5e7]" : isHuman ? "bg-[#25d366]" : "bg-[#34b7f1]"
                              )}>
                                {isClient ? (
                                  <User className="w-4 h-4 text-[#54656f]" />
                                ) : isHuman ? (
                                  <UserRound className="w-4 h-4 text-white" />
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
                                {/* Nome do operador que enviou */}
                                {showAgentName && (
                                  <p className="text-[11px] font-semibold text-[#1b72e8] mb-0.5">{displaySenderName}</p>
                                )}
                                {/* Renderizar conteúdo baseado no tipo */}
                                {(() => {
                                  // Filtrar conteúdo de placeholder ("file" ou vindo vazio)
                                  const hasRichContent = message.content && message.content.toLowerCase() !== 'file' && message.content.trim() !== '';

                                  // Detecta se o conteúdo é apenas um rótulo de mídia automático
                                  const mediaLabels = ['imagem', 'mensagem de voz', 'vídeo', 'video', 'arquivo pdf', 'figurinha', 'mídia', 'midia'];
                                  const isMediaLabel = hasRichContent
                                    && message.type !== 'text'
                                    && message.media
                                    && mediaLabels.includes(message.content.trim().toLowerCase());

                                  return (
                                    <div className="flex flex-col gap-2">
                                      {/* Se houver texto acompanhando a mídia */}
                                      {hasRichContent && !isMediaLabel && (
                                        <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
                                          {message.content}
                                        </p>
                                      )}

                                      {/* Rótulo estilizado de tipo de mídia */}
                                      {isMediaLabel && (
                                        <div className="inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full bg-black/[0.04] border border-black/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                                          {message.type === 'image' && <ImageIcon className="w-3 h-3 text-blue-500/80" />}
                                          {message.type === 'audio' && <Mic className="w-3 h-3 text-purple-500/80" />}
                                          {message.type === 'video' && <Video className="w-3 h-3 text-orange-500/80" />}
                                          {message.type === 'document' && <FileText className="w-3 h-3 text-red-500/80" />}
                                          <span className="text-[11px] font-medium text-[#54656f] tracking-tight">
                                            {message.content}
                                          </span>
                                        </div>
                                      )}

                                      {/* Renderizar mídias */}
                                      {message.type === 'image' && message.media && (
                                        <div className="overflow-hidden rounded-md border border-black/5">
                                          <img
                                            src={message.media.url}
                                            alt={message.media.name}
                                            className="max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity max-h-[300px] object-contain"
                                            onClick={() => setLightboxImage(message.media.url)}
                                          />
                                        </div>
                                      )}

                                      {message.type === 'video' && message.media && (
                                        <div className="overflow-hidden rounded-md border border-black/5 bg-black">
                                          <video
                                            src={message.media.url}
                                            controls
                                            className="max-w-full h-auto max-h-[300px] outline-none"
                                          />
                                        </div>
                                      )}

                                      {message.type === 'audio' && message.media && (
                                        <WhatsAppAudioPlayer url={message.media.url} />
                                      )}

                                      {message.type === 'document' && message.media && (
                                        <div className="flex items-start gap-3 py-1 bg-black/5 p-2 rounded-lg border border-black/5">
                                          <div className="flex-shrink-0 mt-0.5">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100">
                                              <FileText className="w-5 h-5 text-red-600" />
                                            </div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[14.2px] font-medium text-[#111b21] truncate mb-1">
                                              {(() => {
                                                const name = message.media.name || 'document';
                                                const url = message.media.url || '';
                                                // Se o nome não tem extensão (ex: .pdf, .jpg), tenta buscar na URL
                                                if (!name.includes('.') && url.includes('.')) {
                                                  const ext = url.split('.').pop()?.split('?')[0];
                                                  if (ext && ext.length <= 4) return `${name}.${ext}`;
                                                }
                                                return name;
                                              })()}
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
                                      )}

                                      {/* Se for apenas texto (sem tipo de mídia mapeado mas com conteúdo) */}
                                      {message.type !== 'image' && message.type !== 'video' && message.type !== 'audio' && message.type !== 'document' && (
                                        <div>
                                          {/* Já renderizado acima se hasRichContent for true */}
                                          {!hasRichContent && message.content && (
                                             <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.content}</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Detector de CPF nas mensagens */}
                                      {(() => {
                                        const cpfRegex = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;
                                        const cpfMatch = message.content?.match(cpfRegex);
                                        if (cpfMatch) {
                                          const foundCpf = cpfMatch[0].replace(/\D/g, '');
                                          const isLinked = cdClienteMK && chatMKMap[selectedChat]?.cliente;
                                          const isThisCpfLinked = isLinked && (String(chatMKMap[selectedChat]?.cliente?.doc).replace(/\D/g, '') === foundCpf || chatMKMap[selectedChat]?.cliente?.doc === undefined);
                                          
                                          return (
                                            <div className="pt-1">
                                              <Button
                                                variant={isThisCpfLinked ? "default" : "secondary"}
                                                size="sm"
                                                className={cn(
                                                  "h-6 px-2 text-[9px] gap-1 transition-colors disabled:opacity-50",
                                                  isThisCpfLinked 
                                                    ? "bg-green-600 hover:bg-green-700 text-white border-green-700 shadow-sm"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                                                )}
                                                disabled={searchMKLoading || isThisCpfLinked}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (isThisCpfLinked) return;
                                                  
                                                  setSearchMKLoading(true);
                                                  toast.info(`Buscando ${foundCpf} no MKCloud...`);
                                                  
                                                  consultaDoc(foundCpf).then(r => {
                                                    const arr = Array.isArray(r) ? r : r ? [r] : [];
                                                    const first = arr[0];
                                                    if (first) {
                                                      const cd = String((first as any).cd_cliente ?? (first as any).cdcliente ?? '');
                                                      if (selectedChat) {
                                                        setChatMKMap(prev => ({
                                                          ...prev,
                                                          [selectedChat]: { cd, cliente: first as MKClienteDoc }
                                                        }));
                                                      }
                                                      setShowBuscarClienteMK(false);
                                                      setSearchMKValue('');
                                                    } else {
                                                      toast.error(`CPF ${foundCpf} não localizado no MKCloud.`);
                                                    }
                                                  }).catch(err => {
                                                    toast.error(`Falha MKCloud: ${err.message}`);
                                                  }).finally(() => {
                                                    setSearchMKLoading(false);
                                                  });
                                                }}
                                              >
                                                {searchMKLoading ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : isThisCpfLinked ? (
                                                  <CheckCircle2 className="w-3 h-3" />
                                                ) : (
                                                  <UserSearch className="w-3 h-3" />
                                                )}
                                                {isThisCpfLinked ? "Cliente MK Identificado" : `CPF Identificado: ${cpfMatch[0]}`}
                                              </Button>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  );
                                })()}

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

                {/* Area Footer - Input & Sugestões */}
                <div className="relative">
                  {/* Message Input - Estilo WhatsApp */}
                  <div className="p-3 bg-[#f0f2f5] border-t border-[#e9edef]">
                    {showAudioRecorder && selectedChat ? (
                      <AudioRecorder
                        chatId={selectedChat}
                        onSend={handleSendAudio}
                        onCancel={() => setShowAudioRecorder(false)}
                        isLoading={sendAttachmentMutation.isPending}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 p-0 rounded-full flex-shrink-0 text-[#54656f] hover:bg-[#d1d7db]"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sendAttachmentMutation.isPending}
                        >
                          <Paperclip className="w-5 h-5" />
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && selectedChat) {
                              const shouldAutoAssign = !selectedChatData?.assigneeId && !!user?.chatwoot_id;
                              if (shouldAutoAssign) {
                                setLocalHumanAttendants(prev => ({
                                  ...prev,
                                  [selectedChat]: { name: user?.name, area: user?.area || undefined },
                                }));
                              }
                              sendAttachmentMutation.mutate(
                                {
                                  chatId: selectedChat,
                                  file,
                                  content: '',
                                  operatorChatwootId: user?.chatwoot_id,
                                  currentAssigneeId: selectedChatData?.assigneeId,
                                  labels: selectedChatData?.labels,
                                  operatorName: user?.name,
                                },
                                {
                                  onSuccess: (response: any) => {
                                    toast.success('Anexo enviado');
                                    if (response?.id && user?.name) {
                                      setMessageSenderOverrides(prev => ({
                                        ...prev,
                                        [String(response.id)]: user.name,
                                      }));
                                    }
                                    // Adicionar ao estado local para remover a tarja imediatamente
                                    setLocalRepliedChats(prev => ({ ...prev, [selectedChat]: Date.now() }));
                                  },
                                  onError: (err) => {
                                    toast.error('Erro ao enviar anexo');
                                    console.error(err);
                                  },
                                }
                              );
                            }
                            if (e.target) e.target.value = '';
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 p-0 rounded-full flex-shrink-0 text-[#54656f] hover:bg-[#d1d7db]"
                          onClick={() => setShowQuickReplyModal(true)}
                          title="Mensagens pré-prontas"
                        >
                          <Zap className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 bg-white rounded-lg relative">
                          {showQuickReplySuggestions && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg border border-border shadow-xl overflow-hidden z-30 max-h-72 overflow-y-auto">
                              {filteredQuickReplies.length > 0 ? (
                                filteredQuickReplies.map(reply => (
                                  <button
                                    key={reply.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/50 last:border-b-0"
                                    onClick={() => handleSelectQuickReply(reply)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm font-semibold truncate">{reply.title}</span>
                                      <span className="text-[11px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">/{reply.shortcut}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{reply.content}</p>
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-3 text-sm text-muted-foreground">
                                  Nenhuma mensagem encontrada para `{messageText}`
                                </div>
                              )}
                            </div>
                          )}
                          <Input
                            placeholder="Digite uma mensagem"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-11"
                          />
                        </div>
                        <Button
                          onClick={() => setShowAudioRecorder(true)}
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 p-0 rounded-full flex-shrink-0 text-[#54656f] hover:bg-[#d1d7db]"
                        >
                          <Mic className="w-5 h-5" />
                        </Button>
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
                    )}
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
              labels={selectedChatData.labels}
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

        <Dialog open={showQuickReplyModal} onOpenChange={(open) => {
          setShowQuickReplyModal(open);
          if (!open) resetQuickReplyForm();
        }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Mensagens pré-prontas
              </DialogTitle>
              <DialogDescription>
                Cadastre mensagens pessoais e use no chat digitando `/` no campo de mensagem.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Suas mensagens</Label>
                  <Button variant="outline" size="sm" onClick={resetQuickReplyForm}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nova
                  </Button>
                </div>
                <div className="border rounded-lg max-h-80 overflow-y-auto">
                  {quickReplies.length > 0 ? (
                    quickReplies.map(reply => (
                      <div key={reply.id} className="p-3 border-b last:border-b-0 hover:bg-muted/40">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{reply.title}</p>
                            <p className="text-[11px] text-primary font-mono">/{reply.shortcut}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditQuickReply(reply)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteQuickReply(reply)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{reply.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Nenhuma mensagem cadastrada ainda.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input
                    value={quickReplyForm.title}
                    onChange={(e) => setQuickReplyForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Saudação inicial"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Atalho</Label>
                  <Input
                    value={quickReplyForm.shortcut}
                    onChange={(e) => setQuickReplyForm(prev => ({ ...prev, shortcut: e.target.value }))}
                    placeholder="Ex: inicio"
                  />
                  <p className="text-[11px] text-muted-foreground">Use no chat como `/inicio`.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={quickReplyForm.content}
                    onChange={(e) => setQuickReplyForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Olá, me chamo [nome] e vou dar continuidade ao seu atendimento."
                    className="min-h-32"
                  />
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  Variáveis: <span className="font-mono text-foreground">[nome]</span>, <span className="font-mono text-foreground">[cliente]</span>, <span className="font-mono text-foreground">[telefone]</span>, <span className="font-mono text-foreground">[area]</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuickReplyModal(false)}>
                Fechar
              </Button>
              <Button
                onClick={handleSaveQuickReply}
                disabled={createQuickReplyMutation.isPending || updateQuickReplyMutation.isPending}
              >
                {(createQuickReplyMutation.isPending || updateQuickReplyMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingQuickReply ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
          open={!!cdClienteMK && showMkPanel}
          onClose={() => setShowMkPanel(false)}
          cliente={clienteMK}
          cdCliente={cdClienteMK}
          conversationId={selectedChat}
        />

        {/* Lightbox de imagem */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setLightboxImage(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImage(null);
              }}
            >
              <X className="w-5 h-5" />
            </Button>
            <img
              src={lightboxImage}
              alt="Visualização ampliada"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Atendimentos;