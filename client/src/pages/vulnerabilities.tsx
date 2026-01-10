import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Search,
  Upload,
  Bug,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  FileText,
} from "lucide-react";
import type { Vulnerability, JiraConfig } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Vulnerabilities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: jiraConfig } = useQuery<JiraConfig>({
    queryKey: ["/api/jira/config"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Vulnerability> }) => {
      return apiRequest("PATCH", `/api/vulnerabilities/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/vulnerabilities")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/dashboard")
      });
      toast({
        title: "Updated",
        description: "Vulnerability updated successfully.",
      });
    },
  });

  const createJiraMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/vulnerabilities/${id}/jira`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/vulnerabilities")
      });
      if (selectedVuln) {
        setSelectedVuln({ ...selectedVuln, jiraKey: data.jiraKey, jiraUrl: data.jiraUrl });
      }
      toast({
        title: "Jira ticket created",
        description: `Created ${data.jiraKey}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create Jira ticket",
        description: error.message || "Please check your Jira configuration in Settings.",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: Record<string, string>[]) => {
      return apiRequest("POST", "/api/vulnerabilities/import", { data });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/vulnerabilities")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/dashboard")
      });
      setImportOpen(false);
      toast({
        title: "Import successful",
        description: `Imported ${result.imported} vulnerabilities.`,
      });
    },
    onError: () => {
      toast({
        title: "Import failed",
        description: "Please check your CSV file format.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
        
        const data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(",").map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || "";
          });
          return row;
        });

        importMutation.mutate(data);
      } catch {
        toast({
          title: "Parse error",
          description: "Failed to parse CSV file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const columns = [
    {
      key: "select",
      header: "",
      className: "w-10",
      render: (item: Vulnerability) => (
        <Checkbox
          checked={selectedIds.has(item.id)}
          onCheckedChange={() => toggleSelection(item.id)}
          data-testid={`checkbox-vuln-${item.id}`}
        />
      ),
    },
    {
      key: "riskScore",
      header: "Risk",
      className: "w-16",
      render: (item: Vulnerability) => (
        <div className={`text-center font-bold text-sm px-2 py-1 rounded ${
          item.riskScore >= 70 ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
          item.riskScore >= 40 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}>
          {item.riskScore}
        </div>
      ),
    },
    {
      key: "title",
      header: "Vulnerability",
      render: (item: Vulnerability) => (
        <div>
          <div className="font-medium">{item.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {item.cve && <span className="font-mono">{item.cve}</span>}
            {item.assetName && <span>{item.assetName}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (item: Vulnerability) => <SeverityBadge severity={item.severity} />,
    },
    {
      key: "status",
      header: "Status",
      render: (item: Vulnerability) => <StatusBadge status={item.status} />,
    },
    {
      key: "assignee",
      header: "Assignee",
      className: "text-sm",
      render: (item: Vulnerability) => item.assignee || "—",
    },
    {
      key: "jiraKey",
      header: "Jira",
      render: (item: Vulnerability) => item.jiraKey ? (
        <a
          href={item.jiraUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline text-sm font-mono"
          onClick={(e) => e.stopPropagation()}
        >
          {item.jiraKey}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    },
    {
      key: "exploitAvailable",
      header: "Exploit",
      render: (item: Vulnerability) => item.exploitAvailable ? (
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
        description="Import, prioritize, and track vulnerability remediation"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} data-testid="button-import-vulns">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </>
        }
      />

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
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={data?.vulnerabilities || []}
        columns={columns}
        keyField="id"
        onRowClick={setSelectedVuln}
        isLoading={isLoading}
        emptyMessage="No vulnerabilities found. Import a scan to get started."
        pagination={{
          page,
          pageSize,
          total: data?.total || 0,
          onPageChange: setPage,
        }}
      />

      <Sheet open={!!selectedVuln} onOpenChange={() => setSelectedVuln(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedVuln && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  {selectedVuln.title}
                </SheetTitle>
                <SheetDescription className="font-mono">
                  {selectedVuln.cve || selectedVuln.id.slice(0, 8)}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="remediation" className="flex-1">Remediation</TabsTrigger>
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
                      <Label className="text-xs text-muted-foreground">Risk Score</Label>
                      <div className="mt-1 text-2xl font-bold">{selectedVuln.riskScore}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <StatusBadge status={selectedVuln.status} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CVSS Score</Label>
                      <div className="mt-1 text-sm">{selectedVuln.cvssScore || "N/A"}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CVE</Label>
                      <div className="mt-1 font-mono text-sm">{selectedVuln.cve || "N/A"}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CWE</Label>
                      <div className="mt-1 font-mono text-sm">{selectedVuln.cwe || "N/A"}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Source</Label>
                      <div className="mt-1 text-sm capitalize">{selectedVuln.source}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Exploit Available</Label>
                      <div className="mt-1">
                        {selectedVuln.exploitAvailable ? (
                          <div className="flex items-center gap-1 text-red-600">
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
                  </div>

                  {selectedVuln.description && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="mt-1 text-sm">{selectedVuln.description}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Affected Asset</Label>
                    <p className="mt-1 text-sm">{selectedVuln.assetName || "Unknown"}</p>
                  </div>
                </TabsContent>

                <TabsContent value="remediation" className="space-y-6 mt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Update Status</Label>
                    <Select
                      value={selectedVuln.status}
                      onValueChange={(status) => {
                        updateMutation.mutate({ id: selectedVuln.id, updates: { status } });
                        setSelectedVuln({ ...selectedVuln, status });
                      }}
                    >
                      <SelectTrigger className="w-full mt-2" data-testid="select-update-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="false_positive">False Positive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Assignee</Label>
                    <Input
                      className="mt-2"
                      placeholder="Enter assignee name"
                      value={selectedVuln.assignee || ""}
                      onChange={(e) => setSelectedVuln({ ...selectedVuln, assignee: e.target.value })}
                      onBlur={() => {
                        if (selectedVuln.assignee !== undefined) {
                          updateMutation.mutate({ id: selectedVuln.id, updates: { assignee: selectedVuln.assignee } });
                        }
                      }}
                      data-testid="input-assignee"
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Jira Integration</Label>
                    {selectedVuln.jiraKey ? (
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-between">
                          <a
                            href={selectedVuln.jiraUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline font-mono"
                          >
                            {selectedVuln.jiraKey}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          {selectedVuln.jiraStatus && (
                            <Badge variant="outline">{selectedVuln.jiraStatus}</Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Button
                        className="mt-2 w-full"
                        variant="outline"
                        disabled={!jiraConfig?.isConfigured || createJiraMutation.isPending}
                        onClick={() => createJiraMutation.mutate(selectedVuln.id)}
                        data-testid="button-create-jira"
                      >
                        {createJiraMutation.isPending ? "Creating..." : "Create Jira Ticket"}
                      </Button>
                    )}
                    {!jiraConfig?.isConfigured && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Configure Jira in Settings to create tickets
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Remediation Notes</Label>
                    <Textarea
                      className="mt-2 min-h-24"
                      placeholder="Add notes about remediation steps..."
                      value={selectedVuln.remediationNotes || ""}
                      onChange={(e) => setSelectedVuln({ ...selectedVuln, remediationNotes: e.target.value })}
                      onBlur={() => {
                        updateMutation.mutate({ id: selectedVuln.id, updates: { remediationNotes: selectedVuln.remediationNotes } });
                      }}
                      data-testid="textarea-remediation-notes"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Vulnerabilities</DialogTitle>
            <DialogDescription>
              Upload a CSV file with vulnerability data. Supported columns: title, description, cve, cwe, severity, cvss_score, asset_name, source, exploit_available
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              data-testid="input-file-upload"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
