import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Clock } from 'lucide-react';
import { AtualizacaoSocialCard } from './AtualizacaoSocialCard';
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

      {/* Lista com interações sociais */}
      <div className="space-y-4">
        {filtered.map(a => (
          <AtualizacaoSocialCard key={a.id} atualizacao={a} />
        ))}
      </div>
    </div>
  );
}
