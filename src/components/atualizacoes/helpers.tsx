import { Sparkles, Wrench, Bug, Shield, Lightbulb, MessageSquare, HelpCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Atualizacao } from '@/hooks/useAtualizacoes';
import type { Feedback } from '@/hooks/useFeedbacks';

export const isAdmin = (role?: string) => role === 'master' || role === 'admin';

export function typeIcon(tipo: Atualizacao['tipo'], className?: string) {
  const c = cn('h-4 w-4', className);
  switch (tipo) {
    case 'novidade': return <Sparkles className={c} />;
    case 'melhoria': return <Wrench className={c} />;
    case 'correcao': return <Bug className={c} />;
    case 'manutencao': return <Shield className={c} />;
  }
}

export function feedbackTypeIcon(tipo: Feedback['tipo'], className?: string) {
  const c = cn('h-4 w-4', className);
  switch (tipo) {
    case 'bug': return <Bug className={c} />;
    case 'melhoria': return <Lightbulb className={c} />;
    case 'sugestao': return <MessageSquare className={c} />;
    case 'outro': return <HelpCircle className={c} />;
  }
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    em_desenvolvimento: { label: 'Em Desenv.', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    concluido: { label: 'Concluído', cls: 'bg-green-100 text-green-800 border-green-200' },
    cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-800 border-gray-200' },
    novo: { label: 'Novo', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    em_analise: { label: 'Em Análise', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    resolvido: { label: 'Resolvido', cls: 'bg-green-100 text-green-800 border-green-200' },
    rejeitado: { label: 'Rejeitado', cls: 'bg-red-100 text-red-800 border-red-200' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-800' };
  return <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wider', s.cls)}>{s.label}</Badge>;
}

export function timeAgo(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ontem';
  return `há ${diffD} dias`;
}
