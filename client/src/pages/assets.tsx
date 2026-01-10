import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import {
  Search,
  Plus,
  Server,
  Globe,
  Database,
  Network,
  Cloud,
  Monitor,
  Box,
  HelpCircle,
} from "lucide-react";
import type { Asset, AssetType, AssetCriticality } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const assetTypeIcons: Record<string, React.ReactNode> = {
  server: <Server className="h-4 w-4" />,
  application: <Globe className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
  endpoint: <Monitor className="h-4 w-4" />,
  container: <Box className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
};

const criticalityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function Assets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(searchQuery && { search: searchQuery }),
    ...(typeFilter !== "all" && { type: typeFilter }),
  });

  const { data, isLoading } = useQuery<{ assets: Asset[]; total: number }>({
    queryKey: [`/api/assets?${queryParams.toString()}`],
  });

  const createMutation = useMutation({
    mutationFn: async (asset: Partial<Asset>) => {
      return apiRequest("POST", "/api/assets", asset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/assets")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/dashboard")
      });
      setCreateOpen(false);
      form.reset();
      toast({
        title: "Asset created",
        description: "The asset has been added successfully.",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      type: "server" as AssetType,
      criticality: "medium" as AssetCriticality,
      environment: "production",
      owner: "",
      ipAddress: "",
      hostname: "",
    },
  });

  const onSubmit = () => {
    const data = form.getValues();
    createMutation.mutate(data);
  };

  const columns = [
    {
      key: "name",
      header: "Asset Name",
      render: (item: Asset) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted">
            {assetTypeIcons[item.type] || assetTypeIcons.other}
          </div>
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {item.type}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "criticality",
      header: "Criticality",
      render: (item: Asset) => (
        <Badge className={`capitalize ${criticalityColors[item.criticality] || criticalityColors.medium}`}>
          {item.criticality}
        </Badge>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      render: (item: Asset) => (
        <Badge variant="outline" className="capitalize">
          {item.environment}
        </Badge>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      className: "text-sm",
      render: (item: Asset) => item.owner || "—",
    },
    {
      key: "hostname",
      header: "Hostname / IP",
      className: "text-sm font-mono",
      render: (item: Asset) => item.hostname || item.ipAddress || "—",
    },
  ];

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Assets"
        description="Manage your IT assets and their criticality"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-asset">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>
                  Add a new asset to track vulnerabilities against
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Web Server - Production" {...field} data-testid="input-asset-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-asset-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="server">Server</SelectItem>
                              <SelectItem value="application">Application</SelectItem>
                              <SelectItem value="database">Database</SelectItem>
                              <SelectItem value="network">Network</SelectItem>
                              <SelectItem value="cloud">Cloud</SelectItem>
                              <SelectItem value="endpoint">Endpoint</SelectItem>
                              <SelectItem value="container">Container</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="criticality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Criticality</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-criticality">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Environment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-environment">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                            <SelectItem value="development">Development</SelectItem>
                            <SelectItem value="testing">Testing</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., DevOps Team" {...field} data-testid="input-owner" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hostname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hostname (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., web-prod-01" {...field} data-testid="input-hostname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ipAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IP Address (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 10.0.1.100" {...field} data-testid="input-ip" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-asset">
                      {createMutation.isPending ? "Creating..." : "Create Asset"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-assets"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-type-filter">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="cloud">Cloud</SelectItem>
                <SelectItem value="endpoint">Endpoint</SelectItem>
                <SelectItem value="container">Container</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={data?.assets || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No assets found. Add your first asset to get started."
        pagination={{
          page,
          pageSize,
          total: data?.total || 0,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
