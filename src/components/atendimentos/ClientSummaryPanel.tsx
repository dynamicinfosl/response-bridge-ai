import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  User, 
  FileText, 
  FileStack, 
  Wifi, 
  Loader2, 
  MapPin, 
  Phone, 
  Calendar,
  CreditCard,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Mail,
  Send,
  Download,
  Router,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useClienteResumo } from '@/hooks/useMK';
import { segundaViaFatura, consultaConexaoAutenticada } from '@/lib/mk-api';
import { chatwootAPI } from '@/lib/chatwoot';
import type { MKClienteDoc, MKInvoice, MKContract, MKConnection } from '@/lib/mk-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ClientSummaryPanelProps {
  open: boolean;
  onClose: () => void;
  cliente: MKClienteDoc | null;
  cdCliente: string | null;
  conversationId?: string | null;
}

export function ClientSummaryPanel({ open, onClose, cliente, cdCliente, conversationId }: ClientSummaryPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const [loadingFatura, setLoadingFatura] = useState<Record<string, boolean>>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [loadingRouter, setLoadingRouter] = useState<Record<string, boolean>>({});
  const { data, isLoading, error } = useClienteResumo(cdCliente, cliente, open && !!cdCliente);

  useEffect(() => {
    const handleUnminimize = () => setMinimized(false);
    window.addEventListener('mk-panel-unminimize', handleUnminimize);
    return () => window.removeEventListener('mk-panel-unminimize', handleUnminimize);
  }, []);

  if (!open) return null;

  const nome = data?.cliente?.nome ?? cliente?.nome ?? 'Cliente';
  const doc = data?.cliente?.doc ?? cliente?.doc ?? '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleActionOnFatura = async (cdFatura: string | number, action: 'view' | 'send') => {
    setLoadingFatura(p => ({ ...p, [cdFatura]: true }));
    try {
      const res = await segundaViaFatura(cdFatura);
      const link = res?.PathDownload || res?.pathDownload || res?.link_boleto || res?.linkBoleto || res?.url || res?.link || res?.link_fatura || (res?.[0] && (res[0].PathDownload || res[0].link_fatura || res[0].link_boleto));
      
      if (!link) {
         toast.error("A API do MK não retornou o link da 2ª via da fatura.");
         console.error("[Segunda Via Fatura] Retorno vazio de link:", res);
         return;
      }
      
      if (action === 'view') {
        setPdfUrl(link);
        setPdfModalOpen(true);
      } else {
        if (!conversationId) {
          toast.error("Nenhuma conversa selecionada para enviar.");
          return;
        }

        try {
          // Tentar enviar como ARQUIVO PDF (Solicitação do Usuário)
          toast.info("Preparando PDF para envio...");
          
          // Ajustar URL para usar proxy se necessário para evitar CORS
          const isDev = import.meta.env.MODE === 'development';
          const mkBase = import.meta.env.VITE_MK_BASE_URL || '';
          let fetchUrl = link;
          if (isDev && mkBase && link.startsWith(mkBase)) {
            fetchUrl = link.replace(mkBase, '/api/mk');
          }

          const response = await fetch(fetchUrl);
          if (!response.ok) throw new Error("Falha ao baixar PDF do MK");
          
          const blob = await response.blob();
          const file = new File([blob], `Fatura_${cdFatura}.pdf`, { type: 'application/pdf' });
          
          await chatwootAPI.sendAttachment(Number(conversationId), file, `Segue a fatura #${cdFatura} em anexo.`);
          toast.success("Fatura enviada com sucesso no chat!");
        } catch (fileErr) {
          console.error("[Chatwoot Send File] Falha, tentando enviar apenas o link:", fileErr);
          // Fallback: enviar como mensagem de texto com o link
          await chatwootAPI.sendMessage(Number(conversationId), `Olá! Sua fatura #${cdFatura} está disponível para pagamento neste link:\n\n${link}`);
          toast.success("Fatura enviada como link (o arquivo não pôde ser processado).");
        }
      }
    } catch(err) {
       toast.error("Falha ao gerar e obter 2ª via da fatura no MK.");
    } finally {
      setLoadingFatura(p => ({ ...p, [cdFatura]: false }));
    }
  };

  const handleAccessRouter = async (conn: MKConnection) => {
    // Tenta pegar o ID de todas as formas conhecidas que a API do MK possa retornar
    const cd_conexao = conn.cd_conexao || (conn as any).codconexao || (conn as any).codigo || (conn as any).id;
    if (!cd_conexao) {
      toast.error("A conexão não possui um código válido. Informe o suporte.");
      return;
    }
    
    // Abre a aba imediatamente para o navegador não bloquear o popup
    window.open(`/router-access?cd_conexao=${cd_conexao}`, '_blank');
    toast.success("Abrindo painel do roteador em nova guia...");
  };

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    
    // Se o MK já envia '07/04/2026', não podemos passar no new Date() senão o JS inverte dia e mês.
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) return dateStr.split(' ')[0]; // Retorna exatamente como veio (assumindo DD/MM/YYYY)
    }
    
    // Se vier YYYY-MM-DD
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('T')[0].split('-');
      if (y.length === 4) return `${d}/${m}/${y}`;
    }

    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return 'N/A';
    
    // Se for string que parece JSON, tenta fazer o parse
    let parsed = value;
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        parsed = JSON.parse(value);
      } catch (e) {
        parsed = value;
      }
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return 'Nenhum';
      
      // Formatação especial para endereços
      if (key.toLowerCase().includes('endereco')) {
        return parsed.map((item: any) => {
          const parts = [];
          if (item.logradouro) parts.push(item.logradouro);
          if (item.numero) parts.push(item.numero);
          if (item.bairro) parts.push(item.bairro);
          if (item.cidade) parts.push(`${item.cidade}/${item.estado || ''}`);
          return parts.join(', ');
        }).join(' | ');
      }

      // Formatação especial para contratos
      if (key.toLowerCase().includes('contrato')) {
        return parsed.map((item: any) => item.descricao || item.plano || JSON.stringify(item)).join(' | ');
      }

      return parsed.map(item => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ');
    }

    if (typeof parsed === 'object') {
      return JSON.stringify(parsed);
    }

    return String(parsed || 'N/A');
  };



  return (
    <Card
      className={cn(
        'fixed bottom-4 right-4 z-40 flex flex-col shadow-2xl border-primary/20 bg-card/95 backdrop-blur-md transition-all duration-300',
        minimized 
          ? 'w-72 h-12 overflow-hidden' 
          : 'w-[450px] h-[600px] max-h-[85vh] max-w-[calc(100vw-2rem)]'
      )}
    >
      <CardHeader className={cn(
        "flex flex-row items-center justify-between py-2 px-4 border-b bg-primary/5",
        minimized && "h-full border-none"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs truncate uppercase tracking-wider text-primary">Resumo MK Solutions</span>
            {minimized && <span className="text-[10px] truncate text-muted-foreground">{nome}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={() => setMinimized(!minimized)}>
            {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!minimized && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Cabeçalho de Identidade */}
          <div className="p-4 bg-primary/5 border-b space-y-2">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-foreground truncate">{nome}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-background text-[10px] font-mono">{doc}</Badge>
                  <Badge variant="secondary" className="text-[10px]">Cód: {cdCliente}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => window.open(`https://mk.adaptlink.com.br/`, '_blank')}>
                  <ExternalLink className="w-3 h-3" />
                  Abrir MK
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="cadastro" className="flex-1 flex flex-col min-h-0">
            <TabsList className="flex mx-4 mt-4 bg-muted/50 overflow-x-auto justify-start h-10 p-1 no-scrollbar shrink-0">
              <TabsTrigger value="cadastro" className="text-xs gap-1.5 capitalize px-3 overflow-visible whitespace-nowrap shrink-0" title="Dados do Cliente">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Dados</span>
              </TabsTrigger>
              <TabsTrigger value="finance" className="text-xs gap-1.5 capitalize px-3 overflow-visible whitespace-nowrap shrink-0" title="Financeiro">
                <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Financeiro</span>
              </TabsTrigger>
              <TabsTrigger value="contracts" className="text-xs gap-1.5 capitalize px-3 overflow-visible whitespace-nowrap shrink-0" title="Contratos">
                <FileStack className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Contratos</span>
              </TabsTrigger>
              <TabsTrigger value="support" className="text-xs gap-1.5 capitalize px-3 overflow-visible whitespace-nowrap shrink-0" title="Suporte">
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Chamados</span>
              </TabsTrigger>
              <TabsTrigger value="tech" className="text-xs gap-1.5 capitalize px-3 overflow-visible whitespace-nowrap shrink-0" title="Conexões">
                <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Conexões</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cadastro" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-4 pt-2 pb-4">
                  
                  {/* Dados Principais Formatados */}
                  <div className="bg-background p-3 rounded-xl border border-border shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b">
                      <User className="w-3.5 h-3.5" /> Informações Principais
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const c = (data?.cliente || cliente || {}) as any;
                        const telefone = c.Fone ?? c.fone ?? c.telefone ?? c.Celular ?? c.Contato ?? 'N/A';
                        const email = c.Email ?? c.email ?? 'N/A';
                        
                        // Extração inteligente de endereço
                        let enderecoFormatado = 'N/A';
                        const rawAddr = c.Endereco_completo ?? c.endereco_completo ?? c.Endereco ?? c.endereco ?? c.Logradouro;
                        if (rawAddr) {
                          enderecoFormatado = formatValue('endereco', rawAddr);
                        } else {
                          const bairro = c.Bairro ?? c.bairro ?? 'N/A';
                          const cidade = c.Cidade ?? c.cidade ?? 'N/A';
                          const uf = c.Uf ?? c.uf ?? c.Estado ?? 'N/A';
                          const rua = c.Logradouro ?? c.Rua ?? 'N/A';
                          if (rua !== 'N/A') {
                            enderecoFormatado = `${rua}${bairro !== 'N/A' ? `, ${bairro}` : ''}${cidade !== 'N/A' ? ` - ${cidade}/${uf}` : ''}`;
                          }
                        }

                        // Extração inteligente de plano/contrato
                        let plano = c.Plano ?? c.plano ?? c.PlanoAcesso ?? c.Produto ?? 'N/A';
                        if (plano === 'N/A' && c.contratos) {
                          plano = formatValue('contratos', c.contratos);
                        }
                        
                        const status = c.StatusPessoa ?? c.Status ?? c.status ?? c.Situacao ?? 'N/A';
                        
                        return (
                          <>
                            <div className="flex items-start gap-2">
                              <Phone className="w-4 h-4 text-primary mt-0.5" />
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground">Telefone</span>
                                <span className="text-xs font-medium">{telefone}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Mail className="w-4 h-4 text-primary mt-0.5" />
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground">E-mail</span>
                                <span className="text-xs font-medium break-all">{formatValue('email', email)}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 sm:col-span-2">
                              <MapPin className="w-4 h-4 text-primary mt-0.5" />
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground">Endereço</span>
                                <span className="text-xs font-medium">{enderecoFormatado}</span>
                              </div>
                            </div>
                            {plano !== 'N/A' && (
                              <div className="flex items-start gap-2 sm:col-span-2">
                                <Wifi className="w-4 h-4 text-success mt-0.5" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground">Plano Atual / Contratos</span>
                                  <span className="text-xs font-medium">{plano}</span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-primary mt-0.5" />
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground">CPF / CNPJ</span>
                                <span className="text-xs font-medium">{c.CPF_CNPJ ?? c.doc ?? doc ?? 'N/A'}</span>
                              </div>
                            </div>
                            {status !== 'N/A' && (
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground">Status / Situação</span>
                                  <Badge variant="outline" className="text-[10px] w-fit mt-0.5">{status}</Badge>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="finance" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full px-4 pb-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Buscando faturas...</span>
                  </div>
                ) : (
                  <div className="space-y-6 pt-2">
                    {/* Faturas Abertas / Pendentes */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Em Aberto / Pendentes</h4>
                      {data?.faturas?.length ? data.faturas.map((f: any, i: number) => {
                        const cdFatura = f.cd_fatura || f.codfatura || f.id || i;
                        const dataVencimento = f.data_vencimento || f.datavencimento || f.vencimento;
                        const valorFatura = f.valor_fatura || f.valorfatura || f.valor || f.vltotal || f.valortotal || f.valor_total || f.vl_total;
                        const isOverdue = dataVencimento && new Date(dataVencimento) < new Date();
                        const linhaDigitavel = f.linha_digitavel || f.linhadigitavel || f.linha;
                        return (
                          <Card key={cdFatura} className={cn(
                            "overflow-hidden border-l-4 shadow-sm",
                            isOverdue ? "border-l-red-500" : "border-l-blue-500"
                          )}>
                            <div className="p-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Fatura #{cdFatura}</span>
                                <Badge className={cn(
                                  "h-5 text-[9px] border-none",
                                  isOverdue ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                )}>
                                  {isOverdue ? "Vencida" : "A Vencer"}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-lg font-bold text-foreground">{formatCurrency(valorFatura)}</p>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Vencimento: {formatDate(dataVencimento)}
                                  </p>
                                </div>
                                <div className="flex gap-1.5">
                                  {linhaDigitavel && (
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-7 px-2 text-[10px] gap-1"
                                      onClick={() => copyToClipboard(linhaDigitavel, 'Código de Barras')}
                                      title="Copiar Código de Barras"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={loadingFatura[cdFatura]}
                                    className="h-7 px-2 text-[10px] gap-1 border-primary/20 text-primary hover:bg-primary/5"
                                    onClick={() => handleActionOnFatura(cdFatura, 'view')}
                                  >
                                    {loadingFatura[cdFatura] ? <Loader2 className="w-3 h-3 animate-spin"/> : <FileText className="w-3 h-3" />} Fatura
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    disabled={loadingFatura[cdFatura]}
                                    className="h-7 px-2 text-[10px] gap-1"
                                    onClick={() => handleActionOnFatura(cdFatura, 'send')}
                                  >
                                    {loadingFatura[cdFatura] ? <Loader2 className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3" />} Enviar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      }) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/20 rounded-lg border border-dashed">
                          <CheckCircle2 className="w-6 h-6 text-green-500 mb-1 opacity-50" />
                          <p className="text-xs font-medium">Nenhuma fatura pendente</p>
                        </div>
                      )}
                    </div>

                    {/* Faturas Pagas (Histórico) */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Histórico de Pagamentos</h4>
                      {data?.faturas_pagas?.length ? data.faturas_pagas.slice(0, 5).map((f: any, i: number) => {
                        const cdFatura = f.cd_fatura || f.codfatura || f.id || i;
                        const valorPago = f.valor_pago || f.valorpago || f.valor_fatura || f.valorfatura || f.valor;
                        const dataPagamento = f.data_pagamento || f.datapagamento || f.data_vencimento || f.datavencimento;
                        return (
                          <Card key={'paga-'+cdFatura} className="overflow-hidden border-l-4 border-l-green-500 shadow-sm opacity-80 hover:opacity-100 transition-opacity bg-muted/10">
                            <div className="p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Fatura #{cdFatura}</span>
                                <Badge className="h-5 text-[9px] bg-green-100 text-green-700 hover:bg-green-100 border-none">Paga</Badge>
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-sm font-bold text-foreground">{formatCurrency(valorPago)}</p>
                                  <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                                    Pagamento: {formatDate(dataPagamento)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      }) : (
                        <p className="text-[10px] text-muted-foreground pl-1 italic">Nenhum histórico recente.</p>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="contracts" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full px-4 pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Data de Entrada na Empresa */}
                    {(() => {
                      const c = (data?.cliente || cliente || {}) as any;
                      // Busca nos campos prováveis que o MK retorna
                      const clienteDesde = c.cliente_desde || c.data_cadastro || c.dt_cadastro || c.criado_em || c.DataCadastro;
                      if (clienteDesde) {
                        return (
                          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-foreground">
                              Cliente na empresa desde: <strong className="text-primary">{formatDate(clienteDesde)}</strong>
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Contratos */}
                    <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Contratos Ativos e Inativos</h4>
                      {data?.contratos?.length ? (
                        <div className="space-y-3">
                          {data.contratos.map((c: any, i: number) => {
                            const cdContrato = c.cd_contrato || c.codcontrato || c.id || i;
                            const plano = c.plano_acesso || c.descricao || c.nome_plano || c.plano || 'Plano não identificado';
                            const status = c.status || c.situacao;
                            const valor = c.valor_contrato || c.valor || c.mensalidade;
                            
                            // Datas de Adesão e Expiração/Cancelamento/Vencimento
                            const adesao = c.data_contratacao || c.data_adesao || c.adesao || c.dt_ativacao || c.data_ativacao;
                            const fim = c.previsao_vencimento || c.vencimento_contrato || c.data_cancelamento || c.dt_cancelamento || c.data_vencimento || c.dt_vencimento || c.vencimento_plano;
                            
                            let diffDays = null;
                            if (fim) {
                              let d = new Date(fim);
                              if (typeof fim === 'string' && fim.includes('/') && fim.split('/').length === 3) {
                                 const parts = fim.split(' ')[0].split('/');
                                 d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                              }
                              if (!isNaN(d.getTime())) {
                                const now = new Date();
                                now.setHours(0,0,0,0);
                                diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              }
                            }
                            
                            return (
                              <div key={cdContrato} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-foreground truncate">{plano}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Contrato #{cdContrato}</p>
                                  </div>
                                  {status && (
                                    <Badge className={cn(
                                      "h-5 text-[9px] uppercase font-bold",
                                      status?.toLowerCase().includes('ativ') || status?.toLowerCase().includes('ok') ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                      {status}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-[11px] bg-background border border-border/50 p-2 rounded">
                                  {adesao && (
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground">Adesão / Ativação</span>
                                      <p className="flex items-center gap-1 font-medium"><Calendar className="w-3 h-3 text-muted-foreground" /> {formatDate(adesao)}</p>
                                    </div>
                                  )}
                                  {fim && (
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground">Vencimento / Fim</span>
                                      <div className="flex flex-col gap-1 mt-0.5">
                                        <p className="flex items-center gap-1 font-medium"><Calendar className="w-3 h-3 text-red-400" /> {formatDate(fim)}</p>
                                        {diffDays != null && (
                                          <Badge variant={diffDays < 0 ? "destructive" : diffDays <= 60 ? "warning" : "outline"} className={cn(
                                            "w-fit text-[9px] h-5 px-1.5 font-bold",
                                            diffDays >= 0 && diffDays <= 60 ? "bg-amber-100 text-amber-800 border-amber-300" : ""
                                          )}>
                                            {diffDays < 0 ? `Vencido há ${Math.abs(diffDays)} dias` : diffDays === 0 ? "Vence hoje!" : `Vence em ${diffDays} dias`}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {valor != null && (
                                    <div className="space-y-0.5 col-span-2">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground">Valor</span>
                                      <p className="flex items-center gap-1 text-muted-foreground"><CreditCard className="w-3 h-3" /> {formatCurrency(valor)}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Conexões atreladas ao contrato */}
                                {(() => {
                                  // Tentar verificar conexões atuais/históricas que pertenceriam a esse contrato
                                  const conexoes = [...(data?.conexoes || []), ...(data?.historico_conexao || [])];
                                  const connsUnique = Array.from(new Map(conexoes.map((item: any) => [item.username_conexao || item.login || item.cd_conexao, item])).values());
                                  
                                  const connRelacionadas = (connsUnique as any[]).filter((conn: any) => 
                                    String(conn.cd_contrato) === String(cdContrato) || 
                                    String(conn.codcontrato) === String(cdContrato) || 
                                    String(conn.cod_contrato) === String(cdContrato)
                                  );

                                  // Se tivermos conexões que vinculam explicitamente...
                                  if (connRelacionadas.length) {
                                    return (
                                      <div className="pt-2 flex flex-wrap gap-1">
                                        {connRelacionadas.map((conn: any, k: number) => {
                                          const statusConn = String(conn.status_conexao || conn.situacao || conn.status || '').toLowerCase();
                                          const isAtiva = statusConn.includes('ativ') || statusConn.includes('on') || statusConn.includes('conect') || statusConn === 'a' || statusConn === 'c';
                                          return (
                                            <Badge key={k} variant="secondary" className={cn(
                                              "text-[9px] font-mono whitespace-nowrap bg-background border",
                                              isAtiva ? "border-green-200" : "border-muted"
                                            )}>
                                              <div className={cn("w-1.5 h-1.5 rounded-full mr-1", isAtiva ? "bg-green-500" : "bg-muted-foreground")} />
                                              {conn.username_conexao || conn.login || 'Conn'}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-center py-6 text-sm text-muted-foreground bg-muted/10 rounded border border-dashed">Nenhum contrato encontrado.</p>
                      )}
                    </div>

                    {/* Histórico / Todas conexões globais */}
                    <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Histórico de Conexões (Geral)</h4>
                      {data?.historico_conexao?.length || data?.conexoes?.length ? (
                        <div className="bg-muted/10 p-2 rounded-lg border text-[10px]">
                          <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {(() => {
                              const todas = [...(data?.conexoes || []), ...(data?.historico_conexao || [])];
                              // Remove duplicadas agrupando por login
                              const unique = Array.from(new Map(todas.map((item: any) => [item.username_conexao || item.login || item.cd_conexao || Math.random(), item])).values());
                              
                              return unique.map((conn: any, i: number) => {
                                const status = String(conn.status_conexao || conn.situacao || conn.status || '').toLowerCase();
                                const isAtiva = status.includes('ativ') || status.includes('on') || status.includes('conect') || status === 'a' || status === 'c';
                                return (
                                  <li key={i} className="flex flex-col gap-0.5 p-1.5 border-b border-border/40 last:border-0 hover:bg-background rounded transition-colors">
                                    <div className="flex justify-between items-center">
                                      <span className="font-mono font-medium flex items-center gap-1 text-foreground">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isAtiva ? "bg-green-500" : "bg-muted-foreground")} />
                                        {conn.username_conexao || conn.login || conn.username || 'S/ Login'}
                                      </span>
                                      {conn.data_hora_inicio && <span className="text-muted-foreground italic truncate max-w-[90px] text-right">Início: {formatDate(conn.data_hora_inicio)}</span>}
                                    </div>
                                    <div className="flex justify-between text-muted-foreground text-[8px] sm:text-[9px]">
                                      <span>MAC: {conn.mac_address || conn.mac || conn.mac_atribuido || '—'}</span>
                                      {(conn.cod_contrato || conn.cd_contrato) && <span>Contrato #{conn.cod_contrato || conn.cd_contrato}</span>}
                                    </div>
                                  </li>
                                );
                              });
                            })()}
                          </ul>
                        </div>
                      ) : (
                         <p className="text-center py-2 text-[10px] text-muted-foreground italic">Nenhum histórico de conectividade.</p>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="support" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full px-4 pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : data?.processos?.length ? (
                  <div className="space-y-3 pt-2">
                    {data.processos.map((p: any, i: number) => {
                      const cdProcesso = p.cd_processo || p.codprocesso || p.id || i;
                      const assunto = p.assunto || p.nome_processo || p.descricao || 'Processo em andamento';
                      const status = p.status || p.situacao || 'Aberto';
                      return (
                        <div key={cdProcesso} className="p-3 rounded-lg border bg-muted/10 space-y-2 relative overflow-hidden">
                          <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-1",
                            status?.toLowerCase().includes('abert') ? "bg-yellow-500" : "bg-green-500"
                          )} />
                          <div className="flex justify-between items-start pl-2">
                            <div className="min-w-0 pr-2 flex-1">
                              <p className="font-bold text-sm text-foreground leading-tight">{assunto}</p>
                              <p className="text-[10px] text-muted-foreground uppercase mt-1">Chamado #{cdProcesso}</p>
                            </div>
                            <Badge variant="outline" className="h-5 text-[9px] whitespace-nowrap bg-background">
                              {status}
                            </Badge>
                          </div>
                          {(p.data_abertura || p.data_previsao || p.departamento || p.tecnico) && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] pl-2 mt-2 bg-background p-2 rounded border border-border/50">
                              {p.data_abertura && (
                                <div className="space-y-0.5">
                                  <span className="text-muted-foreground font-bold">Abertura</span>
                                  <p>{formatDate(p.data_abertura)}</p>
                                </div>
                              )}
                              {p.data_previsao && (
                                <div className="space-y-0.5">
                                  <span className="text-muted-foreground font-bold">Previsão</span>
                                  <p>{formatDate(p.data_previsao)}</p>
                                </div>
                              )}
                              {(p.departamento || p.tecnico) && (
                                <div className="col-span-2 space-y-0.5 mt-1">
                                  <span className="text-muted-foreground font-bold">Departamento / Técnico</span>
                                  <p>{p.departamento || p.tecnico || 'Não atribuído'}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-lg border border-dashed mt-2 mx-1">
                    <FileText className="w-6 h-6 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm font-medium text-foreground">Nenhum chamado aberto</p>
                    <p className="text-xs text-muted-foreground max-w-[200px] mt-1">O histórico de suporte do cliente está limpo.</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tech" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full px-4 pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : data?.conexoes.length ? (
                  <div className="space-y-3 pt-2">
                    {data.conexoes.map((conn: MKConnection) => (
                      <div key={conn.cd_conexao} className="p-3 rounded-lg border border-primary/10 bg-primary/[0.02] space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const s = String(conn.status_conexao || '').toLowerCase().trim();
                              const isOnline = s.includes('online') || s.includes('conectado') || s.includes('ativo') || s === 'c' || s === 'a' || s === 'conectado (pppoe)';
                              return (
                                <div className={cn(
                                  "w-2 h-2 rounded-full animate-pulse",
                                  isOnline ? "bg-green-500" : "bg-red-500"
                                )} />
                              );
                            })()}
                            <span className="font-bold text-sm">{conn.username_conexao || 'Login s/ nome'}</span>
                          </div>
                          <Badge variant="outline" className="h-5 text-[10px] text-primary">PPPoE</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase font-bold text-muted-foreground">Bloqueada</p>
                            <p className="text-xs font-mono text-foreground flex items-center gap-1">
                              {conn.bloqueada === 'Sim' ? (
                                <><span className="w-1.5 h-1.5 rounded-full bg-red-500"/> Sim</>
                              ) : (
                                <><span className="w-1.5 h-1.5 rounded-full bg-green-500"/> Não</>
                              )}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase font-bold text-muted-foreground">MAC Address</p>
                            <p className="text-[10px] font-mono text-foreground">{conn.mac_address || (conn.mac_atribuido as string) || '—'}</p>
                          </div>
                          {conn.motivo_bloqueio && (
                            <div className="col-span-2 space-y-1 bg-red-500/10 p-1.5 rounded border border-red-500/20 text-red-600">
                              <p className="text-[9px] uppercase font-bold">Motivo do Bloqueio</p>
                              <p className="text-xs">{conn.motivo_bloqueio}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-2 pt-2 border-t border-primary/5">
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1.5" onClick={() => copyToClipboard(conn.username_conexao || '', 'Login')}>
                            <Copy className="w-3 h-3" /> Copiar Login
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1.5"
                                  onClick={() => handleAccessRouter(conn)}
                                  disabled={loadingRouter[conn.cd_conexao]} >
                            {loadingRouter[conn.cd_conexao] ? <Loader2 className="w-3 h-3 animate-spin"/> : <Router className="w-3 h-3" />}
                            Acessar Roteador
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1.5 hidden">
                            <RotateCcw className="w-3 h-3" /> Resetar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-sm text-muted-foreground">Nenhuma conexão ativa encontrada.</p>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Rodapé informativo */}
          {data?.cliente?.endereco_completo && (
            <div className="p-3 border-t bg-muted/20 text-[11px] text-muted-foreground space-y-1.5">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{data.cliente.endereco_completo}, {data.cliente.bairro} - {data.cliente.cidade}/{data.cliente.uf}</span>
              </div>
              {data.cliente.contato_1 && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>{data.cliente.contato_1}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Modal de Visualização de PDF */}
      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden gap-0 bg-background border shadow-2xl">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 shrink-0 bg-muted/5">
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Visualização de Fatura
            </DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2 bg-background border-primary/20 hover:bg-primary/5 text-primary"
                onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
              >
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 bg-muted/10 relative">
            {pdfUrl ? (
              <iframe 
                src={`${pdfUrl}#toolbar=0`} 
                className="w-full h-full border-none"
                title="Visualização da Fatura"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

