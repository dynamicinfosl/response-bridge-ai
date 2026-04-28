import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getGupshupConfig } from '@/lib/gupshup-config';
import {
  listGupshupTemplates,
  normalizeRecipientPhone,
  parseTemplateParams,
  sendGupshupTemplate,
  type GupshupTemplate,
} from '@/lib/gupshup-api';
import { consultaClientes, conexoesPorCliente, faturasPendentes, type MKClienteDoc } from '@/lib/mk-api';
import { Loader2, Megaphone, RefreshCcw, Search, Send, ShieldAlert, Users } from 'lucide-react';

interface CampaignRecipient {
  id: string;
  cdCliente: string;
  nome: string;
  doc: string;
  phone: string;
  bairro: string;
  cidade: string;
  uf: string;
  hasOverdueInvoice: boolean;
  hasBlockedConnection: boolean;
  hasActiveConnection: boolean;
  raw: MKClienteDoc;
}

interface SendReport {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function normalizeRecipient(client: MKClienteDoc): CampaignRecipient {
  const raw = client as unknown as Record<string, unknown>;
  const enderecoList = Array.isArray(raw.endereco) ? (raw.endereco as Record<string, unknown>[]) : [];
  const enderecoInstalacao = enderecoList.find((item) => String(item.tipo || '').toUpperCase() === 'INSTALACAO') || enderecoList[0] || {};

  const cdCliente = pickString(raw, ['cd_cliente', 'CD_CLIENTE', 'CodigoPessoa', 'codigo', 'id']);
  const nome = pickString(raw, ['nome', 'NOME', 'Nome', 'name', 'NOME_CLIENTE', 'RazaoSocial']) || 'Sem nome';
  const doc = pickString(raw, ['doc', 'DOC', 'CPF_CNPJ', 'cpf_cnpj', 'CPF', 'CNPJ']);
  const bairro = pickString(raw, ['bairro', 'BAIRRO', 'nome_bairro']) || pickString(enderecoInstalacao, ['bairro']);
  const cidade = pickString(raw, ['cidade', 'CIDADE', 'nome_cidade']) || pickString(enderecoInstalacao, ['cidade']);
  const uf = pickString(raw, ['uf', 'UF']) || pickString(enderecoInstalacao, ['estado', 'uf']);

  const phoneRaw = pickString(raw, [
    'contato_1',
    'contato_2',
    'telefone',
    'fone',
    'celular',
    'whatsapp',
    'phone',
    'phone_number',
    'Fone',
  ]);

  return {
    id: `${cdCliente || nome}-${doc || Math.random().toString(36).slice(2)}`,
    cdCliente,
    nome,
    doc,
    phone: normalizeRecipientPhone(phoneRaw),
    bairro,
    cidade,
    uf,
    hasOverdueInvoice: false,
    hasBlockedConnection: false,
    hasActiveConnection: false,
    raw: client,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DisparosTemplates = () => {
  const { toast } = useToast();

  const [gupshupConfig, setGupshupConfig] = useState({ apiKey: '', appId: '', source: '' });

  const [baseBusca, setBaseBusca] = useState({
    nome_cliente: '',
    doc: '',
    codigo_bairro: '',
    cd_cliente_inicio: '',
    cd_cliente_fim: '',
  });

  const [segmentacao, setSegmentacao] = useState({
    uf: '',
    cidade: '',
    bairro: '',
    somenteVencidos: false,
    somenteBloqueados: false,
    somenteConexaoAtiva: false,
  });

  const [maxAnalise, setMaxAnalise] = useState('50');
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const [templates, setTemplates] = useState<GupshupTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateParamsText, setTemplateParamsText] = useState('');
  const [messageJsonText, setMessageJsonText] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [rateDelayMs, setRateDelayMs] = useState('700');
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendReport, setSendReport] = useState<SendReport | null>(null);

  useEffect(() => {
    void (async () => {
      const config = await getGupshupConfig();
      setGupshupConfig({
        apiKey: config.apiKey,
        appId: config.appId,
        source: config.source,
      });
    })();
  }, []);

  const observedFields = useMemo(() => {
    const fieldCount = new Map<string, number>();
    recipients.forEach((r) => {
      Object.keys((r.raw || {}) as Record<string, unknown>).forEach((key) => {
        fieldCount.set(key, (fieldCount.get(key) || 0) + 1);
      });
    });

    return Array.from(fieldCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([field, count]) => ({ field, count }));
  }, [recipients]);

  const filteredRecipients = useMemo(() => {
    return recipients.filter((item) => {
      if (segmentacao.somenteVencidos && !item.hasOverdueInvoice) return false;
      if (segmentacao.somenteBloqueados && !item.hasBlockedConnection) return false;
      if (segmentacao.somenteConexaoAtiva && !item.hasActiveConnection) return false;

      if (segmentacao.uf && item.uf.toLowerCase() !== segmentacao.uf.toLowerCase()) return false;
      if (segmentacao.cidade && !item.cidade.toLowerCase().includes(segmentacao.cidade.toLowerCase())) return false;
      if (segmentacao.bairro && !item.bairro.toLowerCase().includes(segmentacao.bairro.toLowerCase())) return false;

      return true;
    });
  }, [recipients, segmentacao]);

  const selectedRecipients = useMemo(
    () => filteredRecipients.filter((item) => selectedIds.has(item.id)),
    [filteredRecipients, selectedIds]
  );

  const invalidPhoneCount = selectedRecipients.filter((r) => !r.phone).length;

  const toggleSelectAllFiltered = () => {
    const allSelected = filteredRecipients.length > 0 && filteredRecipients.every((r) => selectedIds.has(r.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredRecipients.forEach((r) => next.delete(r.id));
      } else {
        filteredRecipients.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await listGupshupTemplates(
        { page: 0, limit: 100 },
        {
          apiKey: gupshupConfig.apiKey,
          appId: gupshupConfig.appId,
          source: gupshupConfig.source,
        }
      );
      setTemplates(result);
      if (!selectedTemplateId && result.length > 0) {
        setSelectedTemplateId(result[0].id);
      }
      toast({ title: 'Templates carregados', description: `${result.length} template(s) disponível(is).` });
    } catch (error) {
      toast({
        title: 'Falha ao carregar templates',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadRecipients = async () => {
    if (!baseBusca.nome_cliente && !baseBusca.doc && !baseBusca.codigo_bairro && !baseBusca.cd_cliente_inicio && !baseBusca.cd_cliente_fim) {
      toast({
        title: 'Informe um filtro base',
        description: 'O MK exige pelo menos um parâmetro (nome, documento, bairro ou faixa de código).',
        variant: 'destructive',
      });
      return;
    }

    setLoadingRecipients(true);
    setRecipients([]);
    setSelectedIds(new Set());

    try {
      const params: Record<string, string> = {};
      if (baseBusca.nome_cliente.trim()) params.nome_cliente = baseBusca.nome_cliente.trim();
      if (baseBusca.doc.trim()) params.doc = baseBusca.doc.replace(/\D/g, '');
      if (baseBusca.codigo_bairro.trim()) params.codigo_bairro = baseBusca.codigo_bairro.trim();
      if (baseBusca.cd_cliente_inicio.trim()) params.cd_cliente_inicio = baseBusca.cd_cliente_inicio.trim();
      if (baseBusca.cd_cliente_fim.trim()) params.cd_cliente_fim = baseBusca.cd_cliente_fim.trim();

      const raw = await consultaClientes(params);
      const mapped = raw.map(normalizeRecipient);

      const limit = Math.max(1, Number(maxAnalise) || 50);
      const limited = mapped.slice(0, limit);

      const enriched: CampaignRecipient[] = [];

      for (const item of limited) {
        const cd = item.cdCliente;
        if (!cd) {
          enriched.push(item);
          continue;
        }

        const [faturas, conexoes] = await Promise.all([faturasPendentes(cd), conexoesPorCliente(cd)]);

        const hasOverdueInvoice = faturas.some((fatura) => {
          const status = String(fatura.situacao || '').toLowerCase();
          return status.includes('venc') || status.includes('aberto') || status.includes('pend');
        });

        const hasBlockedConnection = conexoes.some((conn) => {
          const bloqueada = String(conn.bloqueada || '').toLowerCase();
          const status = String(conn.status_conexao || '').toLowerCase();
          return bloqueada.includes('sim') || status.includes('bloq');
        });

        const hasActiveConnection = conexoes.some((conn) => {
          const status = String(conn.status_conexao || '').toLowerCase();
          return status.includes('ativo') || status.includes('online') || status.includes('conect');
        });

        enriched.push({
          ...item,
          hasOverdueInvoice,
          hasBlockedConnection,
          hasActiveConnection,
        });
      }

      setRecipients(enriched);
      setSelectedIds(new Set(enriched.map((r) => r.id)));

      const skipped = mapped.length - enriched.length;
      const extraInfo = skipped > 0 ? ` (${skipped} não analisados por limite)` : '';
      toast({ title: 'Base carregada', description: `${enriched.length} cliente(s) analisado(s)${extraInfo}.` });
    } catch (error) {
      toast({
        title: 'Erro ao consultar MK',
        description: error instanceof Error ? error.message : 'Falha na consulta de clientes',
        variant: 'destructive',
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast({ title: 'Selecione um template', variant: 'destructive' });
      return;
    }

    if (!gupshupConfig.apiKey || !gupshupConfig.appId || !gupshupConfig.source) {
      toast({
        title: 'Configuração Gupshup incompleta',
        description: 'Preencha API Key, App ID e Source para enviar.',
        variant: 'destructive',
      });
      return;
    }

    const recipientsToSend = selectedRecipients.filter((recipient) => !!recipient.phone);
    if (recipientsToSend.length === 0) {
      toast({ title: 'Nenhum destinatário válido', description: 'Selecione clientes com telefone válido.', variant: 'destructive' });
      return;
    }

    let parsedMessage: Record<string, unknown> | undefined;
    if (messageJsonText.trim()) {
      try {
        parsedMessage = JSON.parse(messageJsonText);
      } catch {
        toast({ title: 'JSON de mídia inválido', description: 'Corrija o campo message JSON antes de enviar.', variant: 'destructive' });
        return;
      }
    }

    const params = parseTemplateParams(templateParamsText);
    const waitMs = Math.max(0, Number(rateDelayMs) || 700);

    setSending(true);
    setSendProgress(0);
    setSendReport(null);

    const errors: string[] = [];
    let success = 0;

    for (let i = 0; i < recipientsToSend.length; i += 1) {
      const item = recipientsToSend[i];
      try {
        await sendGupshupTemplate({
          destination: item.phone,
          templateId: selectedTemplateId,
          params,
          message: parsedMessage,
        }, {
          apiKey: gupshupConfig.apiKey,
          appId: gupshupConfig.appId,
          source: gupshupConfig.source,
        });
        success += 1;
      } catch (error) {
        errors.push(`${item.nome} (${item.phone}): ${error instanceof Error ? error.message : 'falha desconhecida'}`);
      }

      setSendProgress(Math.round(((i + 1) / recipientsToSend.length) * 100));
      if (i < recipientsToSend.length - 1 && waitMs > 0) {
        await delay(waitMs);
      }
    }

    const report: SendReport = {
      total: recipientsToSend.length,
      success,
      failed: recipientsToSend.length - success,
      errors,
    };

    setSendReport(report);
    setSending(false);

    if (report.failed > 0) {
      toast({
        title: 'Disparo finalizado com falhas',
        description: `${report.success}/${report.total} enviados com sucesso.`,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Disparo concluído', description: `${report.total} mensagens enviadas com sucesso.` });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Disparos de Templates</h1>
          <p className="text-muted-foreground">
            Segmentação de clientes via MK e disparo de templates WhatsApp via Gupshup (execução em lote com controle de taxa).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Configuração Gupshup</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>API Key</Label>
              <Input value={gupshupConfig.apiKey} onChange={(e) => setGupshupConfig((prev) => ({ ...prev, apiKey: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>App ID</Label>
              <Input value={gupshupConfig.appId} onChange={(e) => setGupshupConfig((prev) => ({ ...prev, appId: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Source (número origem)</Label>
              <Input value={gupshupConfig.source} onChange={(e) => setGupshupConfig((prev) => ({ ...prev, source: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Base de clientes MK</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input placeholder="Nome cliente" value={baseBusca.nome_cliente} onChange={(e) => setBaseBusca((prev) => ({ ...prev, nome_cliente: e.target.value }))} />
              <Input placeholder="Documento (CPF/CNPJ)" value={baseBusca.doc} onChange={(e) => setBaseBusca((prev) => ({ ...prev, doc: e.target.value }))} />
              <Input placeholder="Código bairro (MK)" value={baseBusca.codigo_bairro} onChange={(e) => setBaseBusca((prev) => ({ ...prev, codigo_bairro: e.target.value }))} />
              <Input placeholder="cd_cliente início" value={baseBusca.cd_cliente_inicio} onChange={(e) => setBaseBusca((prev) => ({ ...prev, cd_cliente_inicio: e.target.value }))} />
              <Input placeholder="cd_cliente fim" value={baseBusca.cd_cliente_fim} onChange={(e) => setBaseBusca((prev) => ({ ...prev, cd_cliente_fim: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="UF" value={segmentacao.uf} onChange={(e) => setSegmentacao((prev) => ({ ...prev, uf: e.target.value }))} />
              <Input placeholder="Cidade contém..." value={segmentacao.cidade} onChange={(e) => setSegmentacao((prev) => ({ ...prev, cidade: e.target.value }))} />
              <Input placeholder="Bairro contém..." value={segmentacao.bairro} onChange={(e) => setSegmentacao((prev) => ({ ...prev, bairro: e.target.value }))} />
              <Input placeholder="Máx. clientes para análise" value={maxAnalise} onChange={(e) => setMaxAnalise(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={segmentacao.somenteVencidos} onChange={(e) => setSegmentacao((prev) => ({ ...prev, somenteVencidos: e.target.checked }))} /> Somente com fatura vencida/pendente</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={segmentacao.somenteBloqueados} onChange={(e) => setSegmentacao((prev) => ({ ...prev, somenteBloqueados: e.target.checked }))} /> Somente conexão bloqueada</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={segmentacao.somenteConexaoAtiva} onChange={(e) => setSegmentacao((prev) => ({ ...prev, somenteConexaoAtiva: e.target.checked }))} /> Somente conexão ativa</label>
            </div>

            <div className="flex gap-2">
              <Button onClick={loadRecipients} disabled={loadingRecipients}>
                {loadingRecipients ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />} Buscar e analisar base
              </Button>
              <Button variant="secondary" onClick={toggleSelectAllFiltered}>
                Selecionar/desmarcar filtrados
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Base analisada: {recipients.length}</Badge>
              <Badge variant="secondary">Após filtros: {filteredRecipients.length}</Badge>
              <Badge variant="secondary">Selecionados: {selectedRecipients.length}</Badge>
            </div>

            {observedFields.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium mb-2">Campos mais frequentes retornados pelo MK (amostra da busca atual):</p>
                <div className="flex flex-wrap gap-2">
                  {observedFields.map((item) => (
                    <Badge key={item.field} variant="outline">{item.field} ({item.count})</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-2 text-left">Sel.</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Telefone</th>
                    <th className="p-2 text-left">Cidade/UF</th>
                    <th className="p-2 text-left">Segmentos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.map((item) => (
                    <tr key={item.id} className="border-b border-border/60">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{item.nome}</div>
                        <div className="text-muted-foreground text-xs">CD {item.cdCliente || '-'} · {item.doc || 'Sem doc'}</div>
                      </td>
                      <td className="p-2">{item.phone || <span className="text-destructive">Sem telefone</span>}</td>
                      <td className="p-2">{item.cidade || '-'} / {item.uf || '-'}</td>
                      <td className="p-2 space-x-1">
                        {item.hasOverdueInvoice && <Badge variant="outline">Vencido</Badge>}
                        {item.hasBlockedConnection && <Badge variant="outline">Bloqueado</Badge>}
                        {item.hasActiveConnection && <Badge variant="outline">Ativo</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Template e disparo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={loadTemplates} disabled={loadingTemplates}>
                {loadingTemplates ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />} Carregar templates
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {(tpl.elementName || 'Sem nome')} · {tpl.languageCode || '-'} · {tpl.status || '-'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Delay entre envios (ms)</Label>
                <Input value={rateDelayMs} onChange={(e) => setRateDelayMs(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Parâmetros do template (separados por vírgula ou quebra de linha)</Label>
              <Textarea
                value={templateParamsText}
                onChange={(e) => setTemplateParamsText(e.target.value)}
                placeholder="Ex: João, Rua A, Código 123"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label>Message JSON (opcional, para template de mídia/localização)</Label>
              <Textarea
                value={messageJsonText}
                onChange={(e) => setMessageJsonText(e.target.value)}
                placeholder='{"type":"image","image":{"link":"https://..."}}'
                rows={4}
              />
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5" />
              <p>
                Este fluxo envia direto do frontend para a Gupshup. Se a API bloquear CORS ou se a chave for sensível,
                considere mover para proxy/backend depois.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSend} disabled={sending || selectedRecipients.length === 0}>
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Disparar para selecionados
              </Button>
              <Badge variant="secondary">Selecionados: {selectedRecipients.length}</Badge>
              <Badge variant="secondary">Sem telefone: {invalidPhoneCount}</Badge>
            </div>

            {sending && (
              <div className="space-y-2">
                <Progress value={sendProgress} />
                <p className="text-sm text-muted-foreground">Progresso: {sendProgress}%</p>
              </div>
            )}

            {sendReport && (
              <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                <p><strong>Total:</strong> {sendReport.total} · <strong>Sucesso:</strong> {sendReport.success} · <strong>Falhas:</strong> {sendReport.failed}</p>
                {sendReport.errors.length > 0 && (
                  <ul className="list-disc ml-5 space-y-1 text-destructive">
                    {sendReport.errors.slice(0, 8).map((err, idx) => (
                      <li key={`${err}-${idx}`}>{err}</li>
                    ))}
                    {sendReport.errors.length > 8 && <li>...e mais {sendReport.errors.length - 8} erro(s)</li>}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DisparosTemplates;
