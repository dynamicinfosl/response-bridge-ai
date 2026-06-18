import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLikes, useToggleLike, useComentarios, useCreateComentario, useDeleteComentario } from '@/hooks/useAtualizacoesSociais';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { typeIcon, statusBadge, timeAgo } from './helpers';
import type { Atualizacao } from '@/hooks/useAtualizacoes';

interface Props {
  atualizacao: Atualizacao;
}

export function AtualizacaoSocialCard({ atualizacao }: Props) {
  const { user } = useAuth();
  const { data: likes = [] } = useLikes();
  const { data: comentarios = [] } = useComentarios();
  const toggleLike = useToggleLike();
  const createComentario = useCreateComentario();
  const deleteComentario = useDeleteComentario();

  const [comentarioTexto, setComentarioTexto] = useState('');
  const [showComentarios, setShowComentarios] = useState(false);
  const [processing, setProcessing] = useState(false);

  const countLikes = useMemo(() =>
    likes.filter(l => l.atualizacao_id === atualizacao.id).length,
  [likes, atualizacao.id]);

  const userLiked = useMemo(() =>
    likes.some(l => l.atualizacao_id === atualizacao.id && l.user_id === user?.id),
  [likes, atualizacao.id, user?.id]);

  const atualComentarios = useMemo(() =>
    comentarios.filter(c => c.atualizacao_id === atualizacao.id).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  [comentarios, atualizacao.id]);

  const handleLike = async () => {
    if (!user?.id || processing) return;
    setProcessing(true);
    try {
      await toggleLike.mutateAsync({ atualizacao_id: atualizacao.id, user_id: user.id });
    } finally {
      setProcessing(false);
    }
  };

  const handleComentar = async () => {
    if (!user?.id || !comentarioTexto.trim()) return;
    await createComentario.mutateAsync({
      atualizacao_id: atualizacao.id,
      user_id: user.id,
      texto: comentarioTexto.trim(),
    });
    setComentarioTexto('');
    setShowComentarios(true);
  };

  const handleDeleteComentario = async (id: string) => {
    await deleteComentario.mutateAsync(id);
  };

  return (
    <div className="space-y-3">
      {/* Card principal */}
      <div className={cn('rounded-xl border bg-card shadow-sm overflow-hidden',
        atualizacao.tipo === 'melhoria' ? 'border-l-4 border-l-yellow-400' :
        atualizacao.tipo === 'correcao' ? 'border-l-4 border-l-red-400' :
        atualizacao.tipo === 'novidade' ? 'border-l-4 border-l-green-400' :
        'border-l-4 border-l-gray-400'
      )}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 bg-muted rounded-lg">{typeIcon(atualizacao.tipo)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{atualizacao.titulo}</h3>
                {statusBadge(atualizacao.status)}
                <span className="text-[11px] text-muted-foreground">{timeAgo(atualizacao.published_at || atualizacao.created_at)}</span>
              </div>
              {atualizacao.descricao && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{atualizacao.descricao}</p>
              )}
              {atualizacao.versao && (
                <p className="text-xs text-muted-foreground mt-1">Versão: <span className="font-mono">{atualizacao.versao}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Ações sociais */}
        <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center gap-5">
          <button
            onClick={handleLike}
            disabled={processing}
            className={cn(
              'flex items-center gap-1.5 transition-all duration-200 select-none',
              userLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
            )}
          >
            <Heart className={cn('h-5 w-5', userLiked && 'fill-current')} />
            <span className="text-sm font-medium">{countLikes || 'Curtir'}</span>
          </button>
          <button
            onClick={() => setShowComentarios(s => !s)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors select-none"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              {atualComentarios.length > 0 ? `${atualComentarios.length}` : 'Comentar'}
            </span>
            {showComentarios ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Comentários */}
        {showComentarios && (
          <div className="px-5 py-3 border-t border-border bg-muted/10 space-y-3">
            {atualComentarios.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentário ainda.</p>
            ) : (
              atualComentarios.map(c => (
                <div key={c.id} className="flex gap-2 group">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(c.user_name || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold">{c.user_name || 'Usuário'}</p>
                      <p className="text-sm text-foreground">{c.texto}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      {c.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComentario(c.id)}
                          className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {/* Input */}
            <div className="flex gap-2 pt-1">
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
      </div>
    </div>
  );
}
