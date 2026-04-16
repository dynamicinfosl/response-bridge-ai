import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserCircle, Loader2, AlertCircle } from 'lucide-react';
import { useClientesMK } from '@/hooks/useMK';
import { getMKConfig, invalidateMKCache } from '@/lib/mk-config';
import type { MKClienteDoc } from '@/lib/mk-api';

const Clientes = () => {
  const [nomeCliente, setNomeCliente] = useState('');
  const [doc, setDoc] = useState('');
  const [tokenPronto, setTokenPronto] = useState(false);
  const [tokenErro, setTokenErro] = useState<string | null>(null);
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

  const params = {
    ...(nomeCliente.trim() && { nome_cliente: nomeCliente.trim() }),
    ...(doc.trim() && { doc: doc.replace(/\D/g, '') }),
  };
  const hasFilter = !!(nomeCliente.trim() || doc.trim());
  const podeBuscar = tokenPronto && hasFilter;
  const { data: clientes = [], isLoading, error, refetch } = useClientesMK(params, podeBuscar);

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
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">CPF/CNPJ</label>
                <Input
                  placeholder="Apenas números"
                  value={doc}
                  onChange={(e) => setDoc(e.target.value.replace(/\D/g, ''))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => refetch()}
                disabled={!hasFilter || isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Buscar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setNomeCliente(''); setDoc(''); }}>
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
                      <th className="text-left p-2 font-medium">Doc (CPF/CNPJ)</th>
                      <th className="text-left p-2 font-medium">Outros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c: MKClienteDoc & Record<string, unknown>, idx: number) => {
                      const cod = c.cd_cliente ?? c.CD_CLIENTE ?? c.CodigoPessoa ?? c.codigo ?? '-';
                      const nome = c.nome ?? c.name ?? c.NOME ?? c.NOME_CLIENTE ?? '-';
                      const documento = c.doc ?? c.documento ?? c.DOC ?? c.CPF ?? c.CPF_CNPJ ?? '-';
                      return (
                        <tr key={String(cod ?? idx)} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-2">{String(cod)}</td>
                          <td className="p-2">{String(nome)}</td>
                          <td className="p-2">{String(documento)}</td>
                          <td className="p-2 text-muted-foreground">
                            {Object.entries(c)
                              .filter(([k]) => !['cd_cliente', 'CD_CLIENTE', 'CodigoPessoa', 'nome', 'name', 'NOME', 'NOME_CLIENTE', 'doc', 'documento', 'DOC', 'CPF', 'CPF_CNPJ'].includes(k))
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ') || '-'}
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
    </Layout>
  );
};

export default Clientes;
