import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "open" | "in_progress" | "remediated" | "accepted" | "false_positive" | "active" | "expired" | "pending" | "revoked";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-severity-critical/10 text-severity-critical border border-severity-critical/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-severity-medium/10 text-severity-medium border border-severity-medium/20",
  },
  remediated: {
    label: "Remediated",
    className: "bg-severity-low/10 text-severity-low border border-severity-low/20",
  },
  accepted: {
    label: "Accepted",
    className: "bg-muted text-muted-foreground border border-border",
  },
  false_positive: {
    label: "False Positive",
    className: "bg-muted text-muted-foreground border border-border",
  },
  active: {
    label: "Active",
    className: "bg-severity-low/10 text-severity-low border border-severity-low/20",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground border border-border",
  },
  pending: {
    label: "Pending",
    className: "bg-severity-medium/10 text-severity-medium border border-severity-medium/20",
  },
  revoked: {
    label: "Revoked",
    className: "bg-severity-critical/10 text-severity-critical border border-severity-critical/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge 
      variant="outline"
      className={cn("font-medium", config.className, className)}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
