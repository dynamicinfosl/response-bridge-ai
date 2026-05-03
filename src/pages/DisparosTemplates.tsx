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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [templates, setTemplates] = useState<GupshupTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateParamsText, setTemplateParamsText] = useState<string>('');
  const [templateSearch, setTemplateSearch] = useState<string>('');

  const [rateDelayMs, setRateDelayMs] = useState('700');
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendReport, setSendReport] = useState<SendReport | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoadingTemplates(true);
      try {
        const config = await getGupshupConfig();
        setGupshupConfig({
          apiKey: config.apiKey,
          appId: config.appId,
          source: config.source,
        });
        
        if (config.apiKey && config.appId && config.source) {
          const result = await listGupshupTemplates(
            { page: 0, limit: 100 },
            { apiKey: config.apiKey, appId: config.appId, source: config.source }
          );
          setTemplates(result);
          if (result.length > 0) setSelectedTemplateId(result[0].id);
        }
      } catch (e) {
        console.error("Erro ao carregar templates", e);
      } finally {
        setLoadingTemplates(false);
      }
    })();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => 
      t.elementName?.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.category?.toLowerCase().includes(templateSearch.toLowerCase())
    );
  }, [templates, templateSearch]);

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

  const loadRecipients = async () => {
    if (!baseBusca.nome_cliente && !baseBusca.doc && !baseBusca.codigo_bairro && !baseBusca.cd_cliente_inicio && !baseBusca.cd_cliente_fim) {
      toast({
        title: 'Informe um filtro base',
        description: 'Preencha pelo menos o nome ou documento do cliente.',
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

      const extraInfo = mapped.length > enriched.length ? ` (${mapped.length - enriched.length} não analisados por limite)` : '';
      toast({ title: 'Base carregada', description: `${enriched.length} cliente(s) encontrado(s)${extraInfo}.` });
    } catch (error) {
      toast({
        title: 'Erro ao consultar base',
        description: error instanceof Error ? error.message : 'Falha na consulta',
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
        title: 'Configuração WhatsApp indisponível',
        description: 'Contate o administrador.',
        variant: 'destructive',
      });
      return;
    }

    const recipientsToSend = selectedRecipients.filter((recipient) => !!recipient.phone);
    if (recipientsToSend.length === 0) {
      toast({ title: 'Nenhum destinatário válido', description: 'Selecione clientes com WhatsApp válido.', variant: 'destructive' });
      return;
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
      
      // Process dynamic parameters for each recipient
      const processedParams = params.map(p => {
        let val = p;
        // Basic replacements
        val = val.replace(/\{\{(nome|contact_name|cliente)\}\}/gi, item.nome || 'Cliente');
        val = val.replace(/\{\{(phone|whatsapp|telefone)\}\}/gi, item.phone || '');
        val = val.replace(/\{\{(bairro)\}\}/gi, item.bairro || '');
        val = val.replace(/\{\{(cidade)\}\}/gi, item.cidade || '');
        return val;
      });

      try {
        await sendGupshupTemplate({
          destination: item.phone,
          templateId: selectedTemplateId,
          params: processedParams,
        }, gupshupConfig);
        success += 1;
      } catch (error) {
        errors.push(`${item.nome}: ${error instanceof Error ? error.message : 'falha'}`);
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
        title: 'Envio finalizado com algumas falhas',
        description: `${report.success}/${report.total} enviados com sucesso.`,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Envio concluído!', description: `${report.total} mensagens enviadas.` });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Disparos em Massa</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Selecione clientes e envie mensagens automáticas usando templates aprovados.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna 1: Busca e Filtros */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-muted">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center justify-between">
                  <span className="flex items-center gap-2"><Search className="w-5 h-5" /> Buscar Clientes</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="text-xs font-normal"
                  >
                    {showAdvancedFilters ? 'Ocultar filtros' : 'Filtros avançados'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Cliente</Label>
                    <Input 
                      id="nome" 
                      placeholder="Ex: João Silva" 
                      value={baseBusca.nome_cliente} 
                      onChange={(e) => setBaseBusca((prev) => ({ ...prev, nome_cliente: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc">CPF / CNPJ</Label>
                    <Input 
                      id="doc" 
                      placeholder="000.000.000-00" 
                      value={baseBusca.doc} 
                      onChange={(e) => setBaseBusca((prev) => ({ ...prev, doc: e.target.value }))} 
                    />
                  </div>
                </div>

                {showAdvancedFilters && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-muted animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input value={segmentacao.cidade} onChange={(e) => setSegmentacao((prev) => ({ ...prev, cidade: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input value={segmentacao.bairro} onChange={(e) => setSegmentacao((prev) => ({ ...prev, bairro: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Limite de Busca</Label>
                        <Select value={maxAnalise} onValueChange={setMaxAnalise}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20">20 clientes</SelectItem>
                            <SelectItem value="50">50 clientes</SelectItem>
                            <SelectItem value="100">100 clientes</SelectItem>
                            <SelectItem value="200">200 clientes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="vencidos" checked={segmentacao.somenteVencidos} onChange={(e) => setSegmentacao((prev) => ({ ...prev, somenteVencidos: e.target.checked }))} className="rounded border-muted text-primary" />
                          <label htmlFor="vencidos" className="text-sm font-medium leading-none">Apenas com faturas vencidas</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="bloqueados" checked={segmentacao.somenteBloqueados} onChange={(e) => setSegmentacao((prev) => ({ ...prev, somenteBloqueados: e.target.checked }))} className="rounded border-muted text-primary" />
                          <label htmlFor="bloqueados" className="text-sm font-medium leading-none">Apenas conexões bloqueadas</label>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="ativos" checked={segmentacao.somenteConexaoAtiva} onChange={(e) => setSegmentacao((prev) => ({ ...prev, somenteConexaoAtiva: e.target.checked }))} className="rounded border-muted text-primary" />
                          <label htmlFor="ativos" className="text-sm font-medium leading-none">Apenas conexões ativas</label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button 
                    className="flex-1 md:flex-none h-11" 
                    onClick={loadRecipients} 
                    disabled={loadingRecipients}
                  >
                    {loadingRecipients ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />} 
                    Consultar Base
                  </Button>
                  
                  {recipients.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="h-11"
                      onClick={toggleSelectAllFiltered}
                    >
                      {filteredRecipients.every(r => selectedIds.has(r.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {recipients.length > 0 && (
              <Card className="shadow-sm border-muted">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Resultados da Busca ({filteredRecipients.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                        {selectedIds.size} Selecionados
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 border-b">
                        <tr>
                          <th className="p-3 text-left w-10"></th>
                          <th className="p-3 text-left">Cliente</th>
                          <th className="p-3 text-left">WhatsApp</th>
                          <th className="p-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRecipients.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
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
                                className="rounded border-muted text-primary"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{item.nome}</div>
                              <div className="text-xs text-muted-foreground">MK: {item.cdCliente || '-'}</div>
                            </td>
                            <td className="p-3">
                              {item.phone ? (
                                <span className="font-mono text-xs">{item.phone}</span>
                              ) : (
                                <span className="text-destructive text-xs italic">Indisponível</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {item.hasOverdueInvoice && <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-600 border-red-100">Fatura</Badge>}
                                {item.hasBlockedConnection && <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-600 border-amber-100">Bloqueado</Badge>}
                                {item.hasActiveConnection && <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-600 border-green-100">Ativo</Badge>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna 2: Configuração do Template */}
          <div className="space-y-6">
            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Preparar Envio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Template WhatsApp</Label>
                    <div className="relative w-48">
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="Filtrar..." 
                        className="h-7 text-[10px] pl-7"
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {loadingTemplates ? (
                    <div className="flex items-center justify-center p-8 bg-background/50 rounded-xl border border-dashed">
                      <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredTemplates.map((tpl) => (
                        <div 
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`
                            p-3 rounded-xl border cursor-pointer transition-all duration-200 group
                            ${selectedTemplateId === tpl.id 
                              ? 'bg-primary border-primary shadow-md ring-2 ring-primary/20' 
                              : 'bg-background hover:border-primary/50 hover:bg-primary/5'}
                          `}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold uppercase tracking-wider ${selectedTemplateId === tpl.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                              {tpl.elementName}
                            </span>
                            <Badge className={selectedTemplateId === tpl.id ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'}>
                              {tpl.category}
                            </Badge>
                          </div>
                          <p className={`text-[11px] line-clamp-2 italic ${selectedTemplateId === tpl.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            "{String(tpl.raw?.data ?? tpl.raw?.content ?? 'Sem preview disponível')}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedTemplateId && (
                  <div className="space-y-4 pt-4 border-t border-primary/10">
                    <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                        <Users className="w-3 h-3" /> Preview do Envio
                      </Label>
                      {(() => {
                        const tpl = templates.find(t => t.id === selectedTemplateId);
                        const rawContent = String(tpl?.raw?.data ?? tpl?.raw?.content ?? '');
                        const firstRecipient = selectedRecipients[0];
                        const params = parseTemplateParams(templateParamsText);
                        
                        let preview = rawContent;
                        // Replace {{1}}, {{2}}... with params
                        params.forEach((p, idx) => {
                          const placeholder = `{{${idx + 1}}}`;
                          let val = p;
                          if (firstRecipient) {
                            val = val.replace(/\{\{(nome|contact_name|cliente)\}\}/gi, firstRecipient.nome || 'Cliente');
                            val = val.replace(/\{\{(phone|whatsapp|telefone)\}\}/gi, firstRecipient.phone || '');
                            val = val.replace(/\{\{(bairro)\}\}/gi, firstRecipient.bairro || '');
                            val = val.replace(/\{\{(cidade)\}\}/gi, firstRecipient.cidade || '');
                          }
                          preview = preview.replace(placeholder, val);
                        });

                        return (
                          <div className="text-xs space-y-1">
                            <p className="text-foreground leading-relaxed">
                              {preview || <span className="text-muted-foreground italic">Nenhum conteúdo definido</span>}
                            </p>
                            {firstRecipient && (
                              <p className="text-[9px] text-muted-foreground border-t pt-1">
                                Exemplo para: <strong>{firstRecipient.nome}</strong>
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        Variáveis do Template
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[9px] py-0 cursor-help" title="Substituído pelo nome do cliente">{'{{nome}}'}</Badge>
                          <Badge variant="outline" className="text-[9px] py-0 cursor-help" title="Substituído pela cidade">{'{{cidade}}'}</Badge>
                        </div>
                      </Label>
                      <Input
                        value={templateParamsText}
                        onChange={(e) => setTemplateParamsText(e.target.value)}
                        placeholder="João Silva, 15/05, ..."
                        className="bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground">Dica: Separe os valores por vírgula para preencher os campos.</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-primary/10">
                  <Button 
                    className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" 
                    onClick={handleSend} 
                    disabled={sending || selectedIds.size === 0 || !selectedTemplateId}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Iniciar Disparo
                      </>
                    )}
                  </Button>
                  
                  {sending && (
                    <div className="mt-4 space-y-2">
                      <Progress value={sendProgress} className="h-2" />
                      <p className="text-center text-xs text-muted-foreground font-medium">{sendProgress}% concluído</p>
                    </div>
                  )}

                  {sendReport && (
                    <div className="mt-4 p-4 rounded-lg bg-background border space-y-3 animate-in zoom-in-95">
                      <h4 className="font-bold text-sm border-b pb-2 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-500" /> Relatório Final
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-green-50 rounded border border-green-100">
                          <div className="text-lg font-bold text-green-700">{sendReport.success}</div>
                          <div className="text-[10px] uppercase text-green-600">Sucesso</div>
                        </div>
                        <div className="p-2 bg-red-50 rounded border border-red-100">
                          <div className="text-lg font-bold text-red-700">{sendReport.failed}</div>
                          <div className="text-[10px] uppercase text-red-600">Falhas</div>
                        </div>
                      </div>
                      {sendReport.errors.length > 0 && (
                        <div className="max-h-32 overflow-y-auto text-[10px] text-destructive pt-2">
                          {sendReport.errors.slice(0, 5).map((err, idx) => (
                            <p key={idx}>• {err}</p>
                          ))}
                          {sendReport.errors.length > 5 && <p>...e mais {sendReport.errors.length - 5} erros</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DisparosTemplates;
