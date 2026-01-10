import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { SeverityBadge } from "@/components/severity-badge";
import {
  Bug,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Server,
} from "lucide-react";
import type { DashboardMetrics, Vulnerability } from "@shared/schema";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: recentVulns, isLoading: vulnsLoading } = useQuery<{ vulnerabilities: Vulnerability[] }>({
    queryKey: ["/api/vulnerabilities?limit=5&status=open"],
  });

  const totalOpen = metrics?.openVulnerabilities || 0;
  const criticalHigh = (metrics?.criticalVulns || 0) + (metrics?.highVulns || 0);
  const urgencyPercent = totalOpen > 0 ? Math.round((criticalHigh / totalOpen) * 100) : 0;

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Vulnerability management overview"
        actions={
          <Link href="/vulnerabilities">
            <Button data-testid="button-view-all-vulns">
              View All Vulnerabilities
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {metricsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Open Vulnerabilities"
              value={metrics?.openVulnerabilities || 0}
              description={`${metrics?.totalVulnerabilities || 0} total`}
              icon={Bug}
              severity={metrics?.openVulnerabilities && metrics.openVulnerabilities > 0 ? "medium" : "default"}
            />
            <MetricCard
              title="Critical / High"
              value={criticalHigh}
              description="Requires immediate attention"
              icon={AlertTriangle}
              severity={criticalHigh > 0 ? "critical" : "default"}
            />
            <MetricCard
              title="Resolved This Week"
              value={metrics?.resolvedThisWeek || 0}
              description="Great progress!"
              icon={CheckCircle}
            />
            <MetricCard
              title="With Jira Tickets"
              value={metrics?.vulnsWithJira || 0}
              description="Tracked in Jira"
              icon={ExternalLink}
            />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-semibold">
              Severity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <SeverityRow 
                  severity="critical" 
                  count={metrics?.criticalVulns || 0} 
                  total={totalOpen}
                />
                <SeverityRow 
                  severity="high" 
                  count={metrics?.highVulns || 0} 
                  total={totalOpen}
                />
                <SeverityRow 
                  severity="medium" 
                  count={metrics?.mediumVulns || 0} 
                  total={totalOpen}
                />
                <SeverityRow 
                  severity="low" 
                  count={metrics?.lowVulns || 0} 
                  total={totalOpen}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              Urgency Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metricsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <div className="relative h-32 w-32">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        className="stroke-muted"
                        strokeWidth="10"
                        fill="none"
                        cx="50"
                        cy="50"
                        r="40"
                      />
                      <circle
                        className={urgencyPercent > 50 ? "stroke-destructive" : urgencyPercent > 25 ? "stroke-orange-500" : "stroke-primary"}
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                        cx="50"
                        cy="50"
                        r="40"
                        strokeDasharray={`${urgencyPercent * 2.51} 251`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{urgencyPercent}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  of open vulnerabilities are Critical or High severity
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-semibold">
              Recent Open Vulnerabilities
            </CardTitle>
            <Link href="/vulnerabilities?status=open">
              <Button variant="ghost" size="sm" data-testid="link-view-open-vulns">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {vulnsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : recentVulns?.vulnerabilities && recentVulns.vulnerabilities.length > 0 ? (
              <div className="space-y-3">
                {recentVulns.vulnerabilities.map((vuln) => (
                  <Link key={vuln.id} href={`/vulnerabilities?id=${vuln.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer" data-testid={`vuln-row-${vuln.id}`}>
                      <SeverityBadge severity={vuln.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{vuln.title}</p>
                        {vuln.assetName && (
                          <p className="text-xs text-muted-foreground truncate">{vuln.assetName}</p>
                        )}
                      </div>
                      {vuln.jiraKey && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {vuln.jiraKey}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No open vulnerabilities</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-semibold">
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Assets</span>
                  </div>
                  <span className="font-semibold">{metrics?.totalAssets || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Overdue</span>
                  </div>
                  <Badge variant={metrics?.overdueVulns ? "destructive" : "secondary"}>
                    {metrics?.overdueVulns || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Resolution Rate</span>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {metrics?.resolvedThisWeek || 0}/week
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SeverityRow({ severity, count, total }: { severity: string; count: number; total: number }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  const colorClasses: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
    info: "bg-gray-400",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={severity} />
        </div>
        <span className="text-sm font-medium">{count}</span>
      </div>
      <Progress 
        value={percentage} 
        className="h-2"
        indicatorClassName={colorClasses[severity] || "bg-primary"}
      />
    </div>
  );
}
