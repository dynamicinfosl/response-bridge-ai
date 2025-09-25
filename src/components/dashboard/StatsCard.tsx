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
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
              {title}
            </p>
            <p className="text-lg sm:text-xl lg:text-3xl font-bold text-foreground">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center mt-1 sm:mt-2">
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}>
                  {trend.isPositive ? "+" : ""}{trend.value}
                </span>
                <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                  vs. mês anterior
                </span>
              </div>
            )}
          </div>
          <div className="ml-2 sm:ml-4 flex-shrink-0">
            <div className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 bg-primary-muted rounded-lg flex items-center justify-center">
              <Icon className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};