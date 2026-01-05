import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Lock,
  Cloud,
  Database,
  Box,
  Key,
  GitBranch,
  MessageSquare,
  Shield,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Asset, AssetType, ExposureType, AuthModel } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const assetTypeIcons: Record<AssetType, React.ReactNode> = {
  web_application: <Globe className="h-4 w-4" />,
  api: <Server className="h-4 w-4" />,
  cloud_storage: <Cloud className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  kubernetes_cluster: <Box className="h-4 w-4" />,
  container: <Box className="h-4 w-4" />,
  iam_role: <Key className="h-4 w-4" />,
  ci_cd_pipeline: <GitBranch className="h-4 w-4" />,
  message_queue: <MessageSquare className="h-4 w-4" />,
};

export default function Assets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(searchQuery && { search: searchQuery }),
    ...(typeFilter !== "all" && { type: typeFilter }),
    ...(scopeFilter !== "all" && { scope: scopeFilter }),
  });

  const { data, isLoading } = useQuery<{ assets: Asset[]; total: number }>({
    queryKey: [`/api/assets?${queryParams.toString()}`],
  });

  const createMutation = useMutation({
    mutationFn: async (asset: Partial<Asset>) => {
      return apiRequest("POST", "/api/assets", asset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setCreateOpen(false);
      toast({
        title: "Asset created",
        description: "The asset has been added successfully.",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      type: "web_application" as AssetType,
      exposure: "internal" as ExposureType,
      authModel: "none" as AuthModel,
      provider: "",
      region: "",
      techStack: "",
      inScope: true,
      authorized: false,
    },
  });

  const onSubmit = (values: typeof form.getValues) => {
    const data = form.getValues();
    createMutation.mutate({
      ...data,
      techStack: data.techStack.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  const columns = [
    {
      key: "name",
      header: "Asset Name",
      render: (item: Asset) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted">
            {assetTypeIcons[item.type]}
          </div>
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {item.type.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "exposure",
      header: "Exposure",
      render: (item: Asset) => (
        <Badge variant="outline" className="capitalize">
          {item.exposure === "internet_facing" && <Globe className="h-3 w-3 mr-1" />}
          {item.exposure === "internal" && <Lock className="h-3 w-3 mr-1" />}
          {item.exposure.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "authModel",
      header: "Auth Model",
      className: "text-sm capitalize",
      render: (item: Asset) => item.authModel.replace(/_/g, " "),
    },
    {
      key: "provider",
      header: "Provider",
      className: "text-sm",
      render: (item: Asset) => item.provider || "—",
    },
    {
      key: "region",
      header: "Region",
      className: "text-sm font-mono",
      render: (item: Asset) => item.region || "—",
    },
    {
      key: "techStack",
      header: "Tech Stack",
      render: (item: Asset) => (
        <div className="flex flex-wrap gap-1 max-w-48">
          {item.techStack.slice(0, 3).map((tech) => (
            <Badge key={tech} variant="secondary" className="text-xs font-mono">
              {tech}
            </Badge>
          ))}
          {item.techStack.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{item.techStack.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "inScope",
      header: "In Scope",
      render: (item: Asset) =>
        item.inScope ? (
          <div className="flex items-center gap-1 text-severity-low">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Yes</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span className="text-xs">No</span>
          </div>
        ),
    },
    {
      key: "authorized",
      header: "Authorized",
      render: (item: Asset) =>
        item.authorized ? (
          <div className="flex items-center gap-1 text-severity-low">
            <Shield className="h-4 w-4" />
            <span className="text-xs">Yes</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-severity-medium">
            <Shield className="h-4 w-4" />
            <span className="text-xs">Pending</span>
          </div>
        ),
    },
  ];

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Assets"
        description="Manage your security assets and scope boundaries"
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
                  Add a new asset to your security inventory
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
                          <Input placeholder="e.g., Production API" {...field} data-testid="input-asset-name" />
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
                              <SelectItem value="web_application">Web Application</SelectItem>
                              <SelectItem value="api">API</SelectItem>
                              <SelectItem value="cloud_storage">Cloud Storage</SelectItem>
                              <SelectItem value="database">Database</SelectItem>
                              <SelectItem value="kubernetes_cluster">Kubernetes Cluster</SelectItem>
                              <SelectItem value="container">Container</SelectItem>
                              <SelectItem value="iam_role">IAM Role</SelectItem>
                              <SelectItem value="ci_cd_pipeline">CI/CD Pipeline</SelectItem>
                              <SelectItem value="message_queue">Message Queue</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="exposure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exposure</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-exposure">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="internet_facing">Internet Facing</SelectItem>
                              <SelectItem value="internal">Internal</SelectItem>
                              <SelectItem value="partner_exposed">Partner Exposed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="authModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auth Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-auth-model">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="basic_auth">Basic Auth</SelectItem>
                            <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                            <SelectItem value="jwt">JWT</SelectItem>
                            <SelectItem value="session_cookie">Session Cookie</SelectItem>
                            <SelectItem value="sso_saml">SSO/SAML</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., aws_like" {...field} data-testid="input-provider" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., us-east" {...field} data-testid="input-region" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tech Stack (comma separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., nodejs, postgresql, redis" {...field} data-testid="input-tech-stack" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="inScope"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-in-scope"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">In Scope</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="authorized"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-authorized"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Authorized for Testing</FormLabel>
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

      {/* Filters */}
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
            <div className="flex gap-2 flex-wrap">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="Asset Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="web_application">Web Application</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="cloud_storage">Cloud Storage</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="kubernetes_cluster">Kubernetes</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                  <SelectItem value="iam_role">IAM Role</SelectItem>
                  <SelectItem value="ci_cd_pipeline">CI/CD Pipeline</SelectItem>
                  <SelectItem value="message_queue">Message Queue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-32" data-testid="select-scope-filter">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in_scope">In Scope</SelectItem>
                  <SelectItem value="out_of_scope">Out of Scope</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
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
