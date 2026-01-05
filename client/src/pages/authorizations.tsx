import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { StatusBadge } from "@/components/status-badge";
import {
  Plus,
  FileCheck,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import type { Authorization } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format, differenceInDays } from "date-fns";

export default function Authorizations() {
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const queryParams = statusFilter !== "all" ? `?status=${statusFilter}` : "";
  
  const { data: authorizations, isLoading } = useQuery<Authorization[]>({
    queryKey: [`/api/authorizations${queryParams}`],
  });

  const createMutation = useMutation({
    mutationFn: async (auth: Partial<Authorization>) => {
      return apiRequest("POST", "/api/authorizations", auth);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setCreateOpen(false);
      form.reset();
      toast({
        title: "Authorization created",
        description: "The authorization has been added successfully.",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      title: "",
      scope: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      authorizedBy: "",
      restrictions: "",
      documentUrl: "",
    },
  });

  const onSubmit = () => {
    const data = form.getValues();
    createMutation.mutate({
      ...data,
      restrictions: data.restrictions.split("\n").filter(Boolean),
      targetAssets: [],
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    return days;
  };

  const columns = [
    {
      key: "title",
      header: "Authorization",
      render: (item: Authorization) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{item.title}</div>
            <div className="text-xs text-muted-foreground">
              {item.targetAssets.length} target assets
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      className: "max-w-xs",
      render: (item: Authorization) => (
        <div className="truncate text-sm">{item.scope}</div>
      ),
    },
    {
      key: "authorizedBy",
      header: "Authorized By",
      render: (item: Authorization) => (
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          {item.authorizedBy}
        </div>
      ),
    },
    {
      key: "dates",
      header: "Duration",
      render: (item: Authorization) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(item.startDate), "MMM d")} - {format(new Date(item.endDate), "MMM d, yyyy")}
          </div>
          {item.status === "active" && (
            <div className="text-xs mt-0.5">
              {getDaysRemaining(item.endDate) > 0 ? (
                <span className={getDaysRemaining(item.endDate) <= 7 ? "text-severity-medium" : "text-muted-foreground"}>
                  {getDaysRemaining(item.endDate)} days remaining
                </span>
              ) : (
                <span className="text-severity-critical">Expired</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: Authorization) => <StatusBadge status={item.status} />,
    },
    {
      key: "restrictions",
      header: "Restrictions",
      render: (item: Authorization) => (
        <div className="flex items-center gap-1">
          {item.restrictions.length > 0 ? (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {item.restrictions.length} restriction{item.restrictions.length > 1 ? "s" : ""}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      ),
    },
    {
      key: "document",
      header: "Document",
      render: (item: Authorization) =>
        item.documentUrl ? (
          <Button variant="ghost" size="sm" asChild>
            <a href={item.documentUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-1" />
              View
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const filteredData = authorizations?.filter((auth) => {
    if (statusFilter === "all") return true;
    return auth.status === statusFilter;
  }) || [];

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Authorizations"
        description="Manage testing authorizations and scope boundaries"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-auth">
                <Plus className="h-4 w-4 mr-2" />
                New Authorization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Authorization</DialogTitle>
                <DialogDescription>
                  Define a new testing authorization with scope and restrictions
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Q1 2024 Penetration Test" {...field} data-testid="input-auth-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scope Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the scope of this authorization..."
                            rows={3}
                            {...field}
                            data-testid="input-auth-scope"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="authorizedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authorized By</FormLabel>
                        <FormControl>
                          <Input placeholder="Name of authorizer" {...field} data-testid="input-authorized-by" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="restrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restrictions (one per line)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., No production database access&#10;No denial of service testing"
                            rows={3}
                            {...field}
                            data-testid="input-restrictions"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document URL (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} data-testid="input-document-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-auth">
                      {createMutation.isPending ? "Creating..." : "Create Authorization"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-severity-low/10">
              <CheckCircle className="h-5 w-5 text-severity-low" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-active">
                {authorizations?.filter((a) => a.status === "active").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-severity-medium/10">
              <Clock className="h-5 w-5 text-severity-medium" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-pending">
                {authorizations?.filter((a) => a.status === "pending").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-expired">
                {authorizations?.filter((a) => a.status === "expired").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Expired</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-severity-critical/10">
              <AlertTriangle className="h-5 w-5 text-severity-critical" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-expiring-soon">
                {authorizations?.filter((a) => 
                  a.status === "active" && getDaysRemaining(a.endDate) <= 7 && getDaysRemaining(a.endDate) > 0
                ).length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Expiring Soon</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm">Filter by Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-auth-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No authorizations found. Create your first authorization to get started."
      />
    </div>
  );
}
