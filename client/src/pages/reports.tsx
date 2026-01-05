import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/severity-badge";
import {
  FileText,
  Download,
  BarChart2,
  PieChart,
  TrendingUp,
  Shield,
  Bug,
  Server,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  FileCheck,
} from "lucide-react";
import type { DashboardMetrics, Vulnerability } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function Reports() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: vulnsData } = useQuery<{ vulnerabilities: Vulnerability[]; total: number }>({
    queryKey: ["/api/vulnerabilities", { limit: 1000 }],
  });

  const vulnerabilities = vulnsData?.vulnerabilities || [];

  const vulnsByClass = vulnerabilities.reduce((acc, v) => {
    acc[v.vulnClass] = (acc[v.vulnClass] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topVulnClasses = Object.entries(vulnsByClass)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const vulnsByAssetType = vulnerabilities.reduce((acc, v) => {
    acc[v.assetType] = (acc[v.assetType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const assetTypeBreakdown = Object.entries(vulnsByAssetType)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export security reports and analytics"
        actions={
          <>
            <Button variant="outline" size="sm" data-testid="button-export-pdf">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </>
        }
      />

      <Tabs defaultValue="executive" className="space-y-6">
        <TabsList>
          <TabsTrigger value="executive" data-testid="tab-executive">
            <BarChart2 className="h-4 w-4 mr-2" />
            Executive Summary
          </TabsTrigger>
          <TabsTrigger value="technical" data-testid="tab-technical">
            <FileText className="h-4 w-4 mr-2" />
            Technical Report
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                Executive Summary
              </CardTitle>
              <CardDescription>
                High-level overview of your security posture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Metrics */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <MetricBox
                  label="Total Vulnerabilities"
                  value={metrics?.totalVulnerabilities || 0}
                  icon={<Bug className="h-5 w-5" />}
                  isLoading={metricsLoading}
                />
                <MetricBox
                  label="Critical/High"
                  value={(metrics?.criticalVulns || 0) + (metrics?.highVulns || 0)}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  severity="critical"
                  isLoading={metricsLoading}
                />
                <MetricBox
                  label="Remediated"
                  value={metrics?.remediatedFindings || 0}
                  icon={<CheckCircle className="h-5 w-5" />}
                  severity="low"
                  isLoading={metricsLoading}
                />
                <MetricBox
                  label="Controls Coverage"
                  value={`${metrics?.controlsCoverage || 0}%`}
                  icon={<Shield className="h-5 w-5" />}
                  isLoading={metricsLoading}
                />
              </div>

              <Separator />

              {/* Severity Distribution */}
              <div>
                <h3 className="font-semibold mb-4">Severity Distribution</h3>
                <div className="grid gap-3">
                  <SeverityBar
                    label="Critical"
                    count={metrics?.criticalVulns || 0}
                    total={metrics?.totalVulnerabilities || 1}
                    color="bg-severity-critical"
                  />
                  <SeverityBar
                    label="High"
                    count={metrics?.highVulns || 0}
                    total={metrics?.totalVulnerabilities || 1}
                    color="bg-severity-high"
                  />
                  <SeverityBar
                    label="Medium"
                    count={metrics?.mediumVulns || 0}
                    total={metrics?.totalVulnerabilities || 1}
                    color="bg-severity-medium"
                  />
                  <SeverityBar
                    label="Low"
                    count={metrics?.lowVulns || 0}
                    total={metrics?.totalVulnerabilities || 1}
                    color="bg-severity-low"
                  />
                </div>
              </div>

              <Separator />

              {/* Key Findings */}
              <div>
                <h3 className="font-semibold mb-4">Key Findings</h3>
                <div className="space-y-3">
                  <FindingItem
                    severity="critical"
                    text={`${metrics?.criticalVulns || 0} critical vulnerabilities require immediate attention`}
                  />
                  <FindingItem
                    severity="high"
                    text={`${metrics?.highVulns || 0} high-severity issues identified across ${metrics?.inScopeAssets || 0} in-scope assets`}
                  />
                  <FindingItem
                    severity="info"
                    text={`${metrics?.activeAuthorizations || 0} active authorization${(metrics?.activeAuthorizations || 0) !== 1 ? 's' : ''} currently in place`}
                  />
                  <FindingItem
                    severity="low"
                    text={`${metrics?.remediatedFindings || 0} findings have been remediated`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          {/* Technical Report */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Vulnerability Classes</CardTitle>
              </CardHeader>
              <CardContent>
                {topVulnClasses.length > 0 ? (
                  <div className="space-y-3">
                    {topVulnClasses.map(([vulnClass, count], index) => (
                      <div key={vulnClass} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{vulnClass}</div>
                          <Progress
                            value={(count / vulnerabilities.length) * 100}
                            className="h-1.5 mt-1"
                          />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No vulnerability data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vulnerabilities by Asset Type</CardTitle>
              </CardHeader>
              <CardContent>
                {assetTypeBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {assetTypeBreakdown.map(([assetType, count]) => (
                      <div key={assetType} className="flex items-center gap-3">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium capitalize">
                            {assetType.replace(/_/g, " ")}
                          </div>
                          <Progress
                            value={(count / vulnerabilities.length) * 100}
                            className="h-1.5 mt-1"
                          />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No asset data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">CWE Distribution</CardTitle>
              <CardDescription>
                Top Common Weakness Enumeration identifiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vulnerabilities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    vulnerabilities.reduce((acc, v) => {
                      acc[v.cwe] = (acc[v.cwe] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 20)
                    .map(([cwe, count]) => (
                      <Badge
                        key={cwe}
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        {cwe} ({count})
                      </Badge>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No CWE data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Status */}
          <div className="grid gap-6 md:grid-cols-3">
            <ComplianceCard
              framework="NIST CSF"
              coverage={78}
              implemented={156}
              total={200}
              icon="N"
            />
            <ComplianceCard
              framework="ISO 27001"
              coverage={82}
              implemented={93}
              total={114}
              icon="I"
            />
            <ComplianceCard
              framework="CIS Controls"
              coverage={71}
              implemented={127}
              total={178}
              icon="C"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Compliance Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RecommendationItem
                  priority="high"
                  title="Implement MFA across all privileged accounts"
                  framework="NIST AC-7, ISO A.9.4.2"
                  impact="Reduces unauthorized access risk by 99%"
                />
                <RecommendationItem
                  priority="high"
                  title="Enable encryption at rest for all databases"
                  framework="NIST SC-28, CIS Control 3.11"
                  impact="Protects sensitive data from unauthorized access"
                />
                <RecommendationItem
                  priority="medium"
                  title="Implement automated vulnerability scanning"
                  framework="NIST RA-5, CIS Control 7"
                  impact="Enables continuous security monitoring"
                />
                <RecommendationItem
                  priority="medium"
                  title="Establish incident response procedures"
                  framework="NIST IR-4, ISO A.16.1"
                  impact="Reduces incident response time by 50%"
                />
                <RecommendationItem
                  priority="low"
                  title="Document security awareness training program"
                  framework="NIST AT-2, ISO A.7.2.2"
                  impact="Improves security culture organization-wide"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricBox({
  label,
  value,
  icon,
  severity,
  isLoading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  severity?: "critical" | "high" | "medium" | "low";
  isLoading?: boolean;
}) {
  const colorClass = severity
    ? {
        critical: "text-severity-critical",
        high: "text-severity-high",
        medium: "text-severity-medium",
        low: "text-severity-low",
      }[severity]
    : "text-foreground";

  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      )}
    </div>
  );
}

function SeverityBar({
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
      <div className="w-20 text-sm font-medium">{label}</div>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="w-20 text-sm text-right">
        <span className="font-medium">{count}</span>
        <span className="text-muted-foreground"> ({percentage.toFixed(1)}%)</span>
      </div>
    </div>
  );
}

function FindingItem({
  severity,
  text,
}: {
  severity: "critical" | "high" | "medium" | "low" | "info";
  text: string;
}) {
  const iconColor = {
    critical: "text-severity-critical",
    high: "text-severity-high",
    medium: "text-severity-medium",
    low: "text-severity-low",
    info: "text-severity-info",
  }[severity];

  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
      <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function ComplianceCard({
  framework,
  coverage,
  implemented,
  total,
  icon,
}: {
  framework: string;
  coverage: number;
  implemented: number;
  total: number;
  icon: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center font-bold text-primary">
            {icon}
          </div>
          <div>
            <div className="font-semibold">{framework}</div>
            <div className="text-xs text-muted-foreground">
              {implemented} / {total} controls
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Coverage</span>
            <span className="font-medium">{coverage}%</span>
          </div>
          <Progress value={coverage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationItem({
  priority,
  title,
  framework,
  impact,
}: {
  priority: "high" | "medium" | "low";
  title: string;
  framework: string;
  impact: string;
}) {
  const priorityConfig = {
    high: { label: "High", className: "bg-severity-critical/10 text-severity-critical" },
    medium: { label: "Medium", className: "bg-severity-medium/10 text-severity-medium" },
    low: { label: "Low", className: "bg-severity-low/10 text-severity-low" },
  };

  return (
    <div className="p-4 rounded-md border">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium">{title}</div>
        <Badge variant="outline" className={priorityConfig[priority].className}>
          {priorityConfig[priority].label} Priority
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3" />
          <span>{framework}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3" />
          <span>{impact}</span>
        </div>
      </div>
    </div>
  );
}
