import { useAuditLogs, AuditLog } from '@/hooks/useAuditLogs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Activity,
    User,
    Clock,
    Shield,
    Database,
    Info,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AuditLogsTable() {
    const { data, isLoading, error } = useAuditLogs();
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center border border-dashed rounded-lg bg-destructive/5 text-destructive">
                <p>Erro ao carregar os logs de auditoria.</p>
                <p className="text-xs mt-2 opacity-70">{error.message || 'Erro desconhecido'}</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="p-12 text-center border border-dashed rounded-lg bg-muted/30">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <h3 className="text-lg font-medium text-muted-foreground">Nenhum log encontrado</h3>
                <p className="text-sm text-muted-foreground">As ações do sistema aparecerão aqui em tempo real.</p>
            </div>
        );
    }

    const getActionBadge = (action: string) => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('login')) return { label: 'Login', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        if (actionLower.includes('create') || actionLower.includes('insert')) return { label: 'Criação', color: 'bg-green-100 text-green-700 border-green-200' };
        if (actionLower.includes('update')) return { label: 'Atualização', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        if (actionLower.includes('delete') || actionLower.includes('remove')) return { label: 'Exclusão', color: 'bg-red-100 text-red-700 border-red-200' };
        if (actionLower.includes('chat_close')) return { label: 'Encerramento', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        if (actionLower.includes('chat_transfer')) return { label: 'Transferência', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        if (actionLower.includes('intervene')) return { label: 'Intervenção', color: 'bg-orange-100 text-orange-700 border-orange-200' };
        return { label: action, color: 'bg-muted text-muted-foreground border-border' };
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'auth': return <Shield className="w-4 h-4" />;
            case 'chat': return <Activity className="w-4 h-4" />;
            case 'admin': return <Database className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <div className="flex-[2]">Ação / Usuário</div>
                <div className="flex-1 hidden md:block">Categoria</div>
                <div className="flex-1 text-right">Data / Hora</div>
            </div>
            
            {data.map((log) => {
                const actionInfo = getActionBadge(log.action);
                const isExpanded = expandedLog === log.id;

                return (
                    <Card key={log.id} className={cn(
                        "overflow-hidden transition-all duration-200 border-border/50",
                        isExpanded ? "ring-1 ring-primary/20 shadow-md" : "hover:shadow-sm"
                    )}>
                        <CardContent className="p-0">
                            <div 
                                className="p-3 flex items-center gap-4 cursor-pointer hover:bg-muted/30"
                                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            >
                                {/* Action Icon */}
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                    actionInfo.color
                                )}>
                                    {getCategoryIcon(log.category)}
                                </div>

                                {/* Info Section */}
                                <div className="flex-[2] min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-xs truncate">
                                            {log.action}
                                        </span>
                                        <Badge variant="outline" className={cn("text-[9px] uppercase font-bold py-0 h-4", actionInfo.color)}>
                                            {actionInfo.label}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <User className="w-3 h-3" />
                                        <span className="truncate">{log.user_email || 'Usuário Desconhecido'}</span>
                                        <span className="opacity-50">•</span>
                                        <span className="capitalize">{log.user_role || 'user'}</span>
                                    </div>
                                </div>

                                {/* Category Section (Desktop) */}
                                <div className="flex-1 hidden md:flex items-center gap-2">
                                    <Badge variant="secondary" className="text-[10px] font-medium bg-muted/50">
                                        {log.category}
                                    </Badge>
                                </div>

                                {/* Date Section */}
                                <div className="flex-1 text-right shrink-0">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1 text-[11px] font-medium">
                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                            {format(new Date(log.created_at), "HH:mm:ss")}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {format(new Date(log.created_at), "dd/MM/yyyy")}
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 text-muted-foreground ml-2">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>

                            {/* Details Expanded Section */}
                            {isExpanded && (
                                <div className="px-3 pb-3 pt-0 border-t border-border/50 bg-muted/20 animate-in slide-in-from-top-1 duration-200">
                                    <div className="mt-3 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    <Info className="w-3 h-3" /> Detalhes da Ação
                                                </h5>
                                                <div className="bg-background rounded-md p-2 border border-border/50 text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> Metadados de Segurança
                                                </h5>
                                                <div className="bg-background rounded-md p-2 border border-border/50 text-[11px] space-y-1">
                                                    <p><span className="text-muted-foreground">IP:</span> {log.ip_address || 'N/A'}</p>
                                                    <p className="truncate" title={log.user_agent}><span className="text-muted-foreground">User Agent:</span> {log.user_agent || 'N/A'}</p>
                                                    <p><span className="text-muted-foreground">Recurso ID:</span> {log.resource_id || 'N/A'}</p>
                                                    <p><span className="text-muted-foreground">Setor:</span> {log.user_area || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
