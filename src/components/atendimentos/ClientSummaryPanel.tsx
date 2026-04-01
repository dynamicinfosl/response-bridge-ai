import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, User, FileText, FileStack, Wifi, Loader2 } from 'lucide-react';
import { useClienteResumo } from '@/hooks/useMK';
import type { MKClienteDoc } from '@/lib/mk-api';
import { cn } from '@/lib/utils';

interface ClientSummaryPanelProps {
  open: boolean;
  onClose: () => void;
  /** Cliente encontrado (por doc ou nome) */
  cliente: MKClienteDoc | null;
  /** Código do cliente no MK */
  cdCliente: string | null;
}

export function ClientSummaryPanel({ open, onClose, cliente, cdCliente }: ClientSummaryPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const { data, isLoading, error } = useClienteResumo(cdCliente, cliente, open && !!cdCliente);

  if (!open) return null;

  const nome = cliente?.nome ?? (cliente as any)?.name ?? 'Cliente';
  const doc = cliente?.doc ?? (cliente as any)?.documento ?? '';

  return (
    <Card
      className={cn(
        'fixed bottom-4 right-4 z-30 flex flex-col shadow-xl border-2 border-primary/20 bg-card',
        'resize overflow-hidden',
        minimized ? 'w-64 h-auto' : 'min-w-[320px] max-w-[420px] min-h-[200px] max-h-[80vh]'
      )}
      style={minimized ? undefined : { width: 360, height: 420 }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-sm truncate">Resumo MK · {nome || cdCliente || '—'}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMinimized(!minimized)}>
            {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!minimized && (
        <CardContent className="flex-1 overflow-y-auto p-3 text-sm">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <p className="text-destructive text-xs py-2">{String(error)}</p>
          )}
          {!isLoading && !error && data && (
            <div className="space-y-4">
              <div>
                <p className="font-medium text-foreground">{nome || '—'}</p>
                <p className="text-muted-foreground text-xs">Código: {String(cdCliente || '—')}</p>
                {doc && <p className="text-muted-foreground text-xs">Doc: {doc}</p>}
              </div>

              {data.faturas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-foreground font-medium mb-1">
                    <FileText className="w-4 h-4" />
                    Faturas pendentes ({data.faturas.length})
                  </div>
                  <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
                    {data.faturas.slice(0, 5).map((f: any, i: number) => (
                      <li key={i}>{f.cd_fatura ?? f.codigo ?? JSON.stringify(f)}</li>
                    ))}
                    {data.faturas.length > 5 && <li>… +{data.faturas.length - 5} mais</li>}
                  </ul>
                </div>
              )}

              {data.contratos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-foreground font-medium mb-1">
                    <FileStack className="w-4 h-4" />
                    Contratos ({data.contratos.length})
                  </div>
                  <p className="text-muted-foreground text-xs">Ver detalhes no MK.</p>
                </div>
              )}

              {data.conexoes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-foreground font-medium mb-1">
                    <Wifi className="w-4 h-4" />
                    Conexões ({data.conexoes.length})
                  </div>
                  <p className="text-muted-foreground text-xs">Ver detalhes no MK.</p>
                </div>
              )}

              {!data.faturas.length && !data.contratos.length && !data.conexoes.length && (
                <p className="text-muted-foreground text-xs">Nenhuma fatura, contrato ou conexão listada.</p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
