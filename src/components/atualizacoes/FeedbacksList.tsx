import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, MessageSquare, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { feedbackTypeIcon, statusBadge, timeAgo, isAdmin } from './helpers';
import { ResponderFeedbackDialog } from './ResponderFeedbackDialog';
import { useUpdateFeedback } from '@/hooks/useFeedbacks';
import type { Feedback } from '@/hooks/useFeedbacks';
import type { Atualizacao } from '@/hooks/useAtualizacoes';

interface Props {
  feedbacks: Feedback[];
  atualizacoes: Atualizacao[];
  isLoading: boolean;
  userRole?: string;
}

export function FeedbacksList({ feedbacks, atualizacoes, isLoading, userRole }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const admin = isAdmin(userRole);
  const updateFeedback = useUpdateFeedback();

  const handleStatusChange = async (id: string, status: Feedback['status']) => {
    setUpdatingId(id);
    try {
      await updateFeedback.mutateAsync({
        id,
        data: {
          status,
          resolvido_em: status === 'resolvido' ? new Date().toISOString() : null,
        },
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return feedbacks
      .filter(f => {
        if (filterStatus !== 'todos' && f.status !== filterStatus) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (f.titulo + ' ' + (f.descricao || '') + ' ' + (f.resposta_admin || '')).toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [feedbacks, filterStatus, search]);

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;
  if (filtered.length === 0) return (
    <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
      <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground">Nenhum feedback encontrado</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar feedbacks..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 h-9 text-xs"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="em_desenvolvimento">Em Desenvolvimento</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map(f => (
          <Card key={f.id} className={cn('shadow-sm border-l-4',
            f.status === 'resolvido' ? 'border-l-green-400' :
            f.status === 'rejeitado' ? 'border-l-red-400' :
            f.status === 'em_analise' ? 'border-l-yellow-400' :
            'border-l-blue-400'
          )}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 bg-muted rounded-lg">{feedbackTypeIcon(f.tipo)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{f.titulo}</h3>
                    {statusBadge(f.status)}
                    <Badge variant="secondary" className="text-[10px] h-5">{timeAgo(f.created_at)}</Badge>
                  </div>
                  {f.descricao && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.descricao}</p>}

                  {/* Resposta do admin */}
                  {f.resposta_admin && (
                    <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Resposta da Equipe</span>
                      </div>
                      <p className="text-sm text-green-800 leading-relaxed">{f.resposta_admin}</p>
                      {f.resolvido_em && (
                        <p className="text-[11px] text-green-600/70 mt-1">
                          Resolvido em {new Date(f.resolvido_em).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {f.atualizacao_id && (
                        <p className="text-[11px] text-green-600/70 mt-0.5">
                          Vinculado a atualização: {atualizacoes.find(a => a.id === f.atualizacao_id)?.titulo || f.atualizacao_id}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Ações admin */}
                  {admin && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {f.status !== 'resolvido' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                          disabled={updatingId === f.id}
                          onClick={() => handleStatusChange(f.id, 'resolvido')}
                        >
                          {updatingId === f.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                          Marcar como Resolvido
                        </Button>
                      )}
                      {f.status !== 'em_desenvolvimento' && f.status !== 'resolvido' && f.status !== 'rejeitado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                          disabled={updatingId === f.id}
                          onClick={() => handleStatusChange(f.id, 'em_desenvolvimento')}
                        >
                          {updatingId === f.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Loader2 className="h-3 w-3 mr-1" />}
                          Em Progresso
                        </Button>
                      )}
                      {f.status !== 'em_analise' && f.status !== 'resolvido' && f.status !== 'rejeitado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
                          disabled={updatingId === f.id}
                          onClick={() => handleStatusChange(f.id, 'em_analise')}
                        >
                          {updatingId === f.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                          Em Análise
                        </Button>
                      )}
                      {f.status !== 'rejeitado' && f.status !== 'resolvido' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                          disabled={updatingId === f.id}
                          onClick={() => handleStatusChange(f.id, 'rejeitado')}
                        >
                          {updatingId === f.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                          Rejeitar
                        </Button>
                      )}
                      {f.status !== 'resolvido' && f.status !== 'rejeitado' && (
                        <ResponderFeedbackDialog feedback={f} atualizacoes={atualizacoes} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
