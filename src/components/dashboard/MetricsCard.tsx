import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

interface MetricsData {
  totalAtendimentos: number;
  resolvidosIA: number;
  resolvidosHumano: number;
  tempoMedioResposta: string;
  taxaResolucao: number;
  satisfacaoMedia: number;
}

export const MetricsCard = () => {
  const metrics: MetricsData = {
    totalAtendimentos: 1248,
    resolvidosIA: 876,
    resolvidosHumano: 372,
    tempoMedioResposta: '2.4min',
    taxaResolucao: 89,
    satisfacaoMedia: 4.8
  };

  const handleExportCSV = () => {
    // Mock export functionality
    const csvData = `
Métrica,Valor,Data
Total de Atendimentos,${metrics.totalAtendimentos},${new Date().toLocaleDateString()}
Resolvidos pela IA,${metrics.resolvidosIA},${new Date().toLocaleDateString()}
Resolvidos por Humanos,${metrics.resolvidosHumano},${new Date().toLocaleDateString()}
Tempo Médio de Resposta,${metrics.tempoMedioResposta},${new Date().toLocaleDateString()}
Taxa de Resolução,${metrics.taxaResolucao}%,${new Date().toLocaleDateString()}
Satisfação Média,${metrics.satisfacaoMedia},${new Date().toLocaleDateString()}
    `;
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportPDF = () => {
    // Mock PDF export - in production, this would generate a proper PDF
    alert('Funcionalidade de PDF será implementada na próxima versão');
  };

  return (
    <Card className="shadow-card col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Relatório Detalhado
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{metrics.totalAtendimentos}</p>
            <p className="text-sm text-muted-foreground">Atendimentos Hoje</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{metrics.resolvidosIA}</p>
            <p className="text-sm text-muted-foreground">Resolvidos pela IA</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{metrics.resolvidosHumano}</p>
            <p className="text-sm text-muted-foreground">Resolvidos por Humanos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">{metrics.tempoMedioResposta}</p>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{metrics.taxaResolucao}%</p>
            <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{metrics.satisfacaoMedia}/5</p>
            <p className="text-sm text-muted-foreground">Satisfação Média</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};