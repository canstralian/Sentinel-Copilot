import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity } from "@shared/schema";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const severityConfig: Record<Severity, { label: string; className: string }> = {
  critical: {
    label: "Critical",
    className: "bg-severity-critical text-white dark:text-white",
  },
  high: {
    label: "High",
    className: "bg-severity-high text-white dark:text-slate-900",
  },
  medium: {
    label: "Medium",
    className: "bg-severity-medium text-slate-900 dark:text-slate-900",
  },
  low: {
    label: "Low",
    className: "bg-severity-low text-white dark:text-slate-900",
  },
  info: {
    label: "Info",
    className: "bg-severity-info text-white dark:text-white",
  },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity];

  return (
    <Badge 
      className={cn("font-medium", config.className, className)}
      data-testid={`badge-severity-${severity}`}
    >
      {config.label}
    </Badge>
  );
}
