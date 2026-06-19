import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, ArrowRight, CheckCheck, Inbox, Sparkles, Wrench, Bug, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAtualizacoesPublicadas, type Atualizacao } from '@/hooks/useAtualizacoes';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'updates_last_seen_at';

function timeAgo(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin === 1) return 'há 1 minuto';
  if (diffMin < 60) return `há ${diffMin} minutos`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return 'há 1 hora';
  if (diffH < 24) return `há ${diffH} horas`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'há 1 dia';
  return `há ${diffD} dias`;
}

function typeIcon(tipo: Atualizacao['tipo']) {
  switch (tipo) {
    case 'novidade': return <Sparkles className="h-4 w-4 text-yellow-500" />;
    case 'melhoria': return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'correcao': return <Bug className="h-4 w-4 text-red-500" />;
    case 'manutencao': return <Shield className="h-4 w-4 text-gray-500" />;
    default: return <Megaphone className="h-4 w-4 text-primary" />;
  }
}

function typeLabel(tipo: Atualizacao['tipo']) {
  const map: Record<string, string> = { melhoria: 'Melhoria', correcao: 'Correção', novidade: 'Novidade', manutencao: 'Manutenção' };
  return map[tipo] || tipo;
}

export function UpdateNotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rawAtualizacoes = [], isLoading } = useAtualizacoesPublicadas();
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  });

  const userId = user?.id || '';

  // Filtra atualizações: se tem target_user_id, só mostra para esse usuário
  const atualizacoes = useMemo(() => {
    if (!userId) return rawAtualizacoes;
    return rawAtualizacoes.filter(a => {
      if (a.target_user_id && a.target_user_id !== userId) return false;
      return true;
    });
  }, [rawAtualizacoes, userId]);

  // Detectar novas atualizações e tocar som
  useEffect(() => {
    if (atualizacoes.length === 0 || !lastSeenAt) return;
    const newOnes = atualizacoes.filter(a => new Date(a.published_at || a.created_at) > new Date(lastSeenAt));
    if (newOnes.length > 0) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        setTimeout(() => ctx.close(), 500);
      } catch { /* ignore */ }
    }
  }, [atualizacoes, lastSeenAt]);

  const handleMarkAllRead = useCallback(() => {
    const latest = atualizacoes[0];
    if (latest) {
      const ts = latest.published_at || latest.created_at;
      localStorage.setItem(STORAGE_KEY, ts);
      setLastSeenAt(ts);
    }
  }, [atualizacoes]);

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return atualizacoes.length;
    return atualizacoes.filter(a => new Date(a.published_at || a.created_at) > new Date(lastSeenAt)).length;
  }, [atualizacoes, lastSeenAt]);

  const handleNavigate = () => {
    handleMarkAllRead();
    setOpen(false);
    navigate('/atualizacoes');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 px-3 rounded-full text-white hover:bg-white/10 flex-shrink-0 flex items-center gap-2"
          aria-label="Atualizações do sistema"
        >
          <Megaphone className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">Atualizações</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white leading-none ring-2 ring-primary">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-96 p-0 shadow-2xl max-h-[80vh] overflow-hidden bg-white border border-border rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Atualizações do Sistema
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : atualizacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4 gap-2">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma atualização publicada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {atualizacoes.slice(0, 10).map((atual) => {
                const isUnread = !lastSeenAt || new Date(atual.published_at || atual.created_at) > new Date(lastSeenAt);
                return (
                  <div
                    key={atual.id}
                    className={cn(
                      'px-4 py-3 transition-colors cursor-pointer',
                      isUnread ? 'bg-primary/5' : 'hover:bg-muted/50'
                    )}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-update-popup', { detail: { atualizacao: atual } }));
                      setOpen(false);
                    }}
                  >
                    <div className="w-full text-left flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {typeIcon(atual.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-sm truncate', isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                            {atual.titulo}
                          </p>
                          {isUnread && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                            {typeLabel(atual.tipo)}
                          </span>
                          <span className="text-[11px] text-muted-foreground/70">
                            {timeAgo(atual.published_at || atual.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5 bg-muted/30">
          <button
            onClick={handleNavigate}
            className="text-xs text-primary hover:underline w-full text-center flex items-center justify-center gap-1"
          >
            Ver todas as atualizações e feedbacks
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
