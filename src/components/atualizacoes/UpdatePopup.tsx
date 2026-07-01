import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAtualizacoesPublicadas } from '@/hooks/useAtualizacoes';
import { useLikes, useToggleLike, useComentarios, useCreateComentario, useVistas, useMarcarVisto } from '@/hooks/useAtualizacoesSociais';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { typeIcon, typeLabel } from './helpers';
import type { Atualizacao } from '@/hooks/useAtualizacoes';

export function UpdatePopup() {
  const { user } = useAuth();
  const { data: atualizacoes = [] } = useAtualizacoesPublicadas();
  const { data: likes = [] } = useLikes();
  const { data: comentarios = [] } = useComentarios();
  const { data: vistas = [] } = useVistas();
  const toggleLike = useToggleLike();
  const createComentario = useCreateComentario();
  const marcarVisto = useMarcarVisto();

  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [showComentarios, setShowComentarios] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [manualAtualizacao, setManualAtualizacao] = useState<Atualizacao | null>(null);
  const [autoOpenEnabled, setAutoOpenEnabled] = useState(true);
  // Snapshot do array no momento da abertura — evita shrink durante navegação
  const [sessionAtualizacoes, setSessionAtualizacoes] = useState<Atualizacao[]>([]);

  const effectiveUserId = user?.id || '';

  // Filtra atualizações não vistas pelo usuário efetivo (real ou teste)
  // Se a atualização tiver target_user_id, só mostra para aquele usuário
  const naoVistas = useMemo(() => {
    if (!effectiveUserId) return [];
    return atualizacoes.filter(a => {
      // Se tem target_user_id, só esse usuário vê
      if (a.target_user_id && a.target_user_id !== effectiveUserId) return false;
      const vista = vistas.find(v => v.atualizacao_id === a.id && v.user_id === effectiveUserId);
      return !vista;
    });
  }, [atualizacoes, vistas, effectiveUserId]);

  // Atualizações a serem exibidas no popup
  const displayAtualizacoes = useMemo(() => {
    if (manualAtualizacao) return [manualAtualizacao];
    return naoVistas;
  }, [manualAtualizacao, naoVistas]);

  // Abre popup automaticamente quando há atualizações não vistas (apenas se autoOpenEnabled)
  useEffect(() => {
    if (autoOpenEnabled && displayAtualizacoes.length > 0 && !open) {
      setSessionAtualizacoes(displayAtualizacoes);
      setCurrentIndex(0);
      setOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenEnabled, displayAtualizacoes.length, open]);

  // Escuta evento para abrir popup manualmente a partir do sino de notificações
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { atualizacao: Atualizacao } | undefined;
      if (detail?.atualizacao) {
        setManualAtualizacao(detail.atualizacao);
        setSessionAtualizacoes([detail.atualizacao]);
        setAutoOpenEnabled(false); // evita reabertura automática ao fechar
        setCurrentIndex(0);
        setOpen(true);
      }
    };
    window.addEventListener('open-update-popup', handler);
    return () => window.removeEventListener('open-update-popup', handler);
  }, []);

  // Usa sessionAtualizacoes se já populado, senão cai no displayAtualizacoes (evita current undefined na primeira render)
  const activeList = sessionAtualizacoes.length > 0 ? sessionAtualizacoes : displayAtualizacoes;
  const current = activeList[currentIndex];

  const currentLikes = useMemo(() =>
    likes.filter(l => l.atualizacao_id === current?.id).length,
  [likes, current?.id]);

  const userLiked = useMemo(() =>
    likes.some(l => l.atualizacao_id === current?.id && l.user_id === effectiveUserId),
  [likes, current?.id, effectiveUserId]);

  const currentComentarios = useMemo(() =>
    comentarios.filter(c => c.atualizacao_id === current?.id),
  [comentarios, current?.id]);

  const realUserId = user?.id || '';

  const handleLike = async () => {
    if (!current || !realUserId || processingIds.has(current.id)) return;
    console.log('[handleLike] atualizacao_id:', current.id, 'user_id:', realUserId, 'token?:', !!localStorage.getItem('sb-erydxufihxdyhzklpjza-auth-token'));
    setProcessingIds(s => new Set(s).add(current.id));
    try {
      await toggleLike.mutateAsync({ atualizacao_id: current.id, user_id: realUserId });
    } catch (err: any) {
      console.error('Erro ao curtir:', err);
    } finally {
      setProcessingIds(s => { const n = new Set(s); n.delete(current.id); return n; });
    }
  };

  const handleComentar = async () => {
    if (!current || !realUserId || !comentarioTexto.trim()) return;
    try {
      await createComentario.mutateAsync({
        atualizacao_id: current.id,
        user_id: realUserId,
        texto: comentarioTexto.trim(),
      });
      setComentarioTexto('');
    } catch (err: any) {
      console.error('Erro ao comentar:', err);
    }
  };

  const markAllSessionSeen = async (list: Atualizacao[]) => {
    if (!realUserId || list.length === 0) return;
    for (const at of list) {
      try {
        await marcarVisto.mutateAsync({ atualizacao_id: at.id, user_id: realUserId });
      } catch (err: any) {
        console.error('Erro ao marcar visto:', err);
      }
    }
    // Sincroniza o sino (UpdateNotificationBell usa localStorage)
    const latest = list.reduce((prev, cur) => {
      const prevTs = prev.published_at || prev.created_at;
      const curTs = cur.published_at || cur.created_at;
      return new Date(curTs) > new Date(prevTs) ? cur : prev;
    });
    const latestTs = latest.published_at || latest.created_at;
    try { localStorage.setItem('updates_last_seen_at', latestTs); } catch { /* ignore */ }
  };

  const handleNext = async () => {
    if (!current || !realUserId) return;

    if (currentIndex < activeList.length - 1) {
      // Avança para a próxima sem marcar visto ainda
      setCurrentIndex(i => i + 1);
      setShowComentarios(false);
      setComentarioTexto('');
    } else {
      // Última atualização — marca todas como vistas e fecha
      await markAllSessionSeen(activeList);
      setOpen(false);
      setAutoOpenEnabled(false);
      setCurrentIndex(0);
      setShowComentarios(false);
      setManualAtualizacao(null);
    }
  };

  const handleClose = async () => {
    if (!realUserId) return;
    // Marca todas as atualizações da sessão como vistas ao fechar
    await markAllSessionSeen(activeList);
    setOpen(false);
    setAutoOpenEnabled(false);
    setManualAtualizacao(null);
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-5 pb-3">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm z-10 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-white rounded-full shadow-sm">{typeIcon(current.tipo)}</div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {typeLabel(current.tipo)}
            </span>
            {current.versao && (
              <span className="text-xs font-mono bg-white/70 px-2 py-0.5 rounded-full">
                v{current.versao}
              </span>
            )}
          </div>
          <DialogHeader className="p-0">
            <DialogTitle className="text-lg font-bold leading-snug">
              {current.titulo}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {current.descricao || 'Nova atualização do sistema!'}
          </p>
        </div>

        {/* Ações sociais */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={processingIds.has(current.id)}
              className={cn(
                'flex items-center gap-1.5 transition-all duration-200',
                userLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
              )}
            >
              <Heart className={cn('h-6 w-6', userLiked && 'fill-current')} />
              <span className="text-sm font-medium">{currentLikes || 'Curtir'}</span>
            </button>
            <button
              onClick={() => setShowComentarios(s => !s)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
              <span className="text-sm font-medium">
                {currentComentarios.length > 0 ? `${currentComentarios.length}` : 'Comentar'}
              </span>
            </button>
          </div>
        </div>

        {/* Comentários */}
        {showComentarios && (
          <div className="px-5 py-3 border-b border-border max-h-48 overflow-y-auto space-y-3">
            {currentComentarios.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentário ainda. Seja o primeiro!</p>
            ) : (
              currentComentarios.map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(c.user_name || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold">{c.user_name || 'Usuário'}</p>
                    <p className="text-sm text-foreground">{c.texto}</p>
                  </div>
                </div>
              ))
            )}
            {/* Input de comentário */}
            <div className="flex gap-2 pt-2">
              <Input
                value={comentarioTexto}
                onChange={e => setComentarioTexto(e.target.value)}
                placeholder="Escreva um comentário..."
                className="h-9 text-sm"
                onKeyDown={e => { if (e.key === 'Enter') handleComentar(); }}
              />
              <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleComentar} disabled={createComentario.isPending || !comentarioTexto.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Footer / Navegação */}
        <div className="px-5 py-4 flex items-center justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {activeList.length > 1 ? `${currentIndex + 1} de ${activeList.length} atualizações` : ''}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Fechar
            </Button>
            <Button size="sm" onClick={handleNext} className="flex items-center gap-1">
              {currentIndex < activeList.length - 1 ? 'Próxima' : 'Concluir'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
