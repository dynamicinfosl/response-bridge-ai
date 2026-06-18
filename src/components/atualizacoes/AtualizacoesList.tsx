import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { typeIcon, statusBadge, timeAgo } from './helpers';
import type { Atualizacao } from '@/hooks/useAtualizacoes';

interface Props {
  atualizacoes: Atualizacao[];
  isLoading: boolean;
}

export function AtualizacoesList({ atualizacoes, isLoading }: Props) {
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  const filtered = useMemo(() => {
    return atualizacoes
      .filter(a => {
        if (filterTipo !== 'todos' && a.tipo !== filterTipo) return false;
        if (filterStatus !== 'todos' && a.status !== filterStatus) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (a.titulo + ' ' + (a.descricao || '')).toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
  }, [atualizacoes, filterTipo, filterStatus, search]);

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;
  if (filtered.length === 0) return (
    <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
      <p className="text-muted-foreground">Nenhuma atualização encontrada</p>
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
              <Input placeholder="Buscar..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-36 h-9 text-xs"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="melhoria">Melhoria</SelectItem>
                  <SelectItem value="correcao">Correção</SelectItem>
                  <SelectItem value="novidade">Novidade</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 h-9 text-xs"><Clock className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_desenvolvimento">Em Desenv.</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map(a => (
          <Card key={a.id} className={cn('shadow-sm border-l-4', {
            'border-l-yellow-400': a.tipo === 'melhoria',
            'border-l-red-400': a.tipo === 'correcao',
            'border-l-green-400': a.tipo === 'novidade',
            'border-l-gray-400': a.tipo === 'manutencao',
          })}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 bg-muted rounded-lg">{typeIcon(a.tipo)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{a.titulo}</h3>
                    {statusBadge(a.status)}
                    <Badge variant="secondary" className="text-[10px] h-5">{timeAgo(a.published_at || a.created_at)}</Badge>
                  </div>
                  {a.descricao && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a.descricao}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {a.versao && <span>Versão: <span className="font-mono text-foreground">{a.versao}</span></span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
