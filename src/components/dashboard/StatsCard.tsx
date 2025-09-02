import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ElementType;
  className?: string;
}

export const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon: Icon,
  className 
}: StatsCardProps) => {
  return (
    <Card className={cn("shadow-card hover:shadow-elevated transition-all duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <span className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}>
                  {trend.isPositive ? "+" : ""}{trend.value}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  vs. mês anterior
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="w-12 h-12 bg-primary-muted rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};