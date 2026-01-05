import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Search,
  Filter,
  Download,
  Upload,
  Bug,
  ExternalLink,
  Shield,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Vulnerability, Severity } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Vulnerabilities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(searchQuery && { search: searchQuery }),
    ...(severityFilter !== "all" && { severity: severityFilter }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  });
  
  const { data, isLoading } = useQuery<{ vulnerabilities: Vulnerability[]; total: number }>({
    queryKey: [`/api/vulnerabilities?${queryParams.toString()}`],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/vulnerabilities/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/vulnerabilities")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/dashboard")
      });
      toast({
        title: "Status updated",
        description: "Vulnerability status has been updated successfully.",
      });
    },
  });

  const columns = [
    {
      key: "id",
      header: "ID",
      className: "font-mono text-xs w-28",
      render: (item: Vulnerability) => (
        <span className="text-muted-foreground">{item.id.slice(0, 10)}</span>
      ),
    },
    {
      key: "vulnClass",
      header: "Vulnerability",
      render: (item: Vulnerability) => (
        <div>
          <div className="font-medium">{item.vulnClass}</div>
          <div className="text-xs text-muted-foreground font-mono">{item.cwe}</div>
        </div>
      ),
    },
    {
      key: "assetType",
      header: "Asset Type",
      className: "text-sm",
      render: (item: Vulnerability) => (
        <span className="capitalize">{item.assetType.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (item: Vulnerability) => <SeverityBadge severity={item.severity} />,
    },
    {
      key: "confidence",
      header: "Confidence",
      render: (item: Vulnerability) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${item.confidence}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(item.confidence)}%
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: Vulnerability) => <StatusBadge status={item.status} />,
    },
    {
      key: "exploitable",
      header: "Exploitable",
      render: (item: Vulnerability) =>
        item.exploitable ? (
          <Badge variant="destructive" className="text-xs">Yes</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">No</Badge>
        ),
    },
  ];

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Vulnerabilities"
        description="Manage and track security vulnerabilities across your assets"
        actions={
          <>
            <Button variant="outline" size="sm" data-testid="button-import-vulns">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export-vulns">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vulnerabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-vulns"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32" data-testid="select-severity-filter">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="remediated">Remediated</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        data={data?.vulnerabilities || []}
        columns={columns}
        keyField="id"
        onRowClick={setSelectedVuln}
        isLoading={isLoading}
        emptyMessage="No vulnerabilities found matching your criteria"
        pagination={{
          page,
          pageSize,
          total: data?.total || 0,
          onPageChange: setPage,
        }}
      />

      {/* Vulnerability Detail Sheet */}
      <Sheet open={!!selectedVuln} onOpenChange={() => setSelectedVuln(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedVuln && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  {selectedVuln.vulnClass}
                </SheetTitle>
                <SheetDescription className="font-mono">
                  {selectedVuln.id}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="remediation" className="flex-1">Remediation</TabsTrigger>
                  <TabsTrigger value="context" className="flex-1">Context</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Severity</Label>
                      <div className="mt-1">
                        <SeverityBadge severity={selectedVuln.severity} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <StatusBadge status={selectedVuln.status} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CWE</Label>
                      <div className="mt-1 font-mono text-sm">{selectedVuln.cwe}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Confidence</Label>
                      <div className="mt-1 text-sm">{Math.round(selectedVuln.confidence)}%</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Signal Source</Label>
                      <div className="mt-1 text-sm capitalize">
                        {selectedVuln.signalSource.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Attack Phase</Label>
                      <div className="mt-1 text-sm capitalize">
                        {selectedVuln.attackPhase.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Symptoms</Label>
                    <p className="mt-1 text-sm">{selectedVuln.symptoms}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Exploitable</Label>
                      <div className="mt-1">
                        {selectedVuln.exploitable ? (
                          <div className="flex items-center gap-1 text-severity-critical">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">No</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Rate Limited</Label>
                      <div className="mt-1">
                        {selectedVuln.rateLimited ? (
                          <div className="flex items-center gap-1 text-severity-low">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm">Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">No</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Update Status</Label>
                    <Select
                      value={selectedVuln.status}
                      onValueChange={(status) => {
                        updateStatusMutation.mutate({ id: selectedVuln.id, status });
                        setSelectedVuln({ ...selectedVuln, status: status as Vulnerability["status"] });
                      }}
                    >
                      <SelectTrigger className="w-full mt-2" data-testid="select-update-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="remediated">Remediated</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="false_positive">False Positive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="remediation" className="space-y-6 mt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Recommended Actions</Label>
                    <div className="mt-2 space-y-2">
                      {selectedVuln.recommendedActions.map((action, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-3 rounded-md bg-muted/50"
                        >
                          <CheckCircle className="h-4 w-4 text-severity-low mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Data Exposure</Label>
                    <p className="mt-1 text-sm capitalize">
                      {selectedVuln.dataExposure.replace(/_/g, " ") || "None"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Privilege Gain</Label>
                    <p className="mt-1 text-sm capitalize">
                      {selectedVuln.privilegeGain.replace(/_/g, " ") || "None"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Blast Radius</Label>
                    <p className="mt-1 text-sm capitalize">
                      {selectedVuln.blastRadius.replace(/_/g, " ")}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="context" className="space-y-6 mt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Asset Type</Label>
                    <p className="mt-1 text-sm capitalize">
                      {selectedVuln.assetType.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Exposure</Label>
                    <p className="mt-1 text-sm capitalize">
                      {selectedVuln.exposure.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Auth Model</Label>
                    <p className="mt-1 text-sm capitalize">
                      {selectedVuln.authModel.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <p className="mt-1 text-sm">{selectedVuln.provider || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Region</Label>
                    <p className="mt-1 text-sm">{selectedVuln.region || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Tech Stack</Label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedVuln.techStack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="font-mono text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
