import { useState, useMemo } from 'react';
import { format, subDays, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Phone,
  PhoneCall,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  FileText,
  Mic,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceCalls, useVoiceCallDetail, calcDurationSeconds, formatDuration } from '@/hooks/useVapiCalls';
import { VoiceCall } from '@/lib/vapi-api';

// ─── Mapas de labels / badges ─────────────────────────────────────────────────

const END_REASON_LABEL: Record<string, string> = {
  'customer-ended-call': 'Cliente encerrou',
  'assistant-ended-call': 'Atendimento concluído',
  'assistant-forwarded-call': 'Transferido',
  'silence-timed-out': 'Silêncio excessivo',
  'customer-did-not-answer': 'Sem resposta',
  'customer-busy': 'Linha ocupada',
  'voicemail': 'Caixa postal',
  'voicemail-detection-failure': 'Caixa postal',
  'max-duration-exceeded': 'Duração máxima',
  'exceeded-max-duration': 'Duração máxima',
  'pipeline-error-openai-voice-failed': 'Erro técnico',
  'assistant-error': 'Erro no atendimento',
  'transfer-failed': 'Falha na transferência',
  'phone-call-provider-closed-websocket-unexpectedly': 'Conexão interrompida',
};

function endReasonLabel(reason?: string): string {
  if (!reason) return 'Encerrada';
  return END_REASON_LABEL[reason] ?? reason.replace(/-/g, ' ');
}

function endReasonBadgeClass(reason?: string): string {
  if (!reason) return 'bg-muted/10 text-muted-foreground border-muted/20';
  if (['customer-ended-call', 'assistant-ended-call'].includes(reason))
    return 'bg-success/10 text-success border-success/20';
  if (reason === 'assistant-forwarded-call' || reason === 'transfer-failed')
    return 'bg-primary/10 text-primary border-primary/20';
  if (['silence-timed-out', 'max-duration-exceeded', 'exceeded-max-duration'].includes(reason))
    return 'bg-warning/10 text-warning border-warning/20';
  if (['customer-did-not-answer', 'customer-busy', 'voicemail', 'voicemail-detection-failure'].includes(reason))
    return 'bg-destructive/10 text-destructive border-destructive/20';
  if (reason.includes('error') || reason.includes('failed'))
    return 'bg-destructive/10 text-destructive border-destructive/20';
  return 'bg-muted/10 text-muted-foreground border-muted/20';
}

function endReasonIcon(reason?: string) {
  if (!reason) return <Phone className="w-3 h-3" />;
  if (['customer-ended-call', 'assistant-ended-call'].includes(reason))
    return <CheckCircle className="w-3 h-3" />;
  if (reason === 'assistant-forwarded-call')
    return <PhoneCall className="w-3 h-3" />;
  if (['customer-did-not-answer', 'customer-busy', 'voicemail', 'voicemail-detection-failure'].includes(reason))
    return <AlertCircle className="w-3 h-3" />;
  if (reason.includes('error') || reason.includes('failed'))
    return <AlertTriangle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

function formatPhone(number?: string): string {
  if (!number) return 'Desconhecido';
  return number;
}

function formatDatetime(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

// ─── Tipos de período ─────────────────────────────────────────────────────────

type Period = 'today' | '7d' | '30d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  all: 'Todos',
};

// ─── Modal de detalhes ────────────────────────────────────────────────────────

interface CallDetailModalProps {
  callId: string | null;
  onClose: () => void;
}

const CallDetailModal = ({ callId, onClose }: CallDetailModalProps) => {
  const { data: detail, isLoading, isError } = useVoiceCallDetail(callId);

  return (
    <Dialog open={!!callId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary" />
            Detalhes da Ligação
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="text-center py-8 text-destructive">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Não foi possível carregar os detalhes desta ligação.</p>
          </div>
        )}

        {detail && (
          <div className="space-y-5">
            {/* Info básica */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Número</p>
                <p className="font-medium">{formatPhone(detail.customer?.number)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Data</p>
                <p className="font-medium">{formatDatetime(detail.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Duração</p>
                <p className="font-medium">{formatDuration(calcDurationSeconds(detail))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Status</p>
                <Badge className={cn('text-xs', endReasonBadgeClass(detail.endedReason))}>
                  <span className="flex items-center gap-1">
                    {endReasonIcon(detail.endedReason)}
                    {endReasonLabel(detail.endedReason)}
                  </span>
                </Badge>
              </div>
            </div>

            {/* Resumo IA */}
            {(detail.summary || detail.analysis?.summary) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Resumo do Atendimento
                </h4>
                <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground leading-relaxed">
                  {detail.summary ?? detail.analysis?.summary}
                </div>
              </div>
            )}

            {/* Gravação */}
            {detail.recordingUrl && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Mic className="w-4 h-4 text-primary" />
                  Gravação
                </h4>
                <audio
                  controls
                  src={detail.recordingUrl}
                  className="w-full h-10"
                  preload="metadata"
                />
              </div>
            )}

            {/* Transcrição — mensagens estruturadas */}
            {detail.messages && detail.messages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Transcrição
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {detail.messages
                    .filter(m => m.role === 'assistant' || m.role === 'user')
                    .map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex gap-2 text-sm',
                          m.role === 'assistant' ? 'justify-start' : 'justify-end',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-3 py-2',
                            m.role === 'assistant'
                              ? 'bg-muted text-foreground'
                              : 'bg-primary text-primary-foreground',
                          )}
                        >
                          {m.message}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Transcrição — texto bruto (fallback) */}
            {!detail.messages?.length && detail.transcript && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Transcrição
                </h4>
                <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {detail.transcript}
                </div>
              </div>
            )}

            {/* Sem dados extras */}
            {!detail.summary && !detail.analysis?.summary && !detail.recordingUrl && !detail.transcript && !detail.messages?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Transcrição e gravação não disponíveis para esta ligação.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const LigacoesIA = () => {
  const [period, setPeriod] = useState<Period>('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Parâmetros de período para a API
  const apiParams = useMemo(() => {
    if (period === 'all') return {};
    const now = new Date();
    const daysBefore = period === 'today' ? 0 : period === '7d' ? 7 : 30;
    const from = period === 'today' ? startOfDay(now) : subDays(now, daysBefore);
    return { createdAtGt: from.toISOString() };
  }, [period]);

  const { data: calls, stats, isLoading, isError, refetch, isFetching } = useVoiceCalls(apiParams);

  // Filtro por busca de número
  const filteredCalls = useMemo(() => {
    if (!calls) return [];
    if (!searchTerm.trim()) return calls;
    const term = searchTerm.toLowerCase().replace(/\D/g, '');
    return calls.filter(c => {
      const num = (c.customer?.number ?? '').replace(/\D/g, '');
      return num.includes(term);
    });
  }, [calls, searchTerm]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ligações com IA</h1>
            <p className="text-muted-foreground">
              Histórico de atendimentos realizados pelo assistente de voz
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ligações Hoje</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '—' : (stats?.totalHoje ?? 0)}
                  </p>
                </div>
                <Phone className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Resolução</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '—' : `${stats?.taxaResolucao ?? 0}%`}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duração Média</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '—' : (stats?.duracaoMedia ?? '—')}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Período */}
              <div className="flex gap-1 flex-wrap">
                {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriod(p)}
                  >
                    {PERIOD_LABELS[p]}
                  </Button>
                ))}
              </div>
              {/* Busca */}
              <div className="flex-1">
                <Input
                  placeholder="Buscar por número do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-primary" />
              Ligações
              {!isLoading && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {filteredCalls.length} registro{filteredCalls.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-primary mr-3" />
                <span className="text-muted-foreground">Carregando ligações...</span>
              </div>
            )}

            {isError && (
              <div className="text-center py-10 space-y-3">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-muted-foreground text-sm">
                  Não foi possível carregar as ligações.
                  <br />
                  Verifique se a chave da API de voz está configurada em{' '}
                  <strong>Configurações Avançadas</strong>.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {!isLoading && !isError && filteredCalls.length === 0 && (
              <div className="text-center py-10">
                <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {calls?.length === 0
                    ? 'Nenhuma ligação encontrada no período selecionado.'
                    : 'Nenhum resultado para este número.'}
                </p>
              </div>
            )}

            {!isLoading && !isError && filteredCalls.length > 0 && (
              <div className="space-y-2">
                {filteredCalls.map((call: VoiceCall) => {
                  const duration = calcDurationSeconds(call);
                  return (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCallId(call.id)}
                    >
                      {/* Número + data */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {formatPhone(call.customer?.number)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDatetime(call.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Duração + badge */}
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium font-mono">
                            {duration > 0 ? formatDuration(duration) : '—'}
                          </p>
                        </div>
                        <Badge className={cn('text-xs', endReasonBadgeClass(call.endedReason))}>
                          <span className="flex items-center gap-1">
                            {endReasonIcon(call.endedReason)}
                            <span className="hidden sm:inline">{endReasonLabel(call.endedReason)}</span>
                          </span>
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal detalhes */}
      <CallDetailModal
        callId={selectedCallId}
        onClose={() => setSelectedCallId(null)}
      />
    </Layout>
  );
};

export default LigacoesIA;
