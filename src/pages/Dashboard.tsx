import { useState, useMemo } from 'react';
import { useAtendimentosEncerrados } from '@/hooks/useAtendimentosEncerrados';
import { useChats } from '@/hooks/useChats';
import { usePesquisasSatisfacao } from '@/hooks/usePesquisasSatisfacao';
import { Layout } from '@/components/layout/Layout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  Clock, 
  CheckCircle, 
  TrendingUp,
  MessageCircle,
  RefreshCw,
  Calendar,
  Bot,
  ChevronDown,
  ThumbsUp
} from 'lucide-react';

// Helpers
const fmtSec = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
};

const PIE_COLORS = ['#1E62C4', '#4A90E2', '#7BB3F0', '#A8D4FF', '#B0C4DE', '#6699CC'];

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [efficiencyChartPeriod, setEfficiencyChartPeriod] = useState('30');

  const { data: encerrados = [], isLoading: loadingEncerrados } = useAtendimentosEncerrados();
  const { data: chats = [], isLoading: loadingChats } = useChats();
  const { data: pesquisas = [], isLoading: loadingPesquisas } = usePesquisasSatisfacao();

  // --- Filtrar por período selecionado ---
  const periodoEncerrados = useMemo(() => {
    const days = Number(selectedPeriod);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return encerrados.filter((e: any) => {
      const d = e.encerrado_em || e.created_at;
      return d && new Date(d) >= cutoff;
    });
  }, [encerrados, selectedPeriod]);

  // --- Métricas principais ---
  const metrics = useMemo(() => {
    const pendingChats = chats.filter((chat: any) =>
      chat.status !== 'concluido' &&
      chat.status !== 'resolved' &&
      chat.labels?.includes('precisa_atendimento')
    ).length;

    const total = periodoEncerrados.length;
    const iaCount = periodoEncerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'ia').length;
    const humanCount = periodoEncerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === 'humano').length;
    const iaPercent = total > 0 ? Math.round((iaCount / total) * 100) : 0;

    const validResp = periodoEncerrados.filter((e: any) => e.tempo_medio_resposta_minutos != null && e.tempo_medio_resposta_minutos > 0);
    const avgResponseMin = validResp.length > 0
      ? validResp.reduce((a: number, e: any) => a + e.tempo_medio_resposta_minutos, 0) / validResp.length
      : 0;

    const validTotal = periodoEncerrados.filter((e: any) => e.tempo_total_atendimento != null && e.tempo_total_atendimento > 0);
    const avgTotalSec = validTotal.length > 0
      ? validTotal.reduce((a: number, e: any) => a + e.tempo_total_atendimento, 0) / validTotal.length
      : 0;

    const pesquisasRespondidas = pesquisas.filter((p: any) => p.status === 'respondida' && p.nota != null);
    const avgSatisfacao = pesquisasRespondidas.length > 0
      ? (pesquisasRespondidas.reduce((a: number, p: any) => a + Number(p.nota || 0), 0) / pesquisasRespondidas.length).toFixed(1)
      : '0.0';

    return { pendingChats, total, iaCount, humanCount, iaPercent, avgResponseMin, avgTotalSec, avgSatisfacao, pesquisasRespondidas: pesquisasRespondidas.length };
  }, [periodoEncerrados, chats, pesquisas]);

  // --- Gráfico: Eficiência IA vs Humano por dia ---
  const efficiencyChartData = useMemo(() => {
    const days = Number(efficiencyChartPeriod);
    const map: Record<string, { dia: string; ia: number; humano: number }> = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    encerrados.forEach((e: any) => {
      const d = e.encerrado_em || e.created_at;
      if (!d || new Date(d) < cutoff) return;
      const dia = new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!map[dia]) map[dia] = { dia, ia: 0, humano: 0 };
      if (e.resolvido_por?.toLowerCase() === 'ia') map[dia].ia++;
      else if (e.resolvido_por?.toLowerCase() === 'humano') map[dia].humano++;
    });

    return Object.values(map).sort((a, b) => {
      const [ad, am] = a.dia.split('/').map(Number);
      const [bd, bm] = b.dia.split('/').map(Number);
      return am !== bm ? am - bm : ad - bd;
    });
  }, [encerrados, efficiencyChartPeriod]);

  // --- Gráfico: IA vs Humano (pizza) ---
  const iaHumanoPieData = useMemo(() => {
    if (metrics.iaCount === 0 && metrics.humanCount === 0) return [];
    return [
      { name: 'IA', value: metrics.iaCount, color: '#10b981' },
      { name: 'Humano', value: metrics.humanCount, color: '#3b82f6' },
    ];
  }, [metrics.iaCount, metrics.humanCount]);

  // --- Gráfico: Distribuição por motivo de contato ---
  const motivoPieData = useMemo(() => {
    const map: Record<string, number> = {};
    periodoEncerrados.forEach((e: any) => {
      const m = e.motivo_contato?.trim() || 'Outros';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [periodoEncerrados]);

  // --- Tabela: Tempo médio por resolvido_por ---
  const avgTimeRows = useMemo(() => {
    const calcAvg = (tipo: string) => {
      const items = periodoEncerrados.filter((e: any) => e.resolvido_por?.toLowerCase() === tipo && e.tempo_total_atendimento > 0);
      return items.length > 0 ? items.reduce((a: number, e: any) => a + e.tempo_total_atendimento, 0) / items.length : 0;
    };
    const iaAvg = calcAvg('ia');
    const humAvg = calcAvg('humano');
    const diff = humAvg - iaAvg;
    const savings = humAvg > 0 ? Math.round((diff / humAvg) * 100) : 0;
    return { iaAvg, humAvg, diff, savings };
  }, [periodoEncerrados]);

  // --- Insights dinâmicos ---
  const insights = useMemo(() => {
    const list = [];
    if (metrics.total > 0) {
      list.push({ icon: CheckCircle, title: `${metrics.total} atendimentos no período`, description: `${metrics.iaPercent}% resolvidos pela IA, ${100 - metrics.iaPercent}% por humanos.` });
    }
    if (metrics.avgResponseMin > 0) {
      const respStr = metrics.avgResponseMin < 1 ? `${Math.round(metrics.avgResponseMin * 60)}s` : `${metrics.avgResponseMin.toFixed(1)}min`;
      list.push({ icon: TrendingUp, title: `Tempo médio de resposta: ${respStr}`, description: metrics.avgResponseMin <= 3 ? 'Dentro da meta de 3 minutos.' : 'Acima da meta de 3 minutos. Revise os fluxos.' });
    }
    if (avgTimeRows.savings > 0) {
      list.push({ icon: Bot, title: `IA ${avgTimeRows.savings}% mais rápida que humanos`, description: `Economia média de ${fmtSec(avgTimeRows.diff)} por atendimento.` });
    }
    list.push({ icon: Clock, title: 'Monitoramento ativo', description: 'Analisando padrões de atendimento em tempo real.' });
    return list.slice(0, 4);
  }, [metrics, avgTimeRows]);

  const handleRefresh = () => window.location.reload();

  const statsData = [
    {
      title: 'Atendimentos Pendentes',
      value: loadingChats ? '...' : String(metrics.pendingChats),
      subtitle: 'Aguardando atendente',
      trend: { value: '0%', isPositive: true },
      icon: Clock
    },
    {
      title: 'Tempo Médio de Resposta',
      value: loadingEncerrados ? '...' : (metrics.avgResponseMin > 0 ? `${metrics.avgResponseMin.toFixed(1)}min` : '—'),
      subtitle: 'Meta: < 3min',
      trend: { value: '0%', isPositive: metrics.avgResponseMin <= 3 },
      icon: TrendingUp
    },
    {
      title: 'Resolvidos pela IA',
      value: loadingEncerrados ? '...' : `${metrics.iaPercent}%`,
      subtitle: `${metrics.iaCount} de ${metrics.total} atendimentos`,
      trend: { value: '0%', isPositive: true },
      icon: CheckCircle
    },
    {
      title: 'Satisfação Média',
      value: loadingPesquisas ? '...' : `${metrics.avgSatisfacao}/10`,
      subtitle: `${metrics.pesquisasRespondidas} respostas recebidas`,
      trend: { value: '0%', isPositive: true },
      icon: ThumbsUp
    }
  ];

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard - Visão Geral</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Visão geral dos atendimentos e métricas</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1.5">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Período:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32 border-0 shadow-none focus:ring-0 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleRefresh} className="flex items-center gap-1.5 h-7 px-2 text-xs">
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsData.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Gráficos linha 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* IA vs Humano por dia */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg sm:text-xl">Eficiência da IA vs Humano</span>
                <div className="flex gap-1">
                  {['7', '30', '90'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setEfficiencyChartPeriod(p)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${efficiencyChartPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                      {p} dias
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {efficiencyChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={efficiencyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ia" name="Resolvidos pela IA" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="humano" name="Resolvidos por Humanos" stroke="#60a5fa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pizza IA vs Humano */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Distribuição IA vs Humano</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {iaHumanoPieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={iaHumanoPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {iaHumanoPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} atendimentos`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tempo Médio e Insights */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Tabela Tempo Médio */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg sm:text-xl">Tempo Médio de Atendimento</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Todos os canais</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">IA (média)</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Humano (média)</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Diferença</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">WhatsApp</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{avgTimeRows.iaAvg > 0 ? fmtSec(avgTimeRows.iaAvg) : '—'}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{avgTimeRows.humAvg > 0 ? fmtSec(avgTimeRows.humAvg) : '—'}</td>
                      <td className={`py-3 px-2 text-sm font-medium ${avgTimeRows.diff > 0 ? 'text-success' : 'text-muted-foreground'}`}>{avgTimeRows.diff > 0 ? fmtSec(avgTimeRows.diff) : '—'}</td>
                      <td className={`py-3 px-2 text-sm font-medium ${avgTimeRows.savings > 0 ? 'text-success' : 'text-muted-foreground'}`}>{avgTimeRows.savings > 0 ? `${avgTimeRows.savings}%` : '—'}</td>
                    </tr>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td className="py-3 px-2 text-sm font-semibold">Média Total</td>
                      <td className="py-3 px-2 text-sm font-semibold">{avgTimeRows.iaAvg > 0 ? fmtSec(avgTimeRows.iaAvg) : '—'}</td>
                      <td className="py-3 px-2 text-sm font-semibold">{avgTimeRows.humAvg > 0 ? fmtSec(avgTimeRows.humAvg) : '—'}</td>
                      <td className={`py-3 px-2 text-sm font-semibold ${avgTimeRows.diff > 0 ? 'text-success' : 'text-muted-foreground'}`}>{avgTimeRows.diff > 0 ? fmtSec(avgTimeRows.diff) : '—'}</td>
                      <td className={`py-3 px-2 text-sm font-semibold ${avgTimeRows.savings > 0 ? 'text-success' : 'text-muted-foreground'}`}>{avgTimeRows.savings > 0 ? `${avgTimeRows.savings}%` : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Insights dinâmicos */}
          <Card className="shadow-card bg-primary/5 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <span>Insights do Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {insights.map((insight, index) => {
                  const Icon = insight.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white/50 rounded-lg border border-primary/10">
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground mb-1">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Ver todos os insights
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição por Motivo e Barras de Atendimentos */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Pizza motivo de contato */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Distribuição por Motivo de Contato</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {motivoPieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={motivoPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={true}>
                      {motivoPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [`${v} atendimentos`, name]} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Barras: Atendimentos por dia (IA vs Humano) */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Atendimentos por Dia</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {efficiencyChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={efficiencyChartData.slice(-14)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ia" name="IA" fill="#2563eb" radius={[2, 2, 0, 0]} stackId="a" />
                    <Bar dataKey="humano" name="Humano" fill="#60a5fa" radius={[2, 2, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;