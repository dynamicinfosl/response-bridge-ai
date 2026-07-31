import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Loader2,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AchadoAuditoria,
  GRAVIDADE_LABEL,
  RelatorioAuditoria,
  TIPO_ACHADO_LABEL,
  TurnoConversa,
  useAuditoriaConversa,
  useAuditoriaDetalhe,
  useAuditoriaLista,
} from '@/hooks/useAuditoriaIA';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

function fmtShort(iso?: string) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd/MM HH:mm', { locale: ptBR });
  } catch {
    return iso;
  }
}

function fmtHora(iso?: string) {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'HH:mm:ss', { locale: ptBR });
  } catch {
    return '';
  }
}

function gravidadeClass(g: string) {
  if (g === 'alta') return 'bg-destructive/10 text-destructive border-destructive/20';
  if (g === 'media') return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400';
  return 'bg-muted text-muted-foreground border-border';
}

function norm(s: string) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function turnoDestacaAchado(turno: TurnoConversa, trecho?: string) {
  if (!trecho || turno.quem === 'cliente') return false;
  const a = norm(turno.conteudo);
  const b = norm(trecho).slice(0, 80);
  if (!b || b.length < 20) return false;
  return a.includes(b.slice(0, 40)) || b.includes(a.slice(0, 40));
}

function DiagnosticoMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n(?=##\s)/);

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        const lines = block.trim().split('\n');
        const first = lines[0] || '';
        const isHeading = first.startsWith('## ');
        const title = isHeading ? first.replace(/^##\s+/, '') : null;
        const body = (isHeading ? lines.slice(1) : lines).join('\n').trim();

        return (
          <div key={idx} className="space-y-2">
            {title && (
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {title}
              </h3>
            )}
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {body}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConversaModal({
  open,
  onOpenChange,
  idConversa,
  achado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  idConversa: string | null;
  achado: AchadoAuditoria | null;
}) {
  const { data, isLoading, error } = useAuditoriaConversa(open ? idConversa : null);
  const turnos = data?.turnos || [];
  const chatwootUrl = import.meta.env.VITE_CHATWOOT_API_URL
    ? `${import.meta.env.VITE_CHATWOOT_API_URL}/app/accounts/1/conversations/${idConversa}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Conversa #{idConversa}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              {data?.telefone && (
                <p className="text-xs text-muted-foreground">{data.telefone}</p>
              )}
              {achado && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="outline" className={cn('text-[10px]', gravidadeClass(achado.gravidade))}>
                    {GRAVIDADE_LABEL[achado.gravidade] || achado.gravidade}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {TIPO_ACHADO_LABEL[achado.tipo_achado] || achado.tipo_achado}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(achado.ocorrido_em)}
                  </span>
                </div>
              )}
              {achado?.detalhe && (
                <p className="text-xs text-foreground bg-muted/40 rounded-md p-2 leading-relaxed">
                  {achado.detalhe}
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando conversa...
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">
              Não foi possível carregar a conversa. {(error as Error).message}
            </p>
          ) : turnos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum turno encontrado no histórico da IA para esta conversa.
            </p>
          ) : (
            <ScrollArea className="h-[min(55vh,520px)] pr-3">
              <div className="space-y-3 pb-2">
                {turnos.map((t, idx) => {
                  const destaque = turnoDestacaAchado(t, achado?.trecho);
                  const isCliente = t.quem === 'cliente';
                  const isTools = t.quem === 'tools';

                  return (
                    <div
                      key={`${t.created_at}-${idx}`}
                      className={cn(
                        'flex',
                        isCliente ? 'justify-start' : 'justify-end'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed border',
                          isCliente && 'bg-muted/50 border-border text-foreground',
                          t.quem === 'bot' && !destaque && 'bg-primary/10 border-primary/20 text-foreground',
                          destaque && 'bg-destructive/10 border-destructive/40 ring-1 ring-destructive/30',
                          isTools && 'bg-amber-500/5 border-amber-500/20 text-muted-foreground font-mono text-xs max-w-full'
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {isCliente && <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</span>}
                          {t.quem === 'bot' && (
                            <>
                              <Bot className="h-3 w-3 text-primary" />
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Marcos (IA)</span>
                            </>
                          )}
                          {isTools && (
                            <>
                              <Wrench className="h-3 w-3 text-amber-600" />
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                Tools executadas
                              </span>
                            </>
                          )}
                          {destaque && (
                            <Badge variant="outline" className="text-[9px] h-4 ml-1 border-destructive/30 text-destructive">
                              achado
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto pl-3">
                            {fmtHora(t.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{t.conteudo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-muted-foreground">
            Histórico da IA · {turnos.length} turnos
            {data?.totais?.turnos != null ? '' : ''}
          </p>
          <div className="flex gap-2">
            {chatwootUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={chatwootUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Abrir no Chatwoot
                </a>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AchadosTable({
  achados,
  onOpenConversa,
}: {
  achados: AchadoAuditoria[];
  onOpenConversa: (achado: AchadoAuditoria) => void;
}) {
  if (!achados.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum achado nesta janela.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Quando</TableHead>
            <TableHead className="w-[100px]">Conversa</TableHead>
            <TableHead className="w-[150px]">Tipo</TableHead>
            <TableHead className="w-[80px]">Gravidade</TableHead>
            <TableHead>Detalhe / trecho</TableHead>
            <TableHead className="w-[90px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {achados.map((a) => (
            <TableRow
              key={a.id}
              className="cursor-pointer hover:bg-muted/40"
              onClick={() => a.id_conversa && onOpenConversa(a)}
            >
              <TableCell className="text-xs text-muted-foreground align-top">
                {fmtShort(a.ocorrido_em)}
              </TableCell>
              <TableCell className="align-top">
                <button
                  type="button"
                  className="font-mono text-xs text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenConversa(a);
                  }}
                >
                  #{a.id_conversa}
                </button>
              </TableCell>
              <TableCell className="align-top">
                <span className="text-xs font-medium">
                  {TIPO_ACHADO_LABEL[a.tipo_achado] || a.tipo_achado}
                </span>
              </TableCell>
              <TableCell className="align-top">
                <Badge variant="outline" className={cn('text-[10px]', gravidadeClass(a.gravidade))}>
                  {GRAVIDADE_LABEL[a.gravidade] || a.gravidade}
                </Badge>
              </TableCell>
              <TableCell className="align-top space-y-1">
                <p className="text-xs text-foreground">{a.detalhe}</p>
                {a.trecho && (
                  <p className="text-xs text-muted-foreground line-clamp-3 border-l-2 border-border pl-2">
                    {a.trecho}
                  </p>
                )}
              </TableCell>
              <TableCell className="align-top">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenConversa(a);
                  }}
                >
                  Ver
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RelatorioCard({
  relatorio,
  selected,
  onSelect,
}: {
  relatorio: RelatorioAuditoria;
  selected: boolean;
  onSelect: () => void;
}) {
  const tipos = Object.entries(relatorio.achados_por_tipo || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted/40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            {fmtDate(relatorio.gerado_em)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Relatório #{relatorio.id}
          </p>
        </div>
        <ChevronRight
          className={cn(
            'h-4 w-4 mt-0.5 shrink-0',
            selected ? 'text-primary' : 'text-muted-foreground'
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {relatorio.total_conversas} conversas
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {relatorio.total_financeiras} financeiras
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px]',
            relatorio.total_achados > 0
              ? 'bg-destructive/10 text-destructive border-destructive/20'
              : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
          )}
        >
          {relatorio.total_achados} achados
        </Badge>
      </div>

      {tipos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tipos.map(([tipo, qtd]) => (
            <span
              key={tipo}
              className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              {TIPO_ACHADO_LABEL[tipo] || tipo}: {qtd}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

const AuditoriaIA = () => {
  const { data: lista, isLoading, isFetching, refetch, error } = useAuditoriaLista();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [conversaAberta, setConversaAberta] = useState<{
    id: string;
    achado: AchadoAuditoria;
  } | null>(null);

  const relatorios = lista?.relatorios || [];
  const activeId = selectedId ?? relatorios[0]?.id ?? null;

  const {
    data: detalhe,
    isLoading: loadingDetalhe,
    isFetching: fetchingDetalhe,
  } = useAuditoriaDetalhe(activeId);

  const relatorioAtivo = detalhe?.relatorios?.[0] || relatorios.find((r) => r.id === activeId) || null;
  const achadosAtivos = detalhe?.achados || [];

  const abrirConversa = (achado: AchadoAuditoria) => {
    if (!achado.id_conversa) return;
    setConversaAberta({ id: String(achado.id_conversa), achado });
  };

  const resumoGeral = useMemo(() => {
    if (!relatorios.length) return null;
    const ultimo = relatorios[0];
    const mediaAchados =
      relatorios.reduce((acc, r) => acc + (r.total_achados || 0), 0) / relatorios.length;
    return { ultimo, mediaAchados, totalRelatorios: relatorios.length };
  }, [relatorios]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Auditoria da IA</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Relatórios diários de qualidade do Marcos — cobrança indevida, repetições, promessas e falhas de ferramenta.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 text-sm text-destructive">
              Não foi possível carregar os relatórios. {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {resumoGeral && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Último relatório</p>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold mt-2">
                  {fmtShort(resumoGeral.ultimo.gerado_em)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Conversas (última janela)</p>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold mt-2">
                  {resumoGeral.ultimo.total_conversas}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({resumoGeral.ultimo.total_financeiras} financeiras)
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Achados (última janela)</p>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold mt-2">
                  {resumoGeral.ultimo.total_achados}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Relatórios guardados</p>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold mt-2">
                  {resumoGeral.totalRelatorios}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    média {resumoGeral.mediaAchados.toFixed(0)} achados
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de auditorias</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Carregando...
                </div>
              ) : relatorios.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Ainda não há relatórios gravados.
                </p>
              ) : (
                <ScrollArea className="h-[calc(100vh-22rem)] pr-3">
                  <div className="space-y-2">
                    {relatorios.map((r) => (
                      <RelatorioCard
                        key={r.id}
                        relatorio={r}
                        selected={r.id === activeId}
                        onSelect={() => setSelectedId(r.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-8 space-y-4">
            {!relatorioAtivo ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground text-sm">
                  Selecione um relatório à esquerda para ver o diagnóstico.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          Relatório #{relatorioAtivo.id}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Gerado em {fmtDate(relatorioAtivo.gerado_em)}
                          {(loadingDetalhe || fetchingDetalhe) && (
                            <span className="ml-2 inline-flex items-center">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              atualizando
                            </span>
                          )}
                        </p>
                      </div>
                      {relatorioAtivo.total_achados === 0 ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sem achados
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                          <MessageSquareWarning className="h-3 w-3 mr-1" />
                          {relatorioAtivo.total_achados} achados
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-[11px] text-muted-foreground">Conversas</p>
                        <p className="text-xl font-semibold">{relatorioAtivo.total_conversas}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-[11px] text-muted-foreground">Financeiras</p>
                        <p className="text-xl font-semibold">{relatorioAtivo.total_financeiras}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-[11px] text-muted-foreground">Achados</p>
                        <p className="text-xl font-semibold">{relatorioAtivo.total_achados}</p>
                      </div>
                    </div>

                    {Object.keys(relatorioAtivo.achados_por_tipo || {}).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(relatorioAtivo.achados_por_tipo)
                          .sort((a, b) => b[1] - a[1])
                          .map(([tipo, qtd]) => (
                            <Badge key={tipo} variant="secondary" className="text-xs">
                              {TIPO_ACHADO_LABEL[tipo] || tipo}: {qtd}
                            </Badge>
                          ))}
                      </div>
                    )}

                    {relatorioAtivo.resumo && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 font-mono leading-relaxed">
                        {relatorioAtivo.resumo}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Diagnóstico do juiz IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingDetalhe && !relatorioAtivo.diagnostico_ia ? (
                      <div className="flex items-center py-8 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Carregando diagnóstico...
                      </div>
                    ) : relatorioAtivo.diagnostico_ia ? (
                      <DiagnosticoMarkdown text={relatorioAtivo.diagnostico_ia} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {relatorioAtivo.diagnostico_preview ||
                          'Sem diagnóstico qualitativo nesta execução.'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Achados da janela
                      <span className="text-muted-foreground font-normal ml-2 text-sm">
                        ({achadosAtivos.length})
                      </span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em uma linha ou no botão Ver para abrir a conversa completa.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loadingDetalhe ? (
                      <div className="flex items-center py-8 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Carregando achados...
                      </div>
                    ) : (
                      <AchadosTable achados={achadosAtivos} onOpenConversa={abrirConversa} />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        <Separator />
        <p className="text-xs text-muted-foreground">
          Fonte: tabelas <code className="bg-muted px-1 rounded">auditoria_ia_relatorios</code> e{' '}
          <code className="bg-muted px-1 rounded">auditoria_ia_financeiro</code> · workflow diário às 07h ·
          acesso restrito a master/admin.
        </p>
      </div>

      <ConversaModal
        open={!!conversaAberta}
        onOpenChange={(v) => {
          if (!v) setConversaAberta(null);
        }}
        idConversa={conversaAberta?.id || null}
        achado={conversaAberta?.achado || null}
      />
    </Layout>
  );
};

export default AuditoriaIA;
