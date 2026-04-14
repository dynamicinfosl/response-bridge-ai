import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Router as RouterIcon, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { consultaConexaoAutenticada } from '@/lib/mk-api';

const PORTS_TO_TRY = [80, 8080, 8888, 443];

export default function RouterAccess() {
  const [searchParams] = useSearchParams();
  const rawIp = searchParams.get('ip');
  const cdConexao = searchParams.get('cd_conexao');
  
  const [ip, setIp] = useState<string | null>(rawIp);
  const [currentPortIndex, setCurrentPortIndex] = useState(0);
  const [status, setStatus] = useState<'fetching_ip' | 'connecting' | 'success' | 'failed'>(cdConexao && !rawIp ? 'fetching_ip' : 'connecting');
  const [logs, setLogs] = useState<{ port: number; status: 'connecting' | 'failed' | 'success' }[]>([]);
  const hasStarted = useRef(false);

  useEffect(() => {
    const fetchIp = async () => {
      if (!cdConexao) return;
      try {
        const res = await consultaConexaoAutenticada(cdConexao);
        let foundIp = '';
        if (Array.isArray(res) && res.length > 0) {
          foundIp = res[0].framedip || res[0].framed_ip_address || res[0].ip_address || res[0].ip || res[0].ip_conexao;
        } else if (res && typeof res === 'object') {
          let innerIp = res.framedip || res.framed_ip_address || res.ip_address || res.ip || res.ip_conexao;
          if (!innerIp) {
            for (const key of Object.keys(res)) {
              if (res[key] && typeof res[key] === 'object' && !Array.isArray(res[key])) {
                 const inner: any = res[key];
                 innerIp = inner.framedip || inner.framed_ip_address || inner.ip_address || inner.ip || inner.ip_conexao;
                 if (innerIp) break;
              } else if (Array.isArray(res[key]) && res[key].length > 0) {
                 const inner = res[key][0];
                 innerIp = inner.framedip || inner.framed_ip_address || inner.ip_address || inner.ip || inner.ip_conexao;
                 if (innerIp) break;
              }
            }
          }
          foundIp = innerIp;
        }
        
        if (typeof foundIp === 'string' && foundIp.includes('/')) {
          foundIp = foundIp.substring(0, foundIp.indexOf('/'));
        }

        if (foundIp) {
          setIp(foundIp);
          setStatus('connecting');
        } else {
          setStatus('failed');
        }
      } catch (err) {
        setStatus('failed');
      }
    };

    if (status === 'fetching_ip') {
      fetchIp();
    }
  }, [cdConexao, status]);

  useEffect(() => {
    if (!ip || status !== 'connecting' || hasStarted.current) return;
    hasStarted.current = true;

    const tryConnect = async (portIndex: number) => {
      if (portIndex >= PORTS_TO_TRY.length) {
        setStatus('failed');
        return;
      }

      const port = PORTS_TO_TRY[portIndex];
      setCurrentPortIndex(portIndex);
      
      setLogs(prev => [...prev, { port, status: 'connecting' }]);

      const protocol = port === 443 ? 'https' : 'http';
      const url = `${protocol}://${ip}${port === 80 || port === 443 ? '' : `:${port}`}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5 seconds timeout per port
        
        // ping the router
        await fetch(url, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        
        // Se não deu erro de rede (Ex: net::ERR_CONNECTION_REFUSED), é sucesso!
        setLogs(prev => prev.map(log => log.port === port ? { ...log, status: 'success' } : log));
        setStatus('success');
        
        // Delay para o usuário conseguir ver que deu certo antes de redirecionar
        setTimeout(() => {
          window.location.href = url;
        }, 1500);
      } catch (error) {
        // Falha na conexão ou timeout
        setLogs(prev => prev.map(log => log.port === port ? { ...log, status: 'failed' } : log));
        // Testa a próxima porta com um pequeno delay visual
        setTimeout(() => {
          tryConnect(portIndex + 1);
        }, 500);
      }
    };

    tryConnect(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ip, status]);

  if (!ip && status !== 'fetching_ip') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center justify-center gap-2">
              <XCircle className="w-6 h-6" /> IP não encontrado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Não foi possível obter o IP do roteador para esta conexão.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center pb-2 border-b">
           <div className="mx-auto bg-primary/10 w-16 h-16 flex items-center justify-center rounded-full mb-4">
             <RouterIcon className="w-8 h-8 text-primary" />
           </div>
          <CardTitle className="text-xl">Acessando Roteador</CardTitle>
          {ip ? (
            <p className="text-sm text-muted-foreground mt-1">IP: {ip}</p>
          ) : (
             <p className="text-sm text-muted-foreground mt-1">Buscando IP do cliente...</p>
          )}
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          
          {status === 'fetching_ip' && (
             <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-muted/20 border rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Consultando roteador no MK Solutions...</p>
             </div>
          )}

          <div className="space-y-3">
            {logs.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border transition-all">
                <span className="text-sm font-medium">
                  {log.port === 80 || log.port === 443 ? `Conectando no IP direto (Porta ${log.port})` : `Conectando à porta ${log.port}`}
                </span>
                {log.status === 'connecting' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {log.status === 'failed' && <XCircle className="w-4 h-4 text-destructive/60" />}
              </div>
            ))}
          </div>
          
          {status === 'failed' && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center space-y-2 animate-in fade-in zoom-in duration-300">
              <XCircle className="w-8 h-8 text-destructive mx-auto" />
              <p className="font-bold text-destructive">Não foi possível conectar.</p>
              <p className="text-xs text-muted-foreground">O roteador não respondeu em nenhuma das portas testadas (80, 8080, 8888, 443). Verifique se ele está online e acessível na rede gerência.</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center space-y-2 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
              <p className="font-bold text-green-600">Conectado com sucesso!</p>
              <p className="text-xs text-muted-foreground animate-pulse">Redirecionando para a página do roteador...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
