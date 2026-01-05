import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  severity?: "critical" | "high" | "medium" | "low" | "info" | "default";
  className?: string;
}

const severityColors = {
  critical: "text-severity-critical",
  high: "text-severity-high",
  medium: "text-severity-medium",
  low: "text-severity-low",
  info: "text-severity-info",
  default: "text-foreground",
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  severity = "default",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("relative", className)} data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", severityColors[severity])}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn(
            "text-xs mt-2 flex items-center gap-1",
            trend.direction === "up" && trend.value > 0 && "text-severity-critical",
            trend.direction === "down" && "text-severity-low",
            trend.direction === "neutral" && "text-muted-foreground"
          )}>
            {trend.direction === "up" && "+"}
            {trend.direction === "down" && "-"}
            {Math.abs(trend.value)}% from last week
          </div>
        )}
      </CardContent>
    </Card>
  );
}
