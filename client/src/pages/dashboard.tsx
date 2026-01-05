import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Bug,
  Server,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardMetrics, Vulnerability, Authorization, ActionLog } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: recentVulns, isLoading: vulnsLoading } = useQuery<Vulnerability[]>({
    queryKey: ["/api/vulnerabilities", { limit: 5 }],
  });

  const { data: recentActions, isLoading: actionsLoading } = useQuery<ActionLog[]>({
    queryKey: ["/api/actions", { limit: 5 }],
  });

  const { data: authorizations, isLoading: authsLoading } = useQuery<Authorization[]>({
    queryKey: ["/api/authorizations"],
  });

  const activeAuths = authorizations?.filter(a => a.status === "active") || [];

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Security Dashboard"
        description="Overview of your security posture, vulnerabilities, and compliance status"
        actions={
          <>
            <Button variant="outline" size="sm" data-testid="button-export-report">
              <ExternalLink className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button size="sm" data-testid="button-run-scan">
              <Activity className="h-4 w-4 mr-2" />
              Run Scan
            </Button>
          </>
        }
      />

      {/* Metrics Grid */}
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
              title="Total Assets"
              value={metrics?.totalAssets || 0}
              description={`${metrics?.inScopeAssets || 0} in scope`}
              icon={Server}
            />
            <MetricCard
              title="Open Vulnerabilities"
              value={metrics?.openFindings || 0}
              severity={metrics && metrics.criticalVulns > 0 ? "critical" : "default"}
              icon={Bug}
              trend={{ value: 12, direction: "down" }}
            />
            <MetricCard
              title="Active Authorizations"
              value={metrics?.activeAuthorizations || 0}
              icon={FileCheck}
            />
            <MetricCard
              title="Pending Approvals"
              value={metrics?.pendingApprovals || 0}
              severity={metrics && metrics.pendingApprovals > 0 ? "medium" : "default"}
              icon={Clock}
            />
          </>
        )}
      </div>

      {/* Severity Breakdown + Controls Coverage */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-semibold">
              Vulnerability Severity Breakdown
            </CardTitle>
            <Link href="/vulnerabilities">
              <Button variant="ghost" size="sm" data-testid="link-view-all-vulns">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
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
                  label="Critical" 
                  count={metrics?.criticalVulns || 0} 
                  total={metrics?.totalVulnerabilities || 1}
                  color="bg-severity-critical"
                />
                <SeverityRow 
                  label="High" 
                  count={metrics?.highVulns || 0} 
                  total={metrics?.totalVulnerabilities || 1}
                  color="bg-severity-high"
                />
                <SeverityRow 
                  label="Medium" 
                  count={metrics?.mediumVulns || 0} 
                  total={metrics?.totalVulnerabilities || 1}
                  color="bg-severity-medium"
                />
                <SeverityRow 
                  label="Low" 
                  count={metrics?.lowVulns || 0} 
                  total={metrics?.totalVulnerabilities || 1}
                  color="bg-severity-low"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Controls Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {metricsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle
                        className="text-muted"
                        strokeWidth="12"
                        stroke="currentColor"
                        fill="transparent"
                        r="54"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className="text-severity-low"
                        strokeWidth="12"
                        strokeDasharray={`${(metrics?.controlsCoverage || 0) * 3.39} 339.29`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="54"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold" data-testid="text-controls-coverage">
                        {metrics?.controlsCoverage || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-semibold text-foreground">NIST</div>
                    <div className="text-muted-foreground">78%</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">ISO 27001</div>
                    <div className="text-muted-foreground">82%</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">CIS</div>
                    <div className="text-muted-foreground">71%</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Vulnerabilities + Active Authorizations */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bug className="h-4 w-4 text-muted-foreground" />
              Recent Vulnerabilities
            </CardTitle>
            <Link href="/vulnerabilities">
              <Button variant="ghost" size="sm" data-testid="link-view-all-vulns-2">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {vulnsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentVulns && recentVulns.length > 0 ? (
              <div className="space-y-3">
                {recentVulns.slice(0, 5).map((vuln) => (
                  <div
                    key={vuln.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/30 hover-elevate"
                    data-testid={`vuln-item-${vuln.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {vuln.vulnClass}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{vuln.cwe}</span>
                        <span className="truncate">{vuln.assetType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <SeverityBadge severity={vuln.severity} />
                      <StatusBadge status={vuln.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-8 w-8 text-severity-low mb-2" />
                <p className="text-sm text-muted-foreground">No vulnerabilities found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              Active Authorizations
            </CardTitle>
            <Link href="/authorizations">
              <Button variant="ghost" size="sm" data-testid="link-view-all-auths">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {authsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activeAuths.length > 0 ? (
              <div className="space-y-3">
                {activeAuths.slice(0, 4).map((auth) => (
                  <div
                    key={auth.id}
                    className="p-3 rounded-md bg-muted/30 hover-elevate"
                    data-testid={`auth-item-${auth.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">
                        {auth.title}
                      </div>
                      <StatusBadge status={auth.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                      <span>Scope: {auth.scope}</span>
                      <span>
                        Expires: {new Date(auth.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-severity-medium mb-2" />
                <p className="text-sm text-muted-foreground">No active authorizations</p>
                <Link href="/authorizations">
                  <Button variant="link" size="sm" className="mt-2">
                    Create Authorization
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Actions
          </CardTitle>
          <Link href="/actions">
            <Button variant="ghost" size="sm" data-testid="link-view-all-actions">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {actionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentActions && recentActions.length > 0 ? (
            <div className="space-y-3">
              {recentActions.slice(0, 5).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/30"
                  data-testid={`action-item-${action.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{action.action}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {action.intent} - Target: {action.targetAsset}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RiskBadge riskLevel={action.riskLevel} />
                    {action.requiresApproval && (
                      <Badge variant={action.approved ? "secondary" : "outline"}>
                        {action.approved ? "Approved" : "Pending"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recent actions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SeverityRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 text-sm font-medium">{label}</div>
      <div className="flex-1">
        <Progress value={percentage} className={`h-2 ${color}`} />
      </div>
      <div className="w-12 text-sm text-right font-mono">{count}</div>
    </div>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: "low" | "medium" | "high" | "critical" }) {
  const config = {
    low: { label: "Low", className: "bg-severity-low/10 text-severity-low" },
    medium: { label: "Medium", className: "bg-severity-medium/10 text-severity-medium" },
    high: { label: "High", className: "bg-severity-high/10 text-severity-high" },
    critical: { label: "Critical", className: "bg-severity-critical/10 text-severity-critical" },
  };

  return (
    <Badge variant="outline" className={config[riskLevel].className}>
      {config[riskLevel].label} Risk
    </Badge>
  );
}
