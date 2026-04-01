import { useAtendimentosEncerrados } from '@/hooks/useAtendimentosEncerrados';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText,
    MessageSquare,
    Clock,
    User,
    Phone,
    Calendar,
    CheckCircle2,
    TrendingDown,
    TrendingUp,
    ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AtendimentosEncerradosTable() {
    const { data, isLoading, error } = useAtendimentosEncerrados();

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center border border-dashed rounded-lg bg-destructive/5 text-destructive">
                <p>Erro ao carregar os atendimentos encerrados.</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="p-12 text-center border border-dashed rounded-lg bg-muted/30">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <h3 className="text-lg font-medium text-muted-foreground">Nenhum atendimento encerrado</h3>
                <p className="text-sm text-muted-foreground">Os atendimentos finalizados pelo n8n aparecerão aqui.</p>
            </div>
        );
    }

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    return (
        <div className="space-y-4">
            {data.map((atendimento) => (
                <Card key={atendimento.id} className="overflow-hidden border-l-4 border-l-success shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                        <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                            {/* Avatar/Icon Section */}
                            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-success" />
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h4 className="font-bold text-base truncate">
                                        {atendimento.nome || 'Cliente sem nome'}
                                    </h4>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-2 h-5 bg-success/5 text-success border-success/20">
                                        Resolvido
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {atendimento.encerrado_em
                                            ? format(new Date(atendimento.encerrado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                            : format(new Date(atendimento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {atendimento.telefone || 'Sem telefone'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        Agente: {atendimento.agente_responsavel || 'N/A'}
                                    </span>
                                </div>

                                {atendimento.mini_resumo && (
                                    <div className="mt-2 p-2 bg-muted/50 rounded text-sm text-[#333] italic border-l-2 border-muted leading-relaxed">
                                        "{atendimento.mini_resumo}"
                                    </div>
                                )}
                            </div>

                            {/* Stats Section */}
                            <div className="flex gap-4 md:border-l border-border md:pl-6 shrink-0 h-full">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Duração</p>
                                    <div className="flex items-center justify-center gap-1 text-primary">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-sm font-bold">{formatDuration(atendimento.tempo_total_atendimento)}</span>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Msgs</p>
                                    <div className="flex items-center justify-center gap-1 text-blue-500">
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="text-sm font-bold">{atendimento.quantidade_mensagens || 0}</span>
                                    </div>
                                </div>

                                <div className="flex items-end">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Abrir no Chatwoot (Simulado)">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
