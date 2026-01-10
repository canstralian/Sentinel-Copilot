import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  History,
  Bug,
  Server,
  Settings,
  Upload,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityLog } from "@shared/schema";

const actionIcons: Record<string, typeof Bug> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  imported: Upload,
  jira_created: ExternalLink,
  configured: Settings,
  bulk_updated: Edit,
};

const entityIcons: Record<string, typeof Bug> = {
  vulnerability: Bug,
  asset: Server,
  jira_config: Settings,
  import: Upload,
};

export default function Activity() {
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity?limit=100"],
  });

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Activity Log"
        description="Track all changes and actions in the system"
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="divide-y">
              {logs.map((log) => {
                const ActionIcon = actionIcons[log.action] || Edit;
                const EntityIcon = entityIcons[log.entityType] || Bug;
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 hover-elevate"
                    data-testid={`activity-log-${log.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <EntityIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {log.entityType.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className="capitalize text-xs">
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        {log.userName && ` by ${log.userName}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No activity yet</h3>
              <p className="text-sm text-muted-foreground">
                Actions will appear here as you use the system
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
