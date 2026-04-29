import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Router as RouterIcon, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { consultaConexaoAutenticada } from '@/lib/mk-api';

const PORTS_TO_TRY = [80, 8080, 8090, 8888, 8000, 9090, 443];
const IPV4_REGEX = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(?:\/\d+)?\b/;

/** Campos que contêm o IP do roteador/cliente — em ordem de prioridade */
const FRAMED_IP_KEYS = [
  'framedipaddress',
  'framedip',
  'framed_ip',
  'framed_ip_address',
  'frameip',
  'frame_ip',
  'ip_conexao',
  'conexao_ip',
  'ip_atribuido',
  'ip_atrib',
  'ipaddr',
  'ip_address',
  'ipaddress',
  'ip'
];

/** Campos que geralmente contêm IPs de infraestrutura (NAS, gateway, concentrador) — ignorar na varredura geral */
const INFRA_IP_KEYS = [
  'nasipaddress',
  'nasip',
  'nas_ip',
  'nas_ip_address',
  'nas_ipaddress',
  'ip_nas',
  'ipnas',
  'nas_identifier',
  'nas_id',
  'concentrador',
  'concentrador_ip',
  'ip_concentrador',
  'radius_ip',
  'radiusip',
  'server_ip',
  'serverip',
  'gateway',
  'gatewayip',
  'gateway_ip'
];

function cleanIp(raw: string): string {
  return raw.includes('/') ? raw.substring(0, raw.indexOf('/')) : raw;
}

function extractIpFromString(text: string): string {
  const match = String(text).match(IPV4_REGEX);
  if (match) {
    const ip = cleanIp(match[0]);
    if (ip !== '0.0.0.0') return ip;
  }
  return '';
}

/** Busca IP priorizando campos framedip; ignora campos de infra; varredura geral apenas como fallback */
function extractRouterIp(value: any, depth = 0): string {
  if (!value || depth > 6) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        const ip = extractRouterIp(parsed, depth + 1);
        if (ip) return ip;
      } catch (e) {
        // Ignora erro de parse
      }
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return extractIpFromString(String(value));
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const ip = extractRouterIp(item, depth + 1);
      if (ip) return ip;
    }
    return '';
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);

    // 1ª prioridade: campos framedip (IP do cliente)
    for (const candidate of FRAMED_IP_KEYS) {
      const found = keys.find((k) => k.toLowerCase() === candidate);
      if (found && value[found]) {
        const ip = extractIpFromString(String(value[found]));
        if (ip) return ip;
      }
    }

    // 2ª prioridade: recursão em sub-objetos/arrays, excluindo campos de infra
    for (const key of keys) {
      if (INFRA_IP_KEYS.includes(key.toLowerCase())) continue;
      const child = value[key];
      if (child && typeof child === 'object') {
        const ip = extractRouterIp(child, depth + 1);
        if (ip) return ip;
      }
    }

    // 3º: varredura geral em strings (ainda ignorando campos de infra)
    for (const key of keys) {
      if (INFRA_IP_KEYS.includes(key.toLowerCase())) continue;
      const child = value[key];
      if (typeof child === 'string' || typeof child === 'number') {
        const ip = extractIpFromString(String(child));
        if (ip) return ip;
      }
    }
  }

  return '';
}

export default function RouterAccess() {
  const [searchParams] = useSearchParams();
  const rawIp = searchParams.get('ip');
  const cleanedRawIp = rawIp ? extractIpFromString(rawIp) || rawIp : null;
  const cdConexao = searchParams.get('cd_conexao');
  
  const [ip, setIp] = useState<string | null>(cleanedRawIp);
  const [currentPortIndex, setCurrentPortIndex] = useState(0);
  const [status, setStatus] = useState<'fetching_ip' | 'connecting' | 'success' | 'failed'>(cdConexao && !cleanedRawIp ? 'fetching_ip' : 'connecting');
  const [logs, setLogs] = useState<{ port: number; status: 'connecting' | 'failed' | 'success' }[]>([]);
  const hasStarted = useRef(false);

  useEffect(() => {
    const fetchIp = async () => {
      if (!cdConexao) return;
      try {
        const res = await consultaConexaoAutenticada(cdConexao);
        console.log('[RouterAccess] Resposta da API MK:', JSON.stringify(res));
        const foundIp = extractRouterIp(res);
        console.log('[RouterAccess] IP extraído:', foundIp);

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
              <p className="text-xs text-muted-foreground">O roteador não respondeu em nenhuma das portas testadas (80, 8080, 8090, 8888, 8000, 9090, 443). Verifique se ele está online e acessível na rede gerência.</p>
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
