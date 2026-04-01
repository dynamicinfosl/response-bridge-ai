import React, { useMemo } from 'react';
import { useAtendimentosEncerrados } from '@/hooks/useAtendimentosEncerrados';
import { useChats } from '@/hooks/useChats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, Clock, CheckCircle2, Bot, User, Activity, ThumbsUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const DashboardOverview = () => {
  const { data: encerrados = [], isLoading: loadingEncerrados } = useAtendimentosEncerrados();
  const { data: chats = [], isLoading: loadingChats } = useChats();

  const metrics = useMemo(() => {
    // Pendentes/Em Andamento (Busca direta da API atual do Chatwoot)
    const pendingChats = chats.filter((chat: any) => chat.status !== 'concluido' && chat.status !== 'resolved').length;
    
    // Encerrados
    const totalEncerrados = encerrados.length;
    
    // Resolução (No caso da tabela atendimentos_encerrados, todos são tratados como resolvidos 100%)
    const resolutionRate = totalEncerrados > 0 ? 100 : 0; 
    
    // IA vs Humano
    const iaCount = encerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'ia').length;
    const humanCount = encerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'humano').length;
    
    // Tempo Médio de Resposta (Média do novo campo tempo_medio_resposta_minutos)
    const totalResponseTimeRaw = encerrados.reduce((acc: number, curr: any) => acc + (curr.tempo_medio_resposta_minutos || 0), 0);
    const validResponseTimesCount = encerrados.filter((e: any) => e.tempo_medio_resposta_minutos != null).length;
    const avgResponseTime = validResponseTimesCount > 0 ? (totalResponseTimeRaw / validResponseTimesCount).toFixed(0) : 0;

    // Tempo Médio de Atendimento Geral
    const totalDurationRaw = encerrados.reduce((acc: number, curr: any) => acc + (curr.tempo_total_atendimento || 0), 0);
    const validDurationCount = encerrados.filter((e: any) => e.tempo_total_atendimento != null).length;
    const avgTotalTimeMinutes = validDurationCount > 0 ? (totalDurationRaw / validDurationCount).toFixed(0) : 0;
    
    // Satisfação
    const totalSatisfacaoRow = encerrados.reduce((acc: number, curr: any) => acc + (curr.satisfacao_cliente || 0), 0);
    const validSatisfacaoCount = encerrados.filter((e: any) => e.satisfacao_cliente != null).length;
    const avgSatisfacao = validSatisfacaoCount > 0 ? (totalSatisfacaoRow / validSatisfacaoCount).toFixed(1) : 0;

    // Calculo Eficiência (Taxa de satisfação por IA vs Humano)
    const iaSatisfacaoTotal = encerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'ia').reduce((acc: number, curr: any) => acc + (curr.satisfacao_cliente || 0), 0);
    const iaSatCount = encerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'ia' && e.satisfacao_cliente != null).length;
    const avgIaSat = iaSatCount > 0 ? (iaSatisfacaoTotal / iaSatCount).toFixed(1) : 0;

    const humSatisfacaoTotal = encerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'humano').reduce((acc: number, curr: any) => acc + (curr.satisfacao_cliente || 0), 0);
    const humSatCount = encerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'humano' && e.satisfacao_cliente != null).length;
    const avgHumSat = humSatCount > 0 ? (humSatisfacaoTotal / humSatCount).toFixed(1) : 0;


    return {
      pendingChats,
      resolutionRate,
      iaCount,
      humanCount,
      avgResponseTime,
      avgTotalTimeMinutes,
      avgSatisfacao,
      avgIaSat,
      avgHumSat
    };
  }, [encerrados, chats]);

  // Gráfico de Pizza (IA vs Humano)
  const pieData = [
    { name: 'IA', value: metrics.iaCount || 1, color: '#10b981' }, 
    { name: 'Humano', value: metrics.humanCount || 1, color: '#3b82f6' }
  ];
  const isValidPieData = metrics.iaCount > 0 || metrics.humanCount > 0;

  // Gráfico da barra (Satisfação)
  const barData = [
    { name: 'IA', satisfacao: Number(metrics.avgIaSat) },
    { name: 'Humano', satisfacao: Number(metrics.avgHumSat) },
  ];

  if (loadingEncerrados || loadingChats) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando métricas da IA...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Visão Geral em Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Atendimentos Pendentes
              <MessageSquare className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.pendingChats}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando resposta</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Duração Média
              <Clock className="w-4 h-4 text-warning" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.avgTotalTimeMinutes}m</div>
            <p className="text-xs text-muted-foreground mt-1">Tempo de atendimento total</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Tempo Méd. Resposta
              <Activity className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.avgResponseTime}m</div>
            <p className="text-xs text-muted-foreground mt-1">Estimativa métrica de respostas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Satisfação Média
              <ThumbsUp className="w-4 h-4 text-success" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.avgSatisfacao} <span className="text-xl text-muted-foreground">/ 5</span></div>
            <p className="text-xs text-muted-foreground mt-1">Média de satisfação geral (IA)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico IA vs Humano */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-5 h-5" /> Taxa de Resolução (IA x Humano)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             {!isValidPieData ? (
                <div className="text-center bg-muted/20 p-8 rounded-lg">
                   <Bot className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                   <p className="text-sm text-muted-foreground max-w-xs">Sem dados históricos de resolução IA ainda. Aguardando o webhook preencher o painel.</p>
                </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip cursor={{fill: 'transparent'}}/>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
             )}
          </CardContent>
        </Card>

        {/* Gráfico de Eficiência de Satisfação */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Eficiência vs Satisfação
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center pb-8">
            {Number(metrics.avgIaSat) === 0 && Number(metrics.avgHumSat) === 0 ? (
               <div className="text-center text-muted-foreground text-sm">Aguardando dados de satisfação avaliados pelo LLM (Gemini)...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip cursor={{fill: 'transparent'}}/>
                  <Bar dataKey="satisfacao" fill="#8884d8" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'IA' ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
