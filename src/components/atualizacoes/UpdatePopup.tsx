import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAtualizacoesPublicadas } from '@/hooks/useAtualizacoes';
import { useLikes, useToggleLike, useComentarios, useCreateComentario, useVistas, useMarcarVisto } from '@/hooks/useAtualizacoesSociais';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, X, ChevronRight, Sparkles } from 'lucide-react';
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

  // Filtra atualizações não vistas pelo usuário atual
  const naoVistas = useMemo(() => {
    if (!user?.id) return [];
    return atualizacoes.filter(a => {
      const vista = vistas.find(v => v.atualizacao_id === a.id && v.user_id === user.id);
      return !vista;
    });
  }, [atualizacoes, vistas, user?.id]);

  // Abre popup quando há atualizações não vistas
  useEffect(() => {
    if (naoVistas.length > 0 && !open) {
      setCurrentIndex(0);
      setOpen(true);
    }
  }, [naoVistas.length]);

  const current = naoVistas[currentIndex];

  const currentLikes = useMemo(() =>
    likes.filter(l => l.atualizacao_id === current?.id).length,
  [likes, current?.id]);

  const userLiked = useMemo(() =>
    likes.some(l => l.atualizacao_id === current?.id && l.user_id === user?.id),
  [likes, current?.id, user?.id]);

  const currentComentarios = useMemo(() =>
    comentarios.filter(c => c.atualizacao_id === current?.id),
  [comentarios, current?.id]);

  const handleLike = async () => {
    if (!current || !user?.id || processingIds.has(current.id)) return;
    setProcessingIds(s => new Set(s).add(current.id));
    try {
      await toggleLike.mutateAsync({ atualizacao_id: current.id, user_id: user.id });
    } finally {
      setProcessingIds(s => { const n = new Set(s); n.delete(current.id); return n; });
    }
  };

  const handleComentar = async () => {
    if (!current || !user?.id || !comentarioTexto.trim()) return;
    await createComentario.mutateAsync({
      atualizacao_id: current.id,
      user_id: user.id,
      texto: comentarioTexto.trim(),
    });
    setComentarioTexto('');
  };

  const handleNext = async () => {
    if (!current || !user?.id) return;
    // Marca como vista
    await marcarVisto.mutateAsync({ atualizacao_id: current.id, user_id: user.id });

    if (currentIndex < naoVistas.length - 1) {
      setCurrentIndex(i => i + 1);
      setShowComentarios(false);
      setComentarioTexto('');
    } else {
      setOpen(false);
      setCurrentIndex(0);
      setShowComentarios(false);
    }
  };

  const handleClose = async () => {
    if (!current || !user?.id) return;
    await marcarVisto.mutateAsync({ atualizacao_id: current.id, user_id: user.id });
    setOpen(false);
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-5 pb-3">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/60 hover:bg-white/80 transition-colors"
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
            {currentIndex + 1} de {naoVistas.length} atualizações
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Fechar
            </Button>
            <Button size="sm" onClick={handleNext} className="flex items-center gap-1">
              {currentIndex < naoVistas.length - 1 ? 'Próxima' : 'Concluir'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
