import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  CheckCircle, 
  TrendingUp, 
  AlertTriangle, 
  UploadCloud 
} from 'lucide-react';

interface InsightItem {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  iconColor: string;
  iconBgColor: string;
}

export const InsightsCard = () => {
  const insights: InsightItem[] = [
    {
      icon: CheckCircle,
      title: "70% de economia de tempo",
      description: "A IA está resolvendo atendimentos 70% mais rápido que humanos em média.",
      iconColor: "text-white",
      iconBgColor: "bg-primary"
    },
    {
      icon: TrendingUp,
      title: "Aumento de 18% na resolução por IA",
      description: "Comparado ao mês anterior, mais casos estão sendo resolvidos sem intervenção humana.",
      iconColor: "text-white",
      iconBgColor: "bg-primary"
    },
    {
      icon: AlertTriangle,
      title: "Pico de atendimentos às 14h",
      description: "Considere reforçar a equipe neste horário para melhor atendimento.",
      iconColor: "text-white",
      iconBgColor: "bg-primary"
    },
    {
      icon: UploadCloud,
      title: "Sugestão de melhoria",
      description: "Treinar a IA para lidar melhor com reclamações sobre entregas atrasadas.",
      iconColor: "text-white",
      iconBgColor: "bg-primary"
    }
  ];

  const handleViewAllInsights = () => {
    // Mock functionality - in production this would navigate to insights page
    console.log('Navegando para todos os insights...');
  };

  return (
    <Card className="shadow-card bg-gradient-to-b from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <span className="text-foreground font-bold">Insights do Sistema</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4 mb-6">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${insight.iconBgColor} flex items-center justify-center flex-shrink-0 mt-1`}>
                  <IconComponent className={`w-4 h-4 ${insight.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-base mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <Button 
          onClick={handleViewAllInsights}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 text-base"
        >
          Ver todos os insights
        </Button>
      </CardContent>
    </Card>
  );
};
