import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserCircle, Loader2, AlertCircle } from 'lucide-react';
import { useClientesMK } from '@/hooks/useMK';
import { getMKConfig, invalidateMKCache } from '@/lib/mk-config';
import type { MKClienteDoc } from '@/lib/mk-api';
import { ClientSummaryPanel } from '@/components/atendimentos/ClientSummaryPanel';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Clientes = () => {
  const [nomeCliente, setNomeCliente] = useState('');
  const [doc, setDoc] = useState('');
  const [tokenPronto, setTokenPronto] = useState(false);
  const [tokenErro, setTokenErro] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<MKClienteDoc | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadConfig = useCallback(async (opts?: { force?: boolean }) => {
    if (!mountedRef.current) return;
    setTokenPronto(false);
    setTokenErro(null);

    if (opts?.force) invalidateMKCache();

    const config = await getMKConfig();
    if (!mountedRef.current) return;
    setTokenPronto(true);

    if (!config.baseUrl?.trim()) {
      setTokenErro('URL do MK não configurada. Supabase: system_settings key "mk_base_url" ou .env VITE_MK_BASE_URL.');
      return;
    }
    if (!config.token?.trim()) {
      setTokenErro('Token MK não configurado. Supabase: system_settings key "mk_token" ou .env VITE_MK_TOKEN.');
      return;
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    const fallbackTimer = setTimeout(() => {
      if (cancel) return;
      setTokenPronto((prev) => prev || true);
    }, 8000);

    void loadConfig().catch(() => {
      if (cancel) return;
      setTokenPronto(true);
      setTokenErro('Falha ao carregar configuração MK.');
    }).finally(() => clearTimeout(fallbackTimer));

    return () => {
      cancel = true;
      clearTimeout(fallbackTimer);
    };
  }, [loadConfig]);

  const [activeParams, setActiveParams] = useState<{ nome_cliente?: string; doc?: string }>({});

  const handleSearch = useCallback(() => {
    const p = {
      ...(nomeCliente.trim() && { nome_cliente: nomeCliente.trim() }),
      ...(doc.trim() && { doc: doc.replace(/\D/g, '') }),
    };
    setActiveParams(p);
  }, [nomeCliente, doc]);

  const hasFilter = !!(nomeCliente.trim() || doc.trim());
  const podeBuscar = tokenPronto && Object.keys(activeParams).length > 0;
  const { data: clientes = [], isLoading, error } = useClientesMK(activeParams, podeBuscar);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasFilter && !isLoading) {
      handleSearch();
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Clientes MK</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Busca de clientes no sistema MK Solutions (Adaptlink). Informe nome ou CPF/CNPJ.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Buscar cliente
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              A API do MK exige pelo menos um parâmetro (nome ou documento). Preencha um dos campos abaixo.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Nome do cliente</label>
                <Input
                  placeholder="Buscar por nome..."
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">CPF/CNPJ</label>
                <Input
                  placeholder="Apenas números"
                  value={doc}
                  onChange={(e) => setDoc(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKeyDown}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={!hasFilter || isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Buscar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setNomeCliente(''); setDoc(''); setActiveParams({}); }}>
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Resultados ({clientes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {!tokenPronto && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Carregando configuração MK...
              </div>
            )}
            {tokenPronto && tokenErro && (
              <div className="flex items-start justify-between gap-3 p-4 rounded-lg bg-destructive/10 text-destructive mb-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm flex-1">{tokenErro}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { void loadConfig({ force: true }); }}
                >
                  Recarregar config
                </Button>
              </div>
            )}
            {tokenPronto && !hasFilter && !tokenErro && (
              <p className="text-center text-muted-foreground py-8">
                Informe <strong>nome</strong> ou <strong>CPF/CNPJ</strong> acima para buscar clientes.
              </p>
            )}
            {podeBuscar && isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2">Buscando clientes...</span>
              </div>
            )}
            {podeBuscar && error && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{String(error)}</p>
              </div>
            )}
            {podeBuscar && !isLoading && !error && clientes.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</p>
            )}
            {podeBuscar && !isLoading && !error && clientes.length > 0 && (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 font-medium">Código</th>
                      <th className="text-left p-2 font-medium">Nome</th>
                      <th className="text-left p-2 font-medium">Contrato / Plano</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c: MKClienteDoc, idx: number) => {
                      const cod = c.cd_cliente || '-';
                      const nome = c.nome || '-';
                      const status = c.status;
                      const plano = c.plano;
                      
                      return (
                        <tr key={String(cod || idx)} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-2 font-mono text-xs">{String(cod)}</td>
                          <td className="p-2">
                            <div className="flex flex-col">
                              <span className="font-medium">{String(nome)}</span>
                              <span className="text-[10px] text-muted-foreground">{c.doc}</span>
                            </div>
                          </td>
                          <td className="p-2 text-xs">{String(plano || 'N/A')}</td>
                          <td className="p-2">
                            {status ? (
                              <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-bold",
                                String(status).toLowerCase().includes('ativ') || String(status).toLowerCase().includes('ok') 
                                  ? "bg-green-100 text-green-700 border-green-200" 
                                  : "bg-red-100 text-red-700 border-red-200"
                              )}>
                                {String(status)}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="p-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] gap-1 px-2"
                              onClick={() => {
                                setSelectedCliente(c);
                                setShowPanel(true);
                              }}
                            >
                              <Search className="w-3 h-3" />
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedCliente && (
        <ClientSummaryPanel
          open={showPanel}
          onClose={() => setShowPanel(false)}
          cliente={selectedCliente}
          cdCliente={selectedCliente.cd_cliente ? String(selectedCliente.cd_cliente) : null}
        />
      )}
    </Layout>
  );
};

export default Clientes;
