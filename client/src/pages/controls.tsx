import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { SecurityControl } from "@shared/schema";

export default function Controls() {
  const [searchQuery, setSearchQuery] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: controls, isLoading } = useQuery<SecurityControl[]>({
    queryKey: ["/api/controls", { framework: frameworkFilter, status: statusFilter }],
  });

  const filteredControls = controls?.filter((control) => {
    if (searchQuery && !control.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !control.controlId.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  const groupedControls = filteredControls.reduce((acc, control) => {
    if (!acc[control.category]) {
      acc[control.category] = [];
    }
    acc[control.category].push(control);
    return acc;
  }, {} as Record<string, SecurityControl[]>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "implemented":
        return <CheckCircle className="h-4 w-4 text-severity-low" />;
      case "partial":
        return <AlertTriangle className="h-4 w-4 text-severity-medium" />;
      case "planned":
        return <Clock className="h-4 w-4 text-severity-info" />;
      case "not_applicable":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      implemented: { label: "Implemented", className: "bg-severity-low/10 text-severity-low" },
      partial: { label: "Partial", className: "bg-severity-medium/10 text-severity-medium" },
      planned: { label: "Planned", className: "bg-severity-info/10 text-severity-info" },
      not_applicable: { label: "N/A", className: "bg-muted text-muted-foreground" },
    };
    const c = config[status as keyof typeof config] || config.not_applicable;
    return (
      <Badge variant="outline" className={c.className}>
        {c.label}
      </Badge>
    );
  };

  const stats = {
    total: controls?.length || 0,
    implemented: controls?.filter((c) => c.status === "implemented").length || 0,
    partial: controls?.filter((c) => c.status === "partial").length || 0,
    planned: controls?.filter((c) => c.status === "planned").length || 0,
  };

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Security Controls"
        description="Manage and track compliance with security frameworks"
      />

      {/* Stats */}
      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-total-controls">
                {stats.total}
              </div>
              <div className="text-xs text-muted-foreground">Total Controls</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-severity-low/10">
              <CheckCircle className="h-5 w-5 text-severity-low" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-implemented">
                {stats.implemented}
              </div>
              <div className="text-xs text-muted-foreground">Implemented</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-severity-medium/10">
              <AlertTriangle className="h-5 w-5 text-severity-medium" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-partial">
                {stats.partial}
              </div>
              <div className="text-xs text-muted-foreground">Partial</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-severity-info/10">
              <Clock className="h-5 w-5 text-severity-info" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="count-planned">
                {stats.planned}
              </div>
              <div className="text-xs text-muted-foreground">Planned</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-controls"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
                <SelectTrigger className="w-32" data-testid="select-framework-filter">
                  <SelectValue placeholder="Framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frameworks</SelectItem>
                  <SelectItem value="NIST">NIST</SelectItem>
                  <SelectItem value="ISO27001">ISO 27001</SelectItem>
                  <SelectItem value="CIS">CIS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-control-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="not_applicable">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(groupedControls).length > 0 ? (
        <Accordion type="multiple" className="space-y-4">
          {Object.entries(groupedControls).map(([category, categoryControls]) => (
            <AccordionItem key={category} value={category} className="border rounded-md">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{category}</span>
                  <Badge variant="secondary" className="ml-2">
                    {categoryControls.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4 space-y-3">
                  {categoryControls.map((control) => (
                    <div
                      key={control.id}
                      className="p-4 rounded-md bg-muted/30 hover-elevate"
                      data-testid={`control-item-${control.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {control.controlId}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {control.framework}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{control.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {control.description}
                          </p>
                          {control.linkedVulnerabilities.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Linked to {control.linkedVulnerabilities.length} vulnerability
                              {control.linkedVulnerabilities.length !== 1 ? "ies" : "y"}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(control.status)}
                          {getStatusBadge(control.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No controls found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
